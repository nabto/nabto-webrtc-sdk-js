/**
 * The raw websocket connection to the signaling service exposes this interface
 */

import { JSONValue } from "../JSONValue";

export interface WebSocketCloseReason {
  code: number,
  reason: string
}

export interface WebSocketConnectionEventHandlers {
  /**
   * Invoked when a new message arrives from the other peer.
   */
  message: (channelId: string, message: JSONValue, authorized: boolean) => void,
  /**
   * Invoked then it is detected that the remote peer has been
   * connected/reconnected.
   */
  peerconnected: (channelId: string) => void,
  /**
   * Invoked if we are sending a message to a peer which is offline.
   */
  peeroffline: (channelId: string) => void,
  /**
   * If the other end has sent an error on the signaling connection, we invoke
   * this function.
   */
  channelerror: (channelId: string, errorCode: string, errorMessage?: string) => void

  /**
   * Invoked when we have not received a pong to a ping we have sent to the signaling service.
   */
  pingtimeout: () => void;

  /**
   * Called when the websocket has been opened.
   */
  open: () => void,
  /**
  * If the websocket connection has been closed or an error occured on it, this
  * function is called.
  */
  close: (reason: WebSocketCloseReason) => void,
  error: (reason: Error) => void
}

export interface WebSocketConnection {

  /**
   * Connect or reconnect a websocket.
   * @param url  The URL to connect to, this is a url we got from the signaling service.
   */
  connect(url: string): void;

  /**
   * Close the current websocket if it exists. This prepares the websocket
   * connection for a new call to connect.
   */
  closeCurrentWebSocket(): void;

  /**
   * Call this to close the websocket connection
   */
  close(): void;

  /**
   * Send a message, the message will be sent to the other peer for the signaling connection
   */
  sendMessage(channelId: string, message: JSONValue): void;

  /**
   * Send an error destined for the other peer of the signaling connection
   */
  sendError(channelId: string, errorCode: string, errorMessage?: string): void

  /**
   * Check if the websocket is still alive by sending an application layer ping.
   * This is used if it is detected that the WebRTC Connection detects a
   * connection problem and we do not know if the problem is with this peer or
   * the other peer.
   */
  checkAlive(timeout: number): void

  /**
   * Add an event listener
   */
  on<K extends keyof WebSocketConnectionEventHandlers>(target: K, f: WebSocketConnectionEventHandlers[K]): void;
  /**
   * Remove an event listener
   */
  off<K extends keyof WebSocketConnectionEventHandlers>(target: K, f: WebSocketConnectionEventHandlers[K]): void;
}
