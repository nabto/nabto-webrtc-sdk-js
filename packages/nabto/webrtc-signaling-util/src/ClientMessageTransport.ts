import { SignalingClient } from "@nabto/webrtc-signaling-client";
import { ClientMessageTransportImpl } from './impl/ClientMessageTransportImpl'
import { MessageTransport } from "./MessageTransport";


/**
 * Security modes the default transport can use
 *
 *  - SHARED_SECRET: Use a shared secret to sign messages as JWT
 *  - NONE: Do not sign messages at all.
 */
export enum ClientMessageTransportSecurityMode {
  SHARED_SECRET,
  NONE
}

/**
 * Options needed to construct the default transport
 */
export interface ClientMessageTransportOptions {
  /**
   * The security mode the MessageTransport should use
   */
  securityMode: ClientMessageTransportSecurityMode;

  /**
   * The shared secret to use if the security mode is SHARED_SECRET.
   */
  sharedSecret?: string;

  /**
   * The Key ID of the shared secret if the security mode is SHARED_SECRET.
   */
  keyId?: string;
}

/**
 * Create a default message transport for a client application.
 *
 * @param client The SignalingClient to use
 * @param options The options to use
 * @returns The created MessageTransport object
 */
export function createClientMessageTransport(client: SignalingClient, options: ClientMessageTransportOptions): MessageTransport {
  return ClientMessageTransportImpl.create(client, options);
}
