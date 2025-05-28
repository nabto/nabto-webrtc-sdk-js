import { SignalingClient } from "@nabto/webrtc-signaling-client";
import { ClientMessageTransportImpl } from './impl/ClientMessageTransportImpl'
import { MessageTransport } from "./MessageTransport";


/**
 * Security modes the client message transport can use
 *
 *  - SHARED_SECRET: Use a shared secret to sign messages as JWT
 *  - NONE: Do not sign messages at all.
 */
export enum ClientMessageTransportSecurityMode {
  SHARED_SECRET,
  NONE
}

export interface ClientMessageTransportSharedSecretOptions {
  /**
   * The security mode the MessageTransport should use
   */
  securityMode: ClientMessageTransportSecurityMode.SHARED_SECRET,
  /**
 * The shared secret to use if the security mode is SHARED_SECRET.
 */
  sharedSecret: string;

  /**
   * The key id of the shared secret if the security mode is SHARED_SECRET.
   *
   * The key id is used to distinguish multiple keys on the device side. If the
   * system only ever has a single shared secret it is possible to omit the
   * keyId, on all systems with multiple shared secrets, it is recommended to
   * assign a keyId to each shared secret in use.
   */
  keyId?: string;
}


export interface ClientMessageTransportNoneOptions {
  /**
   * The security mode the MessageTransport should use
   */
  securityMode: ClientMessageTransportSecurityMode.NONE,
}

export type ClientMessageTransportOptions = ClientMessageTransportSharedSecretOptions | ClientMessageTransportNoneOptions;

/**
 * Create a message transport for a client application.
 *
 * @param client The SignalingClient to use
 * @param options The options to use
 * @returns The created MessageTransport object
 */
export function createClientMessageTransport(client: SignalingClient, options: ClientMessageTransportOptions): MessageTransport {
  return ClientMessageTransportImpl.create(client, options);
}
