import { SignalingConnectionState, SignalingChannelState, JSONValue } from "@nabto/webrtc-signaling-common";
import { SignalingClientImpl } from "./impl/SignalingClientImpl"

/**
 * Options for creating a SignalingClient.
 */
export interface SignalingClientOptions {
  /**
   * The product ID to use. (eg. wp-abcdefghi)
   */
  productId: string,
  /**
   * The device id to use. (eg. wd-jklmnopqr)
   */
  deviceId: string,
  /**
   * Set the requireOnline bit to true if the connect should fail in the case
   * where a device is not online when the connection is made.
   */
  requireOnline?: boolean,
  /**
   * Optional URL for the signaling service.
   */
  endpointUrl?: string,

  /**
   * Optional accessToken, if no access token is provided the signaling client
   * will be anonymous. On the other hand if an access token is provided the
   * signaling client will be authorized.
   */
  accessToken?: string,

}

/**
 * The SignalingClient is responsible for connecting to the Nabto WebRTC
 * Signaling service and when it is connected, it can be used as a signaling
 * channel to send signaling messages to a remote device/camera.
 */
export interface SignalingClient {
  /**
   * Close the signaling client, this deregisters callbacks and closes
   * underlying resources.
   */
  close(): void;

  /**
   * Check if the connection to the Signaling service is alive. If the
   * connection was dead and reconnects the "connectionreconnect" event will be
   * called.
   *
   * If the application detect that the WebRTC connection state goes to
   * conncetionState.disconnected, this method can be called to make the connection reconnect or fail faster than what normal WebSocket timeouts allows.
   */
  checkAlive(): void;

  /**
  * Send a message to the other peer
  *
  * @param message The message to send
  */
  sendMessage(message: JSONValue): Promise<void>;

  /**
  * Send an error code and message to the other peer. Signaling Errors are
  * always fatal so this call will make the device close its resources.
  *
  * @param errorCode  The error code a string which can be handled
  * programmatically.
  * @param errorMessage  A string which is used to explain the error.
  */
  sendError(errorCode: string, errorMessage?: string): Promise<void>;

  /**
  * Request a list of IceServers from the Signaling service.
  *
  * The request uses the accessToken from the SingnalingClientOptions. If no
  * accessToken is provided, only STUN servers and no TURN servers is returned.
  * If an accessToken is provided in the options TURN servers are returned if
  * the accessToken gives access to TURN servers.
  *
  * This method is not used in standard Nabto examples since ICE servers are
  * received from the device when using the Nabto default transport.
  *
  * @returns Promise resolving to a list of ICE servers
  */
  getIceServers(): Promise<Array<RTCIceServer>>;

  /**
   * Signaling Service Connection State.
   *
   * The state between the client and the signaling service. The connection to
   * the signaling service can be Connected, even if the device is not connected to the Signaling service.
   */
  connectionState: SignalingConnectionState;

  /**
   * This represents the state of the channel between the client and the device on top of the Signaling Connection.
   */
  channelState: SignalingChannelState;

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
   * Add a listener invoked when the signaling connection reconnects.
   *
   * @param target should be "connectionreconnect".
   * @param f the callback function to invoke.
   */
  on(target: "connectionreconnect", f: () => void): void;

  /**
   * Remove a connection reconnect listener.
   * @param target should be "connectionreconnect".
   * @param f the callback function to remove.
   */
  off(target: "connectionreconnect", f: () => void): void;

  /**
   * Add a listener for connection state changes.
   *
   * @param target should be "connectionstatechange".
   * @param f the callback function to invoke.
   */
  on(target: "connectionstatechange", f: () => void): void;

  /**
   * Remove listener for connection state changes.
   *
   * @param target should be "connectionstatechange".
   * @param f the callback function to remove.
   */
  off(target: "connectionstatechange", f: () => void): void;

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
   * The channelId is coming from the Nabto WebRTC Signaling service. When the
   * SignalingClientChannel is connected the channelId become available.
   *
   * The channelId is available for debug purposes such that it is possible to
   * correlate a channel on the client side with a channel on the device side.
   */
  readonly channelId: string | undefined;
}

/**
 * Create a SignalingClientChannel which is used to connect to the Nabto WebRTC
 * Signaling service and send Signaling Messages to a device/camera.
 *
 * @param options Options used for the signaling client.
 * @returns The created SignalingClient.
 */
export function createSignalingClient(options: SignalingClientOptions): SignalingClient {
  return new SignalingClientImpl(options);
}
