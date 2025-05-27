import { SignalingChannel } from "@nabto/webrtc-signaling-common";
import { SignalingClient } from "@nabto/webrtc-signaling-client";
import { SignalingDevice } from "@nabto/webrtc-signaling-device";
import { ClientMessageTransportImpl } from './impl/ClientMessageTransportImpl'
import { DefaultMessageTransportDeviceImpl } from './impl/DeviceMessageTransportImpl'
import { MessageTransport } from "./MessageTransport";


/**
 * Security mode the device transport can use
 *
 *  - SHARED_SECRET: Use a shared secret to sign messages as JWT
 *  - NONE: Do not sign messages at all.
 */
export enum DeviceMessageTransportSecurityMode {
  SHARED_SECRET,
  NONE
}

export interface DeviceMessageTransportOptions {
  /**
   * The security mode the use for the device
   */
  securityMode: DeviceMessageTransportSecurityMode;

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
export function createDeviceMessageTransport(device: SignalingDevice, channel: SignalingChannel, options: DeviceMessageTransportOptions): MessageTransport {
  return DefaultMessageTransportDeviceImpl.create(device, channel, options);
}
