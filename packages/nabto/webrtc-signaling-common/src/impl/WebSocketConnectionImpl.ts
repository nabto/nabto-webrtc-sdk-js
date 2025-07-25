import { WebSocketConnection, WebSocketConnectionEventHandlers } from "./WebSocketConnection";
import { z } from "zod";

import WebSocket from 'isomorphic-ws';
import { TypedEventEmitter } from "./TypedEventEmitter";
import { JSONValue, JSONValueSchema } from '../JSONValue'
import { WebSocketAdapter } from "./WebSocketAdapter";
import { SignalingError } from "../SignalingError";

enum RoutingMessageType {
  MESSAGE = "MESSAGE",
  ERROR = "ERROR",
  PEER_CONNECTED = "PEER_CONNECTED",
  PEER_OFFLINE = "PEER_OFFLINE",
  PING = "PING",
  PONG = "PONG",
}

const RoutingMessageSchema = z.object({
  type: z.literal(RoutingMessageType.MESSAGE),
  channelId: z.string(),
  message: JSONValueSchema,
  authorized: z.optional(z.boolean())
});

const RoutingErrorSchema = z.object({
  type: z.literal(RoutingMessageType.ERROR),
  channelId: z.string(),
  error: z.object({
    code: z.string(),
    message: z.optional(z.string())
  })
});

const RoutingPeerConnectedSchema = z.object({
  type: z.literal(RoutingMessageType.PEER_CONNECTED),
  channelId: z.string(),
});
const RoutingPeerOfflineSchema = z.object({
  type: z.literal(RoutingMessageType.PEER_OFFLINE),
  channelId: z.string(),
});

const RoutingPingSchema = z.object({
  type: z.literal(RoutingMessageType.PING),
});

const RoutingPongSchema = z.object({
  type: z.literal(RoutingMessageType.PONG),
});

const RoutingUnionSchema = z.union([RoutingMessageSchema, RoutingErrorSchema, RoutingPeerConnectedSchema, RoutingPeerOfflineSchema, RoutingPingSchema, RoutingPongSchema]);

type RoutingUnion = z.infer<typeof RoutingUnionSchema>;

type RoutingMessage = z.infer<typeof RoutingMessageSchema>;
type RoutingError = z.infer<typeof RoutingErrorSchema>;
//type RoutingPeerConnected = z.infer<typeof RoutingPeerConnectedSchema>;
//type RoutingPeerOffline = z.infer<typeof RoutingPeerOfflineSchema>;
type RoutingPing = z.infer<typeof RoutingPingSchema>;
type RoutingPong = z.infer<typeof RoutingPongSchema>;

export class WebSocketConnectionImpl extends TypedEventEmitter<WebSocketConnectionEventHandlers> implements WebSocketConnection {
  ws?: WebSocketAdapter;

  // if oldCounter == currentCounter when testing for a ping timeout there has
  // been a timeout.
  private pongCounter: number = 0;

  private isConnected: boolean = false;
  checkAliveTimer: ReturnType<typeof setTimeout> | undefined = undefined;

  constructor(private name: string) {
    super()
  }

  connect(url: string) {
    this.ws = new WebSocketAdapter(url);
    this.commonConnect(this.ws);
  }

  commonConnect(ws: WebSocketAdapter) {
    ws.on("open", () => {
      this.isConnected = true;
      this.emitSync("open");
    });
    ws.on("close", (ev: WebSocket.CloseEvent) => {
      console.debug(`Websocket close code: ${ev.code} reason: ${ev.reason}`);
      this.closeWebsocketInternal();
      this.emitSync("close", {code: ev.code, reason: ev.reason});
    });
    ws.on("error", (ev: WebSocket.Event) => {
      console.error(`Websocket error: ${ev.type}`);
      this.closeWebsocketInternal();
      this.emitSync("error", new Error(ev.type));
    })
    ws.on("message", (ev: WebSocket.MessageEvent) => {
      this.handleMessage(ev);
    })
  }

  /**
   * This is called by the application to forcefully close a websocket such that
   * a new one can be created.
   */
  closeCurrentWebSocket() {
    if (this.ws) {
      // this triggers an on("error",...) event, which we use to create a new websocket
      this.ws.abort();
    }
  }

