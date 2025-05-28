import { JSONValue } from "./JSONValue";
import { SignalingChannelState } from "./SignalingChannelState";

export interface SignalingChannelEventHandlers {
  error: (error: Error) => void
  message: (message: JSONValue) => Promise<void>
  channelstatechange: () => void
}

/**
 * Interface representing a logical channel between to peers through the underlying websocket relay connection.
 */
export interface SignalingChannel {
  /**
   * Send a message to the other peer
   *
   * @param message The message to send
   */
  sendMessage(message: JSONValue): Promise<void>;


  /**
  * Send an error code and message to the other peer.
  * @param errorCode  The error code a string which can be handled programmatically.
  * @param errorMessage  A string which is used to explain the error.
  */
  sendError(errorCode: string, errorMessage?: string): Promise<void>;

  /**
   * Stop/close the signaling channel
   */
  stop(): void;

  /**
  * The signaling peer state is the state of the other peer of the signaling
  * channel. If it says online the device seemed to be online when the
  * signaling channel was made or when the last message transferred on the
  * signaling channel happened. If it is OFFLINE the other peer was either
  * Offline when the connection was made or a message could not be delivered to
  * the other peer as it has gone offline.
  *
  * If the other peer goes offline and no message is transmitted towards it
  * after it goes offline, the state is not updated to reflect this.
  */
  channelState: SignalingChannelState;

  /**
   * Add listener for channel state changes.
   *
   * @param target should be "channelstatechange".
   * @param f the callback function to invoke.
   */
  on(target: "channelstatechange", f: () => void): void;

  /**
   * remove listener for channel state changes.
   *
   * @param target should be "channelstatechange".
   * @param f the callback function to remove.
   */
  off(target: "channelstatechange", f: () => void): void;

  /**
   * Add a listener invoked when a signaling message is received.
   *
   * @param target should be "message".
   * @param f the callback function to invoke.
   */
  on(target: "message", f: (messge: JSONValue) => Promise<void>): void;

  /**
   * Remove a singling message listener.
   * @param target should be "message".
   * @param f the callback function to remove.
   */
  off(target: "message", f: (message: JSONValue) => Promise<void>): void;

  /**
   * Add listener for signaling errors.
   *
   * When this happens the signaling channel is dead and cannot come back to
   * live, the webrtc connection needs to be teardown.
   *
   * @param target should be "error".
   * @param f the callback function to invoke.
   */
  on(target: "error", f: (err: Error) => void): void;

  /**
   * Remove listener for signaling errors.
   * @param target should be "error".
   * @param f the callback function to remove.
   */
  off(target: "error", f: (err: Error) => void): void;

  /**
   * Return the channelId, this can be used to correlate channels in the client,
   * device and the backend.
   *
   * If the channel is not yet connected to the device, the channel id is
   * undefined.
   */
  readonly channelId: string | undefined;
}
