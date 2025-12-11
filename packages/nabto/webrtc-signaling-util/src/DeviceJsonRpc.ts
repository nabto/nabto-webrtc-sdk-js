import { DeviceJsonRpcImpl, HttpRequestHandler, HttpServiceConfig } from './impl/DeviceJsonRpcImpl';

export type { HttpRequestHandler, HttpServiceConfig } from './impl/DeviceJsonRpcImpl';

/**
 * Interface for device-side JSON-RPC operations
 */
export interface DeviceJsonRpc {
  /**
   * Closes the data channel
   */
  close(): void;

  /**
   * Gets the current data channel
   */
  getDataChannel(): RTCDataChannel;

  /**
   * Adds a new HTTP service configuration
   * @param service The HTTP service configuration to add
   * @throws Error if a service with the same name already exists
   */
  addService(service: HttpServiceConfig): void;
}

/**
 * Creates a device-side JSON-RPC HTTP proxy over WebRTC data channels
 *
 * @param dataChannel The RTCDataChannel to use for JSON-RPC communication
 * @param services Array of HttpServiceConfig objects to configure which services the device can access
 * @param handler Optional custom HttpRequestHandler for full control over request handling.
 *                If not provided, a default handler will be used that makes HTTP requests to the configured services.
 * @returns A DeviceJsonRpc instance
 *
 * @example
 * // Configure services with base URLs (uses default fetch-based handler)
 * const deviceJsonRpc = createDeviceJsonRpc(dataChannel, [
 *   { name: 'api', baseUrl: 'http://localhost:8080' },
 *   { name: 'auth', baseUrl: 'https://auth.example.com', auth: { username: 'user', password: 'pass' } }
 * ]);
 *
 * @example
 * // Use custom handler with services
 * const deviceJsonRpc = createDeviceJsonRpc(dataChannel, [
 *   { name: 'api', baseUrl: 'http://localhost:8080' }
 * ], customHandler);
 */
export function createDeviceJsonRpc(
  dataChannel: RTCDataChannel,
  services: HttpServiceConfig[],
  handler?: HttpRequestHandler
): DeviceJsonRpc {
  return new DeviceJsonRpcImpl(dataChannel, services, handler);
}