  close() {
    if (this.ws) {
      this.ws.close(1000, "The application is closing down.");
    }
    this.closeWebsocketInternal();
    this.removeAllListeners();
  }

  /**
   * This is called from inside this module to cleanup after a websocket has been closed.
   * @param reason
   */
  closeWebsocketInternal() {
    if (this.checkAliveTimer) {
      clearTimeout(this.checkAliveTimer);
      this.checkAliveTimer = undefined;
    }
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws = undefined;
      this.isConnected = false;
    }
  }
  public sendMessage(channelId: string, message: JSONValue) {
    const msg: RoutingMessage = { type: RoutingMessageType.MESSAGE, channelId: channelId, message: message }
    this.send(msg);
  }

  public sendError(channelId: string, signalingError: SignalingError) {
    const error: RoutingError = { type: RoutingMessageType.ERROR, channelId: channelId, error: { code: signalingError.errorCode, message: signalingError.errorMessage } }
    this.send(error);
  }

  private sendPing() {
    const ping: RoutingPing = { type: RoutingMessageType.PING }
    this.send(ping);
  }
  private sendPong() {
    const pong: RoutingPong = { type: RoutingMessageType.PONG }
    this.send(pong);
  }


  send(msg: RoutingUnion) {
    if (!this.isConnected) {
      // if we are not connected yet, discard the websocket message. This is
      // easier to handle than defer sending of the messages, they will be
      // resent anyway when the upper layer detects that the connection is
      // succeeded.
      return;
    }
    //console.debug(`${this.name} Sending a message of type (${msg.type}) on the websocket connection.`, msg);
    const json = JSON.stringify(msg);
    this.ws?.send(json);
  }

  checkAlive(timeout: number) {
    // We only allow a single outstanding checkAlive at a time.
    if (this.checkAliveTimer) {
      return;
    }
    /**
     * Send a ping, wait for a pong
     */
    const currentPongCounter = this.pongCounter;
    this.sendPing();
    this.checkAliveTimer = setTimeout(() => {
      this.checkAliveTimer = undefined;
      // test that the pong counter has not moved
      if (currentPongCounter == this.pongCounter) {
        this.emitSync("pingtimeout");
      }
    }, timeout);
  }

  handleParsedMessage(msg: RoutingUnion) {
    if (msg.type === RoutingMessageType.PEER_CONNECTED) {
      this.emitSync("peerconnected", msg.channelId)
    } else if (msg.type === RoutingMessageType.PEER_OFFLINE) {
      this.emitSync("peeroffline", msg.channelId)
    } else if (msg.type === RoutingMessageType.PING) {
      this.handlePing();
    } else if (msg.type === RoutingMessageType.PONG) {
      this.handlePong();
    } else if (msg.type === RoutingMessageType.MESSAGE) {
      let authorized = false;
      if (msg.authorized !== undefined) {
        authorized = msg.authorized;
      }
      this.emitMessage(msg.channelId, msg.message, authorized);

    } else if (msg.type === RoutingMessageType.ERROR) {
      this.emitSync("channelerror", msg.channelId,msg.error.code, msg.error.message)
    } else {
      console.debug(`Not handling unknown message`, msg);
    }
  }

  emitMessage(channelId: string, message: JSONValue, authorized: boolean) {
    const consumers = this.emitSync("message", channelId, message, authorized);
    if (consumers === 0) {
      console.error(`"The message: ${message}, on the channel: ${channelId}, got dropped as there are no receivers registerd for the message event.`);
    }
  }

  handleMessage(msg: WebSocket.MessageEvent) {
    if (typeof (msg.data) !== "string") {
      console.error("Expected websocket data to be of type string. Discarding unknown message");
      return;
    }
    const jsonStr = msg.data;
    try {
      const json = JSON.parse(jsonStr);
      const parsed = RoutingUnionSchema.safeParse(json);
      if (!parsed.success) {
        console.error(`Cannot parse ${JSON.stringify(json)} as a known routing message`);
      } else {
        this.handleParsedMessage(parsed.data)
      }
    } catch {
      console.error(`Cannot parse as json: ${msg.data}`)
    }
  }
  handlePing() {
    this.sendPong()
  }

  handlePong() {
    this.pongCounter++
  }
}
