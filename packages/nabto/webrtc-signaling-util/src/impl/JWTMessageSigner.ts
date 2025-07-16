import * as rs from "jsrsasign";
import { JWTHeader, JWTClaims, MessageSigner, JWTClaimsSchema, ProtocolSigningMessageTypes, ProtocolSigningMessage, ProtocolSigningMessageSchema, JWTHeaderSchema } from './MessageSigner';
import { JSONValue, SignalingError, SignalingErrorCodes } from "@nabto/webrtc-signaling-common";
import { v4 as uuidv4 } from "uuid";

/**
 * Takes in a message and signs or verifies it.
 *
 * The payload field message contains the data to be signed or verified.
 */
export class JWTMessageSigner implements MessageSigner {

  /**
   * Increment one for each signed message to guard against replay attacks.
   */
  nextMessageSignSeq: number = 0;
  /**
   * Verify sequence number, ensure that the sequence number of received messages are monotonically increasing
   */
  nextMessageVerifySeq: number = 0;

  /**
   * Nonces are used to ensure the messages are replay protected in this sesison.
   */
  myNonce: string | undefined = undefined;
  remoteNonce?: string

  /**
   * Construct a MessageSigner for shared secrets. This uses a shared secret to sign messages so the other peer can authorize the connection. The keyId can be used by the other peer to identify which secret was used in case multiple secrets exist.
   *
   * @param sharedSecret The shared secret to use.
   * @param keyId The key ID to use. Optional, if not set the JWT header will omit the key id.
   */
  constructor(private sharedSecret: string, private keyId?: string) {
  };

  /**
   * Get a key id from a Signing message. This is used to retrieve the keyId
   * before the message is verified such that the correct shared secret can be
   * used.
   * @param message  The Signing message.
   * @returns the keyId from the JWT header or undefined if no key id is in the header.
   */
  static async getKeyId(message: JSONValue): Promise<string | undefined> {
    const signingMessageRes = ProtocolSigningMessageSchema.safeParse(message);
    if (!signingMessageRes.success) {
      throw new SignalingError(SignalingErrorCodes.DECODE_ERROR, "Failed to decode the message.");
    }
    const signingMessage = signingMessageRes.data;
    if (signingMessage.type !== ProtocolSigningMessageTypes.JWT) {
      throw new SignalingError(SignalingErrorCodes.VERIFICATION_ERROR, `Expected a JWT signed message but got a signing message of type ${signingMessage.type}.`);
    }
    const parts = signingMessage.jwt.split(".");
    if (parts.length < 3) {
      throw new SignalingError(SignalingErrorCodes.DECODE_ERROR, "The provided JWT token does not contain two dots.");
    }

    const headerClaims = rs.KJUR.jws.JWS.readSafeJSONString(rs.b64utoutf8(parts[0]))

    const parsedJwtHeader = JWTHeaderSchema.safeParse(headerClaims);
    if (!parsedJwtHeader.success) {
      throw new SignalingError(SignalingErrorCodes.DECODE_ERROR, `Cannot decode the JWT Header ${JSON.stringify(headerClaims)}`);
    }
    return parsedJwtHeader.data.kid;
  }

  async signMessage(msg: JSONValue): Promise<ProtocolSigningMessage> {
    if (this.nextMessageSignSeq !== 0 && this.remoteNonce === undefined) {
      throw new Error("Cannot sign the message with sequence number > 1, as we have not yet received a valid message from the remote peer.");
    }

    if (this.myNonce === undefined) {
      try {
        this.myNonce = uuidv4();
      } catch (e) {
        console.error("Cannot generate a nonce for the JWTMessageSigner, this is likely due to a missing crypto provider in the environment. In react native this can probably be fixed by installing the package 'react-native-get-random-values'.");
        throw e;
      }
    }

    const seq = this.nextMessageSignSeq;
    this.nextMessageSignSeq++;

    const header: JWTHeader = { alg: "HS256", typ: "JWT", kid: this.keyId };
    const payload: JWTClaims = {
      message: msg,
      messageSeq: seq,
      signerNonce: this.myNonce,
      verifierNonce: this.remoteNonce ? this.remoteNonce : undefined
    };
    const signed = rs.KJUR.jws.JWS.sign("HS256", JSON.stringify(header), JSON.stringify(payload), { "utf8": this.sharedSecret });
    return  { "type": ProtocolSigningMessageTypes.JWT, jwt: signed };
  }

  async verifyMessage(message: JSONValue): Promise<JSONValue> {
    const signingMessageRes = ProtocolSigningMessageSchema.safeParse(message);
    if (!signingMessageRes.success) {
      throw new SignalingError(SignalingErrorCodes.DECODE_ERROR, "Failed to decode the message.");
    }
    const signingMessage = signingMessageRes.data;

    if (signingMessage.type !== ProtocolSigningMessageTypes.JWT) {
      throw new SignalingError(SignalingErrorCodes.VERIFICATION_ERROR, `Expected a JWT signed message but got a signing message of type ${signingMessage.type}.`);
    }
    const jwtMessage = signingMessage;
    const token = jwtMessage.jwt;
    const verified = rs.KJUR.jws.JWS.verifyJWT(token, { "utf8": this.sharedSecret }, { alg: ["HS256"] })
    if (!verified) {
      throw new SignalingError(SignalingErrorCodes.VERIFICATION_ERROR, "The JWT token could not be verified. A possible reason can be a mismatch in the used shared secrets.");
    }
    const parts = token.split(".");
    if (parts.length < 3) {
      throw new SignalingError(SignalingErrorCodes.DECODE_ERROR, "The provided JWT token does not contain two dots.");
    }

    let claims;
    try {
      claims = rs.KJUR.jws.JWS.readSafeJSONString(rs.b64utoutf8(parts[1]))
    } catch (e) {
      throw new SignalingError(SignalingErrorCodes.DECODE_ERROR, "Cannot decode the JWT claims.", e);
    }
    const parsedClaims = JWTClaimsSchema.safeParse(claims);
    if (!parsedClaims.success) {
      throw new SignalingError(SignalingErrorCodes.DECODE_ERROR, `The JWT claims could not be parsed: ${parsedClaims.error}.`)
    }
    if (parsedClaims.data.messageSeq !== this.nextMessageVerifySeq) {
      throw new SignalingError(SignalingErrorCodes.VERIFICATION_ERROR, "The message sequence number does not match the expected sequence number.");
    }

    if (parsedClaims.data.messageSeq === 0) {
      this.remoteNonce = parsedClaims.data.signerNonce;
    } else {
      if (this.remoteNonce !== parsedClaims.data.signerNonce) {
        throw new SignalingError(SignalingErrorCodes.VERIFICATION_ERROR, "The value of messageSignerNonce does not match the expected value for the session.");
      }
      if (this.myNonce !== parsedClaims.data.verifierNonce) {
        throw new SignalingError(SignalingErrorCodes.VERIFICATION_ERROR, "The value of messageVerifierNonce does not match the expected value for the session.");
      }
    }

    // the message is varified, increase the expected sequence number.
    this.nextMessageVerifySeq++;

    return parsedClaims.data.message;
  }
}
