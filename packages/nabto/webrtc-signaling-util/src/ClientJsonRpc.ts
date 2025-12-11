import { ClientJsonRpcImpl } from './impl/ClientJsonRpcImpl';
import type { ListServicesResult, HttpRequestParams, HttpResponse } from './JsonRpcTypes';

/**
 * Interface for JSON-RPC client operations
 */
export interface ClientJsonRpc {
  /**
   * Closes the data channel and rejects all pending requests
   */
  close(): void;

  /**
   * Lists available HTTP services on the remote peer
   * Automatically waits for the data channel to open if it's not open yet
   */
  listServices(): Promise<ListServicesResult>;

  /**
   * Sends an HTTP request to the specified service
   * Automatically waits for the data channel to open if it's not open yet
   */
  request(params: HttpRequestParams): Promise<HttpResponse>;

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
