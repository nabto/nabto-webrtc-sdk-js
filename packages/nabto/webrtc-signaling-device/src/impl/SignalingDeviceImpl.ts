import { SignalingChannel, SignalingErrorCodes, SignalingError, SignalingChannelState, JSONValue, TypedEventEmitter } from "@nabto/webrtc-signaling-common";
import { SignalingDevice, SignalingDeviceOptions } from "../SignalingDevice";
import { Configuration, DeviceApi, ResponseError } from '../impl/backend'
import { WebSocketConnectionImpl, SignalingChannelImpl, SignalingServiceImpl, SignalingConnectionState } from '@nabto/webrtc-signaling-common'
import { HttpApiImpl } from "./HttpApiImpl";

const CHECK_ALIVE_TIMEOUT = 1000
// minimum time betwenn a open and close event on a websocket such that the
// websocket connection counts as have been connected.
const RECONNECT_COUNTER_RESET_TIMEOUT = 10000;

type EventMap = {
  connectionstatechange: () => void; // No payload
  connectionreconnect: () => void; // No payload
};

export class SignalingDeviceImpl extends TypedEventEmitter<EventMap> implements SignalingDevice, SignalingServiceImpl {
  httpApi: HttpApiImpl
  signalingChannels: Map<string, SignalingChannelImpl> = new Map()
  ws: WebSocketConnectionImpl

  // number of times we have reconnected without obtaining a valid connection to
  // the signaling service.
  reconnectCounterTimeoutId?: ReturnType<typeof setTimeout>;
  reconnectCounter: number = 0
  openedWebSockets: number = 0;

  onNewSignalingChannel?: (connection: SignalingChannel, authorized: boolean) => Promise<void>

  constructor(private options: SignalingDeviceOptions) {
    super();
    let endpointUrl = options.endpointUrl;
    if (!endpointUrl) {
      endpointUrl = `https://${options.productId}.webrtc.nabto.net`;
    }
    this.httpApi = new HttpApiImpl(endpointUrl, options.productId, options.deviceId)

    this.ws = new WebSocketConnectionImpl("device");
    this.initWebSocket();
  }
  connectionState_: SignalingConnectionState = SignalingConnectionState.NEW;

  get connectionState() {
    return this.connectionState_;
  }

  set connectionState(state: SignalingConnectionState) {
    if (this.connectionState_ === state) {
      // skip duplicate events.
      return;
    }
    this.connectionState_ = state;
    this.emitSync("connectionstatechange");
  }

  start(): void
  {
    if (this.connectionState !== SignalingConnectionState.NEW) {
      throw new Error("Start can only be called once");
    }
    this.doConnect();
  }

  close(): void {
    if (this.connectionState === SignalingConnectionState.CLOSED) {
      return;
    }
    this.onNewSignalingChannel = undefined;
    this.signalingChannels.forEach((conn, _id) => conn.close());
    this.signalingChannels = new Map()
    // close the channels before the connection such that we can send CHANNEL_CLOSED messages.
    this.ws.close();
    this.connectionState = SignalingConnectionState.CLOSED
    this.removeAllListeners();
  }


  closeSignalingChannel(channelId: string) {
    this.signalingChannels.delete(channelId);
  }

  sendRoutingMessage(channelId: string, message: string) {
    if (this.connectionState !== SignalingConnectionState.CONNECTED) {
      return;
    }
    this.ws.sendMessage(channelId, message);
  }

  async serviceSendError(channelId: string, error: SignalingError): Promise<void> {
    if (this.connectionState !== SignalingConnectionState.CONNECTED) {
      return;
    }
    this.ws.sendError(channelId, error);
  }

  checkAlive() {
    this.ws.checkAlive(CHECK_ALIVE_TIMEOUT);
  }

  async requestIceServers(): Promise<Array<RTCIceServer>> {
    const token = await this.options.tokenGenerator();
    return this.httpApi.requestIceServers(token);
  }

  async handleTooManyRequests(retryAfter: string | null) {
    let seconds = 300;
    if (retryAfter) {
      const n = Number(retryAfter);
      if (!Number.isNaN(n)) {
        seconds = n;
      } else {
        try {
          const d = new Date(retryAfter);
          const now = new Date()
          const diff = d.getTime() - now.getTime()
          seconds = diff/1000;
        } catch {
          // ignore that it could not be parsed and fallback to the default delay
        }
      }
    }
    console.debug(`Too many requests. Waiting ${seconds}s before making next request`);
    if (seconds < 0) {
      seconds = 300;
    }
    this.waitReconnect(seconds);
  }

