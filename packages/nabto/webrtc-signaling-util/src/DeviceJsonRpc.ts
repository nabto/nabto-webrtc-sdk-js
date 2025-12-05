import { DeviceJsonRpcImpl, HttpRequestHandler, HttpServiceConfig } from './impl/DeviceJsonRpcImpl';

export type { HttpRequestHandler, HttpServiceConfig } from './impl/DeviceJsonRpcImpl';

/**
 * Interface for device-side JSON-RPC operations
 */
export interface DeviceJsonRpc {
  /**
   * Waits for the data channel to be open and ready
   */
  waitForOpen(): Promise<void>;

  /**
   * Closes the data channel
   */
  close(): void;

  /**
   * Gets the current data channel
   */
  getDataChannel(): RTCDataChannel;
}

/**
 * Creates a device-side JSON-RPC HTTP proxy over WebRTC data channels
 *
 * @param dataChannel The RTCDataChannel to use for JSON-RPC communication
 * @param handler The handler for processing HTTP requests
 * @returns A DeviceJsonRpc instance
 */
export function createDeviceJsonRpc(
  dataChannel: RTCDataChannel,
  handler: HttpRequestHandler
): DeviceJsonRpc {
  return new DeviceJsonRpcImpl(dataChannel, handler);
}
