import { ClientJsonRpcImpl } from './impl/ClientJsonRpcImpl';

/**
 * Interface for JSON-RPC client operations
 */
export interface ClientJsonRpc {
  /**
   * Waits for the data channel to be open and ready
   * Returns a promise that resolves when the channel is open
   */
  waitForOpen(): Promise<void>;

  /**
   * Closes the data channel and rejects all pending requests
   */
  close(): void;

  /**
   * Lists available HTTP services on the remote peer
   */
  listServices(): Promise<import('./JsonRpcTypes').ListServicesResult>;

  /**
   * Sends an HTTP request to the specified service
   */
  request(params: import('./JsonRpcTypes').HttpRequestParams): Promise<import('./JsonRpcTypes').HttpResponse>;

  /**
   * Cancels a pending HTTP request by its ID
   */
  cancel(requestId: string | number): void;

  /**
   * Gets the current data channel
   */
  getDataChannel(): RTCDataChannel;
}

/**
 * Creates a JSON-RPC client for sending HTTP requests over WebRTC data channels
 *
 * @param dataChannel The RTCDataChannel to use for JSON-RPC communication
 * @returns A ClientJsonRpc instance
 */
export function createClientJsonRpc(dataChannel: RTCDataChannel): ClientJsonRpc {
  return new ClientJsonRpcImpl(dataChannel);
}
