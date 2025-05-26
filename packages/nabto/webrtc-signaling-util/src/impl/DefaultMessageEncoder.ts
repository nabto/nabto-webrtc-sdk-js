import { JSONValue } from "@nabto/webrtc-signaling-common";
import { z } from "zod";
import { SignalingCandidate, SignalingDescription, WebrtcSignalingMessageType } from "../MessageTransport";

export enum SignalingMessageType {
  SETUP_REQUEST = "SETUP_REQUEST",
  SETUP_RESPONSE = "SETUP_RESPONSE"
}

/**
 * Format of a create request. This request only contains its type.
 */
type SignalingCreateRequest = {
  type: SignalingMessageType.SETUP_REQUEST,
}
/**
 * Format of the response to a create request.
 */
type SignalingCreateResponse = {
  type: SignalingMessageType.SETUP_RESPONSE,
  iceServers?: RTCIceServer[],
}

export type SignalingMessage =
  SignalingDescription |
  SignalingCandidate |
  SignalingCreateRequest |
  SignalingCreateResponse;


const ProtocolDescriptionTypes = [
  "answer",
  "offer",
  "pranswer",
  "rollback",
] as const;

const ProtocolDescriptionSchema = z.object({
  type: z.literal(WebrtcSignalingMessageType.DESCRIPTION),
  description: z.object({
    type: z.enum(ProtocolDescriptionTypes),
    sdp: z.string()
  }),
});


const ProtocolCandidateSchema = z.object({
  type: z.literal(WebrtcSignalingMessageType.CANDIDATE),
  candidate: z.object({
    candidate: z.string(),
    sdpMid: z.optional(z.string()).nullable(),
    sdpMLineIndex: z.optional(z.number()).nullable(),
    usernameFragment: z.optional(z.string()).nullable()
  }),
});

const ProtocolCreateRequestSchema = z.object({
  type: z.literal(SignalingMessageType.SETUP_REQUEST),
});

const ProtocolCreateResponseSchema = z.object({
  type: z.literal(SignalingMessageType.SETUP_RESPONSE),
  iceServers: z.optional(z.array(z.object({
    credential: z.optional(z.string()).nullable().transform((val) => (val === null)?undefined:val),
    urls: z.array(z.string()),
    username: z.optional(z.string()).nullable().transform((val) => (val === null)?undefined:val)
  }))).nullable().transform((val) => (val === null)?undefined:val)
});

/*
* This union transforms signaling messages from the network protocol to the
* internal typescript format which is compliant with the DOM.
*/
const ProtocolSignalingMessageToSignalingMessage = z.union([ProtocolDescriptionSchema, ProtocolCandidateSchema, ProtocolCreateRequestSchema, ProtocolCreateResponseSchema]);

type ProtocolUnion = z.infer<typeof ProtocolSignalingMessageToSignalingMessage>

const SignalingMessageToProtocolSignalingMessage = z.union([
  z.object({
    type: z.literal(WebrtcSignalingMessageType.DESCRIPTION),
    description: z.object({
      type: z.enum(ProtocolDescriptionTypes),
      sdp: z.string()
    })
  }),
  z.object({
    type: z.literal(WebrtcSignalingMessageType.CANDIDATE),
    candidate: z.object({
      candidate: z.string(),
      sdpMid: z.optional(z.string()).nullable(),
      sdpMLineIndex: z.optional(z.number()).nullable(),
      usernameFragment: z.optional(z.string()).nullable()
    }),
  }),
  z.object({
    type: z.literal(SignalingMessageType.SETUP_REQUEST),
  }),
  z.object({
    type: z.literal(SignalingMessageType.SETUP_RESPONSE),
    iceServers: z.optional(z.array(z.object({
      credential: z.optional(z.string()),
      //urls: z.preprocess((val) => (typeof val === "string") ? [val] : val, z.array(z.string())),
      urls: z.union([z.string().transform((val) => [val]), z.array(z.string()) ] ),
      username: z.optional(z.string())
    })))
  })
])


/**
 * Utility which can be used to encode/decode WebRTC signaling messages.
 */
export class DefaultMessageEncoder {

  /**
   * Encode a SignalingMessage to send on a signaling channel.
   *
   * @param message Message to encode
   * @returns The encoded message
   */
  encodeMessage(message: SignalingMessage): ProtocolUnion {
    return SignalingMessageToProtocolSignalingMessage.parse(message);
  }

  /**
   * Decode a string message into a SignalingMessage.
   *
   * @param msg Message to decode
   * @returns Decoded SignalingMessage
   * @throws Error if parsing failed
   */
  decodeMessage(msg: JSONValue): SignalingMessage {
    return ProtocolSignalingMessageToSignalingMessage.parse(msg);
  }
}
