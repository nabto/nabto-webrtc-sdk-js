import { SignalingClient, SignalingClientOptions } from '../SignalingClient'
import { SignalingError, SignalingChannel, SignalingChannelState, SignalingConnectionState, SignalingChannelEventHandlers, WebSocketConnectionImpl, SignalingServiceImpl, SignalingConnectionStateChangesEventHandlers, HttpError, SignalingChannelImpl, WebSocketCloseReason, JSONValue } from '@nabto/webrtc-signaling-common';
import { ClientsApi } from './backend/apis/ClientsApi';
import { instanceOfHttpError } from './backend';
import { Configuration, ResponseError } from './backend/runtime';
import { IceServersImpl } from './IceServersImpl'
import { TypedEventEmitter } from '@nabto/webrtc-signaling-common'


const CHECK_ALIVE_TIMEOUT = 1000;

export interface SignalingClientEventHandlers extends SignalingChannelEventHandlers, SignalingConnectionStateChangesEventHandlers  {
  connectionreconnect: () => void
  error: (error: Error) => void
}

export class SignalingClientImpl extends TypedEventEmitter<SignalingClientEventHandlers> implements SignalingClient, SignalingServiceImpl, SignalingChannel {

  iceApi: IceServersImpl
  clientsApi: ClientsApi

  channelId: string | undefined = undefined
  ws: WebSocketConnectionImpl

  reconnectCounter: number = 0

  openedWebSockets: number = 0

  accessToken?: string
  signalingUrl: string = ""

  constructor(private options: SignalingClientOptions) {
    super();
    let endpointUrl = options.endpointUrl;
    if (!endpointUrl) {
      endpointUrl = `https://${options.productId}.webrtc.nabto.net`;
    }
    this.iceApi = new IceServersImpl(endpointUrl, options.productId, options.deviceId)
    this.clientsApi = new ClientsApi(new Configuration({ basePath: endpointUrl }))

    this.signalingChannel = new SignalingChannelImpl(this, "not_connected")

    this.on("connectionstatechange", () => {
      if (this.connectionState === SignalingConnectionState.CONNECTED) {
        this.reconnectCounter = 0;
      }
    })
    this.signalingChannel.on("channelstatechange", () => {
      this.emit("channelstatechange");
    })
    this.signalingChannel.on("error", (error: Error) => {
      this.emit("error", error);
    })
    this.signalingChannel.on("message", async (message: JSONValue) => {
      const consumers = await this.emit("message", message);
      if (consumers === 0) {
        console.error(`Got a signaling message but there was no consumers registered for the message, so the message is lost. Message: ${JSON.stringify(message)}`)
      }
    })

    this.ws = new WebSocketConnectionImpl("client");
    this.setupWs(this.ws);
  }
  sendRoutingMessage(channelId: string, message: string): void {
    this.ws.sendMessage(channelId, message);
  }
  closeSignalingChannel(_channelId: string) {
    this.close();
  }
  signalingChannel: SignalingChannelImpl;
  connectionState_: SignalingConnectionState = SignalingConnectionState.NEW

  get connectionState(): SignalingConnectionState {
    return this.connectionState_;
  }

  set connectionState(state: SignalingConnectionState) {
    this.connectionState_ = state;
    this.emitSync("connectionstatechange");
  }

  connect(): void {
    if (this.connectionState !== SignalingConnectionState.NEW) {
      throw new Error("Connect can only be called once.")
    }
    this.firstConnect()
  }

  async getIceServers(): Promise<Array<RTCIceServer>> {
    return this.iceApi.getIceServers(this.options.accessToken);
  }

  async serviceSendError(channelId: string, errorCode: string, errorMessage?: string): Promise<void> {
    this.ws.sendError(channelId, errorCode, errorMessage);
  }
  checkAlive(): void {
    this.ws.checkAlive(CHECK_ALIVE_TIMEOUT)
  }

  close(): void {
    if (this.connectionState === SignalingConnectionState.CLOSED) {
      return;
    }
    this.connectionState = SignalingConnectionState.CLOSED;
    this.signalingChannel.close();
    this.ws.close();

    this.removeAllListeners();
  }

