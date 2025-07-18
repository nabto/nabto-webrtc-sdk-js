/**
 * Error codes used when an error occurs. These can be emitted directly by the SDK, or be sent as an error to the other peer. The Nabto SDK will only use error codes listed here, however, when sending errors from the application, any string can be used.
 */
export enum SignalingErrorCodes {
  /**
   * The SDK received a message with invalid JSON or a JSON object not following the protocol
   */
  DECODE_ERROR = "DECODE_ERROR",
  /**
   * A signed message was received, but the signature could not be verified.
   */
  VERIFICATION_ERROR = "VERIFICATION_ERROR",
  /**
   * This error is received from the other peer when it is closing the Signaling Channel.
   */
  CHANNEL_CLOSED = "CHANNEL_CLOSED",
  /**
   * This error is sent to the SignalingClient by the SignalingDevice if the client is using an unknown Channel ID.
   */
  CHANNEL_NOT_FOUND = "CHANNEL_NOT_FOUND",
  /**
   * This can be sent by the device if a client attempts to create a new channel but the device has reached its limit.
   */
  NO_MORE_CHANNELS = "NO_MORE_CHANNELS",
  /**
   * This error code is sent if a channel is rejected based on authentication and/or authorization data.
   */
  ACCESS_DENIED = "ACCESS_DENIED",
  /**
   * This error is sent if the device or the client encounters an internal error.
   */
  INTERNAL_ERROR = "INTERNAL_ERROR"
}


/**
 * Error class thrown by the SDK.
 */
export class SignalingError extends Error {
  /**
   * This class represents a signaling error.
   *
   * @param errorCode  The error code for the error. The message will then
   * provide the details.
   * @param errorMessage  The error message which can be sent over the network
   * to the other peer.
   * @param cause the cause of the error, often the error in the catch(e), this
   * can be used for logging purposes.
   */
  constructor(public errorCode: string, public errorMessage?: string, public cause?: unknown) {
    super(`Signaling Error. Error Code: (${errorCode})${errorMessage ? ". " + errorMessage : ""}`);
  }

  static fromUnknown(error: unknown): SignalingError {
    if (error instanceof SignalingError) {
      return error;
    } else {
      return new SignalingError(SignalingErrorCodes.INTERNAL_ERROR, "An internal error occured, check the log for further details.");
    }
  }
}