  async doConnect() {
    if (this.connectionState !== SignalingConnectionState.NEW && this.connectionState !== SignalingConnectionState.WAIT_RETRY) {
      console.error("doConnect called in an invalid state", this.connectionState);
      return;
    }
    try {
      this.connectionState = SignalingConnectionState.CONNECTING
      const token = await this.options.tokenGenerator();
      const signalingUrl = await this.httpApi.deviceConnectRequest(token);
      this.ws.connect(signalingUrl);
    } catch (e) {
      if (e instanceof ResponseError) {
        if (e.response.status === 429) {
          const retryAfter = e.response.headers.get("Retry-After");
          this.handleTooManyRequests(retryAfter);
          return;
        } else {
          console.debug(`Connect failed, retries in a moment. Status code ${e.response.status}. Status text ${e.response.statusText} `)
        }
      } else {
        console.debug(`Connect failed, retries in a moment ${e}`)
      }
      this.waitReconnect();    }
  }

  initWebSocket() {
    this.ws.on("close", () => {
      if (this.connectionState === SignalingConnectionState.CONNECTED || this.connectionState === SignalingConnectionState.CONNECTING) {
        this.waitReconnect();
        this.clearReconnectCounterTimeout();
      }
    })
    this.ws.on("error", () => {
      if (this.connectionState === SignalingConnectionState.CONNECTED || this.connectionState === SignalingConnectionState.CONNECTING) {
        this.waitReconnect()
        this.clearReconnectCounterTimeout();
      }

    })
    this.ws.on("pingtimeout", () => {
      if (this.connectionState === SignalingConnectionState.CONNECTED || this.connectionState === SignalingConnectionState.CONNECTING) {
        this.ws.closeCurrentWebSocket();
      }
    })
    this.ws.on("channelerror", (channelId: string, errorCode: string, errorMessage?: string) => {
      const c = this.signalingChannels.get(channelId);
      const e = new SignalingError(errorCode, errorMessage);
      c?.handleError(e)
    })
    this.ws.on("message", (channelId: string, message: JSONValue, authorized: boolean) => {
      try {
        const connection = this.signalingChannels.get(channelId)
        if (connection) {
          connection.handleRoutingMessage(message);
        } else {
          if (!SignalingChannelImpl.isInitialMessage(message)) {
            throw new SignalingError(SignalingErrorCodes.CHANNEL_NOT_FOUND, `The device received a message with an non existing channelId: ${channelId}. The device has most likely closed the channel.`);
          } else {
            if (!this.onNewSignalingChannel) {
              throw new SignalingError(SignalingErrorCodes.INTERNAL_ERROR, "onNewSignalingChannel should be defined, dropping the channel");
            }
            const onNewSignalingChannel = this.onNewSignalingChannel;
            const c = new SignalingChannelImpl(this, channelId, async () => { await onNewSignalingChannel(c, authorized) });
            c.channelState = SignalingChannelState.CONNECTED;
            this.signalingChannels.set(channelId, c);
            c.handleRoutingMessage(message)
          }
        }
      } catch (e) {
        if (e instanceof SignalingError) {
          this.serviceSendError(channelId, e);
        } else {
          console.log("onMessage encountered an unhandled error", e);
        }
      }
    })
    this.ws.on("open", () => {
      this.connectionState = SignalingConnectionState.CONNECTED;
      this.setReconnectCounterTimeout();
      this.openedWebSockets++;
      const reconnected = this.openedWebSockets > 1
      if (reconnected) {
        this.emit("connectionreconnect");
      }
      this.signalingChannels.forEach((c) => {
        c.handleWebSocketConnect();
      })
    })
    this.ws.on("peerconnected", (channelId: string) => {
      const c = this.signalingChannels.get(channelId);
      c?.handlePeerConnected();
    })
    this.ws.on("peeroffline", (channelId: string) => {
      const c = this.signalingChannels.get(channelId)
      c?.handlePeerOffline();
    })
  }


  private setReconnectCounterTimeout() {
    this.clearReconnectCounterTimeout();
    this.reconnectCounterTimeoutId = setTimeout(() => { this.reconnectCounter = 0; }, RECONNECT_COUNTER_RESET_TIMEOUT);
  }

  private clearReconnectCounterTimeout() {
    if (this.reconnectCounterTimeoutId) {
      clearTimeout(this.reconnectCounterTimeoutId);
      this.reconnectCounterTimeoutId = undefined;
    }
  }

  waitReconnect(waitSeconds?: number) {
    if (this.connectionState !== SignalingConnectionState.CONNECTED && this.connectionState !== SignalingConnectionState.CONNECTING) {
      return;
    }
    this.connectionState = SignalingConnectionState.WAIT_RETRY

    let reconnectWaitSeconds = 60
    if (waitSeconds) {
      reconnectWaitSeconds = waitSeconds;
    } else {
      if (this.reconnectCounter < 6) {
        reconnectWaitSeconds = (2 ** this.reconnectCounter)
      }
    }

    const jitterWaitMilliseconds = Math.random() * reconnectWaitSeconds * 1000;

    console.debug(`Waiting ${jitterWaitMilliseconds}ms before reconnecting. Reconnect counter: ${this.reconnectCounter}`);
    this.reconnectCounter++;

    setTimeout(() => {
      this.doConnect()
    }, jitterWaitMilliseconds)
  }
}
