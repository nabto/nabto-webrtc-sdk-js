import { JSONValue, SignalingError, SignalingErrorCodes } from '@nabto/webrtc-signaling-common';
import { MessageSigner, ProtocolSigningMessage, ProtocolSigningMessageTypes, ProtocolSigningMessageSchema } from './MessageSigner';

/**
 * Takes in a message and signs or verifies it.
 * This is a NONE signer/verifier, which means the message is not signed nor verified.
 */
export class NoneMessageSigner implements MessageSigner {
  async signMessage(msg: JSONValue): Promise<ProtocolSigningMessage> {
    return {
      type: ProtocolSigningMessageTypes.NONE,
      message: msg
    }
  }

  async verifyMessage(message: JSONValue): Promise<JSONValue> {
    const signingMessage = ProtocolSigningMessageSchema.parse(message);
    if (signingMessage.type !== ProtocolSigningMessageTypes.NONE) {
      throw new SignalingError(SignalingErrorCodes.VERIFICATION_ERROR, `Expected a ${ProtocolSigningMessageTypes.NONE} signed message but got a signing message of type ${signingMessage.type}.`);
    }
    const noneMessage = signingMessage;
    return noneMessage.message;
  }
}
