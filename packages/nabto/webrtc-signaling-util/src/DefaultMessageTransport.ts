import { SignalingChannel } from "@nabto/webrtc-signaling-common";
import { SignalingClient } from "@nabto/webrtc-signaling-client";
import { SignalingDevice } from "@nabto/webrtc-signaling-device";
import { DefaultMessageTransportClientImpl } from './impl/DefaultMessageTransportClientImpl'
import { DefaultMessageTransportDeviceImpl } from './impl/DefaultMessageTransportDeviceImpl'
import { MessageTransport } from "./MessageTransport";


/**
 * Security modes the default transport can use
 *
 *  - SHARED_SECRET: Use a shared secret to sign messages as JWT
 *  - NONE: Do not sign messages at all.
 */
export enum DefaultMessageTransportSecurityModes {
  SHARED_SECRET,
  NONE
}

/**
 * Options needed to construct the default transport
 */
export interface DefaultMessageTransportOptions {
  /**
   * The security mode the MessageTransport should use
   */
  securityMode: DefaultMessageTransportSecurityModes;

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
export function createDefaultMessageTransportClient(client: SignalingClient, options: DefaultMessageTransportOptions): MessageTransport {
  return DefaultMessageTransportClientImpl.create(client, options);
}


export interface DefaultMessageTransportDeviceOptions {
  /**
   * The security mode the use for the device
   */
  securityMode: DefaultMessageTransportSecurityModes;

  /**
   * If the security mode is set to shared secret, a shared secret callback must
   * be provided. The shared secret callback is invoked once for each channel
   * when the channel needs to find a shared secret to use for the session.
   * @param keyId  The keyId from the signed message.
   * @returns  A shared secret which is used to sign and verify messages on the
   * channel.
   */
  sharedSecretCallback?: (keyId: string) => Promise<string>;
}


/**
 * Create a default message transport for a device application.
 *
 * @param device The SignalingDevice to use
 * @param channel The SignalingChannel to send/receive on.
 * @param options The options to use
 * @returns The created MessageTransport object
 */
export function createDefaultMessageTransportDevice(device: SignalingDevice, channel: SignalingChannel, options: DefaultMessageTransportDeviceOptions): MessageTransport {
  return DefaultMessageTransportDeviceImpl.create(device, channel, options);
}
