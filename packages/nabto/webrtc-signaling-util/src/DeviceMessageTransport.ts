import { SignalingChannel } from "@nabto/webrtc-signaling-common";
import { SignalingDevice } from "@nabto/webrtc-signaling-device";
import { DeviceMessageTransportImpl } from './impl/DeviceMessageTransportImpl'
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

export interface DeviceMessageTransportSharedSecretOptions {
  /**
   * The security mode the use for the device
   */
  securityMode: DeviceMessageTransportSecurityMode.SHARED_SECRET;

  /**
   * If the security mode is set to shared secret, a shared secret callback must
   * be provided. The shared secret callback is invoked once for each channel
   * when the channel needs to find a shared secret to use for the session.
   * @param keyId  The keyId from the signed message. This can be undefined if
   *               no keyId was in the Token.
   * @returns  A shared secret which is used to sign and verify messages on the
   *           channel.
   */
  sharedSecretCallback: (keyId?: string) => Promise<string>;
}

export interface DeviceMessageTransportNoneOptions {
  /**
   * The security mode the use for the device
   */
  securityMode: DeviceMessageTransportSecurityMode.NONE;
}

export type DeviceMessageTransportOptions = DeviceMessageTransportSharedSecretOptions | DeviceMessageTransportNoneOptions

/**
 * Create a message transport for a device application.
 *
 * @param device The SignalingDevice to use
 * @param channel The SignalingChannel to send/receive on.
 * @param options The options to use
 * @returns The created MessageTransport object
 */
export function createDeviceMessageTransport(device: SignalingDevice, channel: SignalingChannel, options: DeviceMessageTransportOptions): MessageTransport {
  return DeviceMessageTransportImpl.create(device, channel, options);
}
