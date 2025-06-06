/**
 * The purpose of this file is to provide an adapter for the WebSocket API The
 * normal browser websocket API does not have a `close` method that closes the
 * websocket connection instantly. If the network connection is lost and close
 * is called it takes a minute before the connection is closed and on("close")
 * return with an 1006 code.
 *
 * This adapter provides an abort method that closes the websocket and resolves
 * immediately with an error event.
 */

import { TypedEventEmitter } from "./TypedEventEmitter";
import WebSocket from 'isomorphic-ws';

export interface WebSocketAdapterEventHandlers {
  open: () => void;
  close: (event: WebSocket.CloseEvent) => void;
  error: (event: WebSocket.Event) => void;
  message: (event: WebSocket.MessageEvent) => void;
}

export class WebSocketAdapter extends TypedEventEmitter<WebSocketAdapterEventHandlers> {
  private ws: WebSocket;
  onOpen: () => void;
  onClose: (event: WebSocket.CloseEvent) => void;
  onError: (event: WebSocket.Event) => void;
  onMessage: (event: WebSocket.MessageEvent) => void;
  constructor(url: string) {
    super();
    this.ws = new WebSocket(url);
    this.onOpen = () => {
      this.emitSync("open");
    }
    this.onClose = (event: WebSocket.CloseEvent) => {
      this.emitSync("close", event);
    }
    this.onError = (event: WebSocket.Event) => {
      this.emitSync("error", event);
    }
    this.onMessage = (event: WebSocket.MessageEvent) => {
      this.emitSync("message", event);
    }

    this.ws.addEventListener("open", this.onOpen);
    this.ws.addEventListener("close", this.onClose)
    this.ws.addEventListener("error", this.onError)
    this.ws.addEventListener("message", this.onMessage)
  }
  removeListeners() {
    this.ws.removeEventListener("open", this.onOpen);
    this.ws.removeEventListener("close", this.onClose);
    this.ws.removeEventListener("error", this.onError);
    this.ws.removeEventListener("message", this.onMessage);
  }

  send(data: string | ArrayBuffer | Blob | ArrayBufferView) {
    this.ws.send(data);
  }
  close(code?: number, reason?: string) {
    this.ws.close(code, reason);
  }
  abort() {
    this.removeListeners();
    const errorEvent: WebSocket.ErrorEvent = {
      error: new Error("WebSocket connection aborted"),
      type: "error",
      message: "WebSocket connection aborted",
      target: this.ws,
    }
    this.emitSync("error", errorEvent );
  }
}