  /**
   * WebSocket connection management
   */
  async httpConnectRequest(): Promise<string> {
    const authorization: string | undefined = this.accessToken ? `Bearer ${this.accessToken}` : undefined
    try {
      const response = await this.clientsApi.postV1ClientConnect({
        authorization: authorization,
        postV1ClientConnectRequest: {
          productId: this.options.productId,
          deviceId: this.options.deviceId
        }
      })
      this.channelId = response.channelId;

      this.signalingChannel.channelId = this.channelId;
      if (response.deviceOnline !== undefined) {
        this.signalingChannel.channelState = response.deviceOnline ? SignalingChannelState.ONLINE : SignalingChannelState.OFFLINE;
      }
      if (this.options.requireOnline === true) {
        if (this.signalingChannel.channelState !== SignalingChannelState.ONLINE) {
          throw new Error("The requested device is not online, try again later.");
        }
      }
      return response.signalingUrl;
    } catch (e) {
      if (e instanceof ResponseError) {
        let message = e.message;
        try {
          const response = await e.response.json()
          if (instanceOfHttpError(response)) {
            message = response.message;
          }
        } catch
        /* eslint-disable no-empty */ { }
        throw new HttpError(e.response.status, message);
      }
      // fallback to throw the original error.
      throw e;
    }
  }

  async firstConnect(): Promise<void> {
    try {
      this.connectionState = SignalingConnectionState.CONNECTING
      this.signalingUrl = await this.httpConnectRequest();
      this.ws.connect(this.signalingUrl)
    } catch (e) {
      this.connectionState = SignalingConnectionState.FAILED;
      if (e instanceof Error) {
        this.emit("error", e);
      } else {
        this.emit("error", new Error(JSON.stringify(e)));
      }
    }
  }

  async reconnect(): Promise<void> {
    if (this.connectionState === SignalingConnectionState.FAILED || this.connectionState === SignalingConnectionState.CLOSED) {
      return;
    }
    try {
      this.connectionState = SignalingConnectionState.CONNECTING
      this.ws.connect(this.signalingUrl);
    } catch {
      this.waitReconnect();
    }
  }

  setupWs(ws: WebSocketConnectionImpl) {
    ws.on("close", (reason: WebSocketCloseReason) => this.handleWsClosed(reason));
    ws.on("error", (reason: Error) => this.handleWsClosed(reason));
    ws.on("message", (_channelId, msg, _authorized) => this.signalingChannel.handleRoutingMessage(msg));
    ws.on("peerconnected",(_channelId) => {
      this.signalingChannel.handlePeerConnected()
    })
    ws.on("peeroffline", (_channelId) => {
      console.log("peer offline")
      this.signalingChannel.handlePeerOffline();
    })
    ws.on("open", () => this.handleWsOpened());

    ws.on("channelerror", (_channelId, errorCode, errorMessage) => {
      const e = new SignalingError(errorCode, errorMessage);
      e.isRemote = true;
      this.signalingChannel.handleError(e)
    })
  }

  handleWsOpened() {
    if (this.connectionState === SignalingConnectionState.FAILED || this.connectionState === SignalingConnectionState.CLOSED) {
      return;
    }
    this.openedWebSockets++;
    const reconnected = this.openedWebSockets > 1;
    if (reconnected) {
      this.emit("connectionreconnect");
    }
    this.signalingChannel.handleWebSocketConnect();
    this.connectionState = SignalingConnectionState.CONNECTED;
  }

  handleWsClosed(error: Error | WebSocketCloseReason) {
    if (this.connectionState === SignalingConnectionState.FAILED || this.connectionState === SignalingConnectionState.CLOSED) {
      return;
    }
    if (this.openedWebSockets === 0) {
      this.connectionState = SignalingConnectionState.FAILED;
      // The websocket was closed in the initial attempt to connect to the
      // service, this is always a fatal error.
      if (error instanceof Error) {
        this.emit("error", error)
      } else {
        this.emit("error", new Error(`The websocket was closed before it got opened, code: ${error.code}, reason: ${error.reason}`))
      }
    } else {
      this.waitReconnect();
    }
  }

  private waitReconnect() {
    if (this.connectionState === SignalingConnectionState.FAILED || this.connectionState === SignalingConnectionState.CLOSED) {
      return;
    }
    if (this.connectionState === SignalingConnectionState.WAIT_RETRY) {
      return;
    }
    this.connectionState = SignalingConnectionState.WAIT_RETRY;

    /**
     * A client should give up trying to reconnect after 7 attempts ~2 minutes.
     */
    if (this.reconnectCounter > 7) {
      this.connectionState = SignalingConnectionState.FAILED;
      return;
    }

    const reconnectWait = 1000 * (2 ** this.reconnectCounter)

    this.reconnectCounter++;
    setTimeout(() => {
      this.reconnect()
    }, reconnectWait)
  }

  // Signaling channel impl:
  sendMessage(message: JSONValue): Promise<void> {
    return this.signalingChannel.sendMessage(message);
  }

  sendError(errorCode: string, errorMessage: string) {
    return this.signalingChannel.sendError(errorCode, errorMessage);
  }

  get isDevice() {
    return false;
  }

  get channelState() {
    return this.signalingChannel.channelState
  }
}
