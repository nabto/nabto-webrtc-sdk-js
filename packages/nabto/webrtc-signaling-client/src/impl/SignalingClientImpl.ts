import {
  DeviceOfflineError,
  SignalingClient,
  SignalingClientOptions,
} from "../SignalingClient";
import {
  SignalingError,
  SignalingChannel,
  SignalingChannelState,
  SignalingConnectionState,
  SignalingChannelEventHandlers,
  WebSocketConnectionImpl,
  SignalingServiceImpl,
  SignalingConnectionStateChangesEventHandlers,
  SignalingChannelImpl,
  WebSocketCloseReason,
  JSONValue,
} from "@nabto/webrtc-signaling-common";
import { TypedEventEmitter } from "@nabto/webrtc-signaling-common";
import { HttpApiImpl } from "./HttpApiImpl";

const CHECK_ALIVE_TIMEOUT = 1000;
// minimum time betwenn a open and close event on a websocket such that the
// websocket connection counts as have been connected.
const RECONNECT_COUNTER_RESET_TIMEOUT = 10000;

export interface SignalingClientEventHandlers
  extends SignalingChannelEventHandlers, SignalingConnectionStateChangesEventHandlers
{
  connectionreconnect: () => void;
  error: (error: unknown) => void;
}

export class SignalingClientImpl
  extends TypedEventEmitter<SignalingClientEventHandlers>
  implements SignalingClient, SignalingServiceImpl, SignalingChannel
{
  httpApi: HttpApiImpl;

  channelId: string | undefined = undefined;
  ws: WebSocketConnectionImpl;

  // number of times we have reconnected without obtaining a valid connection to
  // the signaling service.
  reconnectCounterTimeoutId?: ReturnType<typeof setTimeout>;
  reconnectCounter: number = 0;

  openedWebSockets: number = 0;

  signalingUrl: string = "";

  signalingChannel: SignalingChannelImpl;

  constructor(private options: SignalingClientOptions) {
    super();
    let endpointUrl = options.endpointUrl;
    if (!endpointUrl) {
      endpointUrl = `https://${options.productId}.webrtc.nabto.net`;
    }
    this.httpApi = new HttpApiImpl(
      endpointUrl,
      options.productId,
      options.deviceId,
      options.accessToken
    );

    this.signalingChannel = new SignalingChannelImpl(this, "not_connected");

    this.signalingChannel.on("channelstatechange", () => {
      this.emitSync("channelstatechange");
    });
    this.signalingChannel.on("error", (error: unknown) => {
      this.emitSignalingChannelError(error);
    });
    this.signalingChannel.on("message", async (message: JSONValue) => {
      const consumers = await this.emit("message", message);
      if (consumers === 0) {
        console.error(
          `Got a signaling message but there was no consumers registered for the message, so the message is lost. Message: ${JSON.stringify(
            message
          )}`
        );
      }
    });

    this.ws = new WebSocketConnectionImpl("client");
    this.setupWs(this.ws);
  }
  sendRoutingMessage(channelId: string, message: string): void {
    if (this.connectionState !== SignalingConnectionState.CONNECTED) {
      // Cannot send message, the connection is not connected.
      return;
    }
    this.ws.sendMessage(channelId, message);
  }
  closeSignalingChannel(_channelId: string) {
    this.close();
  }

  connectionState_: SignalingConnectionState = SignalingConnectionState.NEW;

  get connectionState(): SignalingConnectionState {
    return this.connectionState_;
  }

  set connectionState(state: SignalingConnectionState) {
    this.connectionState_ = state;
    this.emitSync("connectionstatechange");
  }

  start(): void {
    if (this.connectionState !== SignalingConnectionState.NEW) {
      throw new Error("Connect can only be called once.");
    }
    this.firstConnect();
  }

  async requestIceServers(): Promise<Array<RTCIceServer>> {
    return this.httpApi.requestIceServers();
  }

  async serviceSendError(
    channelId: string,
    error: SignalingError
  ): Promise<void> {
    if (this.connectionState !== SignalingConnectionState.CONNECTED) {
      // If the connection is not connected, we cannot send an error.
      return;
    }
    this.ws.sendError(channelId, error);
  }
  checkAlive(): void {
    this.ws.checkAlive(CHECK_ALIVE_TIMEOUT);
  }

  close(): void {
    if (this.connectionState === SignalingConnectionState.CLOSED) {
      return;
    }
    // This is potentially emitting a CHANNEL_CLOSED error on the connection,
    this.signalingChannel.close();
    this.connectionState = SignalingConnectionState.CLOSED;
    this.ws.close();

    this.removeAllListeners();
  }

  async firstConnect(): Promise<void> {
    try {
      this.connectionState = SignalingConnectionState.CONNECTING;
      const response = await this.httpApi.httpConnectRequest();
      this.channelId = response.channelId;
      this.signalingChannel.channelId = this.channelId;
      if (response.deviceOnline !== undefined) {
        this.signalingChannel.channelState = response.deviceOnline
          ? SignalingChannelState.CONNECTED
          : SignalingChannelState.DISCONNECTED;
      }
      if (this.options.requireOnline === true) {
        if (
          this.signalingChannel.channelState !== SignalingChannelState.CONNECTED
        ) {
          throw new DeviceOfflineError();
        }
      }
      this.signalingUrl = response.signalingUrl;
      this.ws.connect(this.signalingUrl);
    } catch (e) {
      this.emitError(e);
    }
  }

  async reconnect(): Promise<void> {
    if (
      this.connectionState === SignalingConnectionState.FAILED ||
      this.connectionState === SignalingConnectionState.CLOSED
    ) {
      return;
    }
    try {
      this.connectionState = SignalingConnectionState.CONNECTING;
      this.ws.connect(this.signalingUrl);
    } catch {
      this.waitReconnect();
    }
  }

  setupWs(ws: WebSocketConnectionImpl) {
    ws.on("close", (reason: WebSocketCloseReason) =>
      this.handleWsClosed(reason)
    );
    ws.on("error", (reason: Error) => this.handleWsClosed(reason));
    ws.on("message", (_channelId, msg, _authorized) =>
      this.signalingChannel.handleRoutingMessage(msg)
    );
    ws.on("peerconnected", (_channelId) => {
      this.signalingChannel.handlePeerConnected();
    });
    ws.on("peeroffline", (_channelId) => {
      console.log("peer offline");
      this.signalingChannel.handlePeerOffline();
    });
    ws.on("open", () => this.handleWsOpened());

    ws.on("channelerror", (_channelId, errorCode, errorMessage) => {
      const e = new SignalingError(errorCode, errorMessage);
      this.signalingChannel.handleError(e);
    });
    this.ws.on("pingtimeout", () => {
      if (
        this.connectionState === SignalingConnectionState.CONNECTED ||
        this.connectionState === SignalingConnectionState.CONNECTING
      ) {
        this.ws.closeCurrentWebSocket();
      }
    });
  }

  handleWsOpened() {
    if (
      this.connectionState === SignalingConnectionState.FAILED ||
      this.connectionState === SignalingConnectionState.CLOSED
    ) {
      return;
    }
    this.connectionState = SignalingConnectionState.CONNECTED;
    this.setReconnectCounterTimeout();

    this.openedWebSockets++;
    const reconnected = this.openedWebSockets > 1;
    if (reconnected) {
      this.emitSync("connectionreconnect");
    }
    this.signalingChannel.handleWebSocketConnect();
  }

  handleWsClosed(error: Error | WebSocketCloseReason) {
    if (
      this.connectionState !== SignalingConnectionState.CONNECTED &&
      this.connectionState !== SignalingConnectionState.CONNECTING
    ) {
      return;
    }
    this.clearReconnectCounterTimeout();
    if (this.openedWebSockets === 0) {
      this.connectionState = SignalingConnectionState.FAILED;
      // The websocket was closed in the initial attempt to connect to the
      // service, this is always a fatal error.
      if (error instanceof Error) {
        this.emitError(error);
      } else {
        this.emitError(
          new Error(
            `The websocket was closed before it got opened, code: ${error.code}, reason: ${error.reason}`
          )
        );
      }
    } else {
      this.waitReconnect();
    }
  }

  private setReconnectCounterTimeout() {
    this.clearReconnectCounterTimeout();
    this.reconnectCounterTimeoutId = setTimeout(() => {
      this.reconnectCounter = 0;
    }, RECONNECT_COUNTER_RESET_TIMEOUT);
  }

  private clearReconnectCounterTimeout() {
    if (this.reconnectCounterTimeoutId) {
      clearTimeout(this.reconnectCounterTimeoutId);
      this.reconnectCounterTimeoutId = undefined;
    }
  }

  private waitReconnect() {
    if (
      this.connectionState !== SignalingConnectionState.CONNECTING &&
      this.connectionState !== SignalingConnectionState.CONNECTED
    ) {
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

    const reconnectWait = 1000 * 2 ** this.reconnectCounter;
    const jitterWaitMilliseconds = Math.random() * reconnectWait;

    console.debug(
      `Switching to WAIT_RETRY state, waiting ${jitterWaitMilliseconds}ms before reconnecting. Reconnect counter: ${this.reconnectCounter}`
    );

    this.reconnectCounter++;
    setTimeout(() => {
      this.reconnect();
    }, jitterWaitMilliseconds);
  }

  private emitError(e: unknown) {
    this.connectionState = SignalingConnectionState.FAILED;
    this.emitSync("error", e);
  }
  private emitSignalingChannelError(e: unknown) {
    // This should not change to connection state to failed.
    this.emitSync("error", e);
  }

  // Signaling channel impl:
  sendMessage(message: JSONValue): Promise<void> {
    return this.signalingChannel.sendMessage(message);
  }

  sendError(error: SignalingError) {
    return this.signalingChannel.sendError(error);
  }

  get channelState() {
    return this.signalingChannel.channelState;
  }
}
