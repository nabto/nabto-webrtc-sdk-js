
/**
 * Message types that can be sent in a signaling message.
 */
export enum WebrtcSignalingMessageType {
  /**
   * Signaling message containing a WebRTC Description
   */
  DESCRIPTION = "DESCRIPTION",
  /**
   * Signaling message containing a WebRTC ICE candidate
   */
  CANDIDATE = "CANDIDATE",
};

/**
 * Format of an ICE candidate message.
 */
export type SignalingCandidate = {
  type: WebrtcSignalingMessageType.CANDIDATE,
  candidate: RTCIceCandidateInit,
};

/**
 * Format of an SDP description message.
 */
export type SignalingDescription = {
  type: WebrtcSignalingMessageType.DESCRIPTION,
  description: RTCSessionDescriptionInit,
};

/**
 * This is the format of signaling messages the application sends and receives.
 */
export type WebrtcSignalingMessage =
  SignalingDescription |
  SignalingCandidate;



export type MessageTransportEventHandler = (webrtcSignalingMessage: WebrtcSignalingMessage) => Promise<void>;

/**
 * Modes the MessageTransport can be in.
 *  - CLIENT: The message transport is part of a client application
 *  - DEVICE: The message transport is part of a device application
 */
export enum MessageTransportMode {
  CLIENT,
  DEVICE
};

/**
 * The MessageTransport interface is used as a middleware to encode, validate,
 * sign, and verify messages sent and received on a Signaling Channel.
 *
 * The responsibilities of the Message Transport is to initially setup the
 * channel. When this is done, it is used to exchange WebRTC Signaling Messages
 * between the client and the device.
 *
 * The on("setupdone",...) event is fired when the channel is setup. The
 * RTCPeerConnection should be created in this callback and it should be created
 * with the RTC ICE Servers provided in the callback.
 */
export interface MessageTransport {

  /**
   * This boolean can be used in perfect negotiation to tell if this peer should
   * act as a polite peer. In nabto WebRTC the default assignment of perfect
   * negotiation roles is that clients are always impolite and devices are
   * polite,
   */
  readonly mode: MessageTransportMode;

  /**
   * Send a message through the MessageTransport
   * @param message The message to send.
   */
  sendWebRTCSignalingMessage(message: WebrtcSignalingMessage): Promise<void>;

  /**
   * Add an event listener invoked when a message is received.
   *
   * @param target Should be "webrtcsignalingmessage"
   * @param f The function to invoke
   */
  on(target: "webrtcsignalingmessage", f: MessageTransportEventHandler): void;

  /**
   * Remove an event listener for received messages.
   * @param target Should be "webrtcsignalingmessage"
   * @param f The function to remove
   */
  off(target: "webrtcsignalingmessage", f: MessageTransportEventHandler): void;

  /**
   * Add listener for errors.
   *
   * @param target should be "error".
   * @param f the callback function to invoke.
   */
  on(target: "error", f: (error: Error) => void): void;


  /**
   * Remove listener for errors.
   *
   * @param target should be "error".
   * @param f the callback function to remove.
   */
  off(target: "error", f: (error: Error) => void): void;

  /**
   * Add listener for when setup is completed.
   *
   * @param target should be "setupdone".
   * @param f the callback function to invoke.
   */
  on(target: "setupdone", f: (iceServers?: RTCIceServer[]) => Promise<void>): void;

  /**
   * Remove listener for setupdone.
   *
   * @param target should be "setupdone".
   * @param f the callback function to remove.
   */
  off(target: "setupdone", f: (iceServers?: RTCIceServer[]) => Promise<void>): void;
}
