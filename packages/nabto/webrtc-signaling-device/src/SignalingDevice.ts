import { SignalingDeviceImpl } from "./impl/SignalingDeviceImpl";
import { SignalingChannel } from "@nabto/webrtc-signaling-common";
import { SignalingConnectionState } from "@nabto/webrtc-signaling-common";
import { SignalingConnectionStateChanges } from "@nabto/webrtc-signaling-common/src/SignalingConnectionState";

/**
 * Options for creating a SignalingDevice.
 */
export interface SignalingDeviceOptions {
  /**
   * Optional URL for the signaling service.
   */
  endpointUrl?: string,
  /**
   * The product ID to use. (eg. wp-abcdefghi)
   */
  productId: string,
  /**
   * The device id to use. (eg. wd-jklmnopqr)
   */
  deviceId: string,

  /**
   * The token generator is called each time a new access token is needed for
   * either connections to the signaling service or retrieval of iceServers.
   */
  tokenGenerator: () => Promise<string>
}

/**
 * Interface representing the WebSocket connection to the backend clients can use to create a signaling channel to the device
 */
export interface SignalingDevice extends SignalingConnectionStateChanges {
  /**
   * Called when a new signaling channel is made. This happens when the device
   * receives an initial message from a new channelId.
   *
   * @param channel  The created signaling channel.
   * @param authorized  True if the client has been authorized to connect to the
   * device with centralized access control.
   * @returns
   */
  onNewSignalingChannel?: (channel: SignalingChannel, authorized: boolean) => Promise<void>;

  /**
    * Return a list of IceServers, the token for the request is created by the
    * tokenGenerator which is provided in the options.
    *
    * @returns Promise resolving to a list of ICE servers
    */
  getIceServers(): Promise<Array<RTCIceServer>>;

  /**
   * Close the signaling connection and related resources.
   */
  close(): void;

  /**
   * If we detect that the WebRTC connection state goes to conncetionState.disconnected, instruct the
   * signaling to check if it is still alive.
   *
   * If the signaling was dead and reconnects the "connectionreconnect" event will be called.
   */
  checkAlive(): void;

  /**
   * Signaling Service Connection State
   *
   * The state between this peer and the signaling service. The connection to
   * the signaling service can be Connected, while the other peer is still
   * offline.
   */
  connectionState: SignalingConnectionState;

  /**
   * Add listener for connection state changes.
   * @param target should be "connectionstatechange".
   * @param f the callback function to invoke.
   */
  on(target: "connectionstatechange", f: () => void): void;

  /**
   * Remove listener for connection state changes.
   * @param target should be "connectionstatechange".
   * @param f the callback function to remove.
   */
  off(target: "connectionstatechange", f: () => void): void;

  /**
   * Add a listener invoked when the signaling connection reconnects.
   *
   * @param target should be "connectionreconnect".
   * @param f the callback function to invoke.
   */
  on(target: "connectionreconnect", f: () => void): void;

  /**
   * Remove a connection reconnect listener.
   * @param target should be "connectionreconnect".
   * @param f the callback function to remove.
   */
  off(target: "connectionreconnect", f: () => void): void;
}

/**
 * Create a SignalingDevice.
 *
 * @param options Options used for the signaling device.
 * @returns The created SignalingDevice.
 */
export function createSignalingDevice(options: SignalingDeviceOptions) : SignalingDevice {
  return new SignalingDeviceImpl(options);
}
