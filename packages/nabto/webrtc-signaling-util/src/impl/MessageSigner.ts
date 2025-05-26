import { JSONValue, JSONValueSchema } from "@nabto/webrtc-signaling-common";
import { z } from "zod";

/**
 * This defines the Signing layer message protocol:
 *
 * { type: "JWT|NONE",
 *   jwt: string, // jwt with contains a signaling message
 *   none: signalingMessage
 * }
 */

export enum ProtocolSigningMessageTypes {
  JWT = "JWT",
  NONE = "NONE"
}

export const ProtocolSigningMessageNoneSchema = z.object({
  type: z.literal(ProtocolSigningMessageTypes.NONE),
  message: JSONValueSchema
});

export const ProtocolSigningMessageJwtSchema = z.object({
  type: z.literal(ProtocolSigningMessageTypes.JWT),
  jwt: z.string()
});

export const ProtocolSigningMessageSchema = z.union([ProtocolSigningMessageNoneSchema, ProtocolSigningMessageJwtSchema]);

export type ProtocolSigningMessage = z.infer<typeof ProtocolSigningMessageSchema>


/**
 * Interface used to sign and verify messages. This can be used by applications on top of the Nabto SDK to authorize connections and remove trust from the Nabto WebRTC Signaling Service.
 *
 */
export interface MessageSigner {
  /**
   * Sign a message creating a JWT ready to be sent on a Signaling Channel.
   * @param msg The message to sign.
   * @returns Promise resolving with the signed JWT.
   */
  signMessage(msg: JSONValue): Promise<ProtocolSigningMessage>;

  /**
   * Verify and decode a signed message. This verifies and decodes a JWT and returns the payload.
   *
   * @param message The protocol signing message device and verify.
   * @returns Promise resolving with JWT message payload.
   */
  verifyMessage(message: JSONValue): Promise<JSONValue>;
}

export const JWTClaimsSchema = z.object({
  message: JSONValueSchema,
  messageSeq: z.number(),
  signerNonce: z.string(),
  verifierNonce: z.optional(z.string())
});

export const JWTHeaderSchema = z.object(
  {
    kid: z.optional(z.string()),
    alg: z.string(),
    typ: z.optional(z.string())

  }
)

export type JWTHeader = z.infer<typeof JWTHeaderSchema>
export type JWTClaims = z.infer<typeof JWTClaimsSchema>
