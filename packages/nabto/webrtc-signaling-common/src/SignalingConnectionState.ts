
/**
 * This exposes the state of the state of the connection to the signaling service.
 */
export enum SignalingConnectionState {
  /**
   * The Signaling Connection was just created
   */
  NEW = "NEW",
  /**
   * The Signaling Connection is connecting to the backend.
   */
  CONNECTING = "CONNECTING",
  /**
   * The Signaling Connection is connected and ready to use.
   */
  CONNECTED = "CONNECTED",
  /**
   * The Signaling Connection is disconnected and will go to the WAIT_RETRY state..
   */
  DISCONNECTED = "DISCONNECTED",
  /**
   * The Signaling Connection is disconnected and waiting for its backoff before reconnecting.
   */
  WAIT_RETRY = "WAIT_RETRY",
  /**
   * The Signaling Connection has failed and will not reconnect.
   */
  FAILED = "FAILED",
  /**
   * The Signaling Connection was closed by the application.
   */
  CLOSED = "CLOSED"
}

export interface SignalingConnectionStateChangesEventHandlers {
  // Invoked when the signaling connection state changes.
  connectionstatechange: () => void;
}

export type SignalingConnectionStateChangeEvent = () => void
export interface SignalingConnectionStateChanges {
  get connectionState(): SignalingConnectionState;

  // Add an event listener
  on<K extends keyof SignalingConnectionStateChangesEventHandlers>(target: K, f: SignalingConnectionStateChangesEventHandlers[K]): void;

  // Remove an event listener
  off<K extends keyof SignalingConnectionStateChangesEventHandlers>(target: K, f: SignalingConnectionStateChangesEventHandlers[K]): void;

}
