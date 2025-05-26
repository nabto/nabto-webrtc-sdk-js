/**
 * Hint about the state of the remote peer. The state is only updated in
 * certain situations and in some cases it does not reflect the actual state
 * of the remote peer.
 */
export enum SignalingChannelState {
  /**
   * The state is new if the client has not been connected yet.
   */
  NEW = "NEW",
  /**
   * The state is online if our best guess is that the device is currently online.
   */
  ONLINE = "ONLINE",
  /**
   * The state is offline if the current best guess is that the device is offline.
   */
  OFFLINE = "OFFLINE",
  /**
   * If the channel has received an error, which is fatal in the protocol, the state will be failed.
   */
  FAILED = "FAILED",
  /**
   * If close has been called on the channel by the application or by the signaling client, the state is closed.
   */
  CLOSED = "CLOSED"
}
