import type {
  JsonRpcRequest,
  JsonRpcResponse,
  HttpRequestParams,
  HttpResponse,
  ListServicesResult
} from '../JsonRpcTypes';

/**
 * Client for sending HTTP requests over WebRTC data channels using JSON-RPC 2.0
 */
export class ClientJsonRpcImpl {
  private pendingRequests = new Map<string | number, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }>();
  private nextRequestId = 1;

  constructor(private dataChannel: RTCDataChannel) {
    // Set up event listeners
    this.dataChannel.addEventListener('close', () => {
      this.handleClose();
    });

    this.dataChannel.addEventListener('message', (event) => {
      this.handleMessage(event.data);
    });
  }

  /**
   * Waits for the data channel to be open and ready
   * Returns a promise that resolves when the channel is open
   */
  public waitForOpen(): Promise<void> {
    if (this.dataChannel.readyState === 'open') {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const onOpen = () => {
        this.dataChannel.removeEventListener('error', onError);
        resolve();
      };

      const onError = (event: Event) => {
        this.dataChannel.removeEventListener('open', onOpen);
        reject(new Error('Data channel failed to open'));
      };

      this.dataChannel.addEventListener('open', onOpen, { once: true });
      this.dataChannel.addEventListener('error', onError, { once: true });
    });
  }

  /**
   * Closes the data channel and rejects all pending requests
   */
  public close(): void {
    this.dataChannel.close();
    this.handleClose();
  }

  /**
   * Lists available HTTP services on the remote peer
   */
  public async listServices(): Promise<ListServicesResult> {
    const id = this.nextRequestId++;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'http.listServices',
      id
    };

    return this.sendRequest(request) as Promise<ListServicesResult>;
  }

  /**
   * Sends an HTTP request to the specified service
   */
  public async request(params: HttpRequestParams): Promise<HttpResponse> {
    const id = this.nextRequestId++;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'http.request',
      params,
      id
    };

    return this.sendRequest(request) as Promise<HttpResponse>;
  }

  /**
   * Cancels a pending HTTP request by its ID
   */
  public cancel(requestId: string | number): void {
    const notification: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'http.cancel',
      params: { id: requestId }
    };

    this.send(notification);

    // Remove from pending requests
    const pending = this.pendingRequests.get(requestId);
    if (pending) {
      pending.reject(new Error('Request cancelled by client'));
      this.pendingRequests.delete(requestId);
    }
  }

  /**
   * Gets the current data channel
   */
  public getDataChannel(): RTCDataChannel | null {
    return this.dataChannel;
  }

  private sendRequest(request: JsonRpcRequest): Promise<unknown> {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      return Promise.reject(new Error('Data channel is not open'));
    }

    if (request.id === undefined) {
      // Notification, no response expected
      this.send(request);
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(request.id!, { resolve, reject });
      this.send(request);
    });
  }

  private send(message: JsonRpcRequest): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('Data channel is not open');
    }

    const json = JSON.stringify(message);
    this.dataChannel.send(json);
  }

  private handleMessage(data: string): void {
    try {
      const response = JSON.parse(data) as JsonRpcResponse;

      if (response.id === null || response.id === undefined) {
        // Notification response, ignore
        return;
      }

      const pending = this.pendingRequests.get(response.id);
      if (!pending) {
        return;
      }

      this.pendingRequests.delete(response.id);

      if (response.error) {
        const error = new Error(response.error.message) as Error & { code: number; data?: unknown };
        error.code = response.error.code;
        error.data = response.error.data;
        pending.reject(error);
      } else {
        pending.resolve(response.result);
      }
    } catch (error) {
      console.error('Failed to parse JSON-RPC response:', error);
    }
  }

  private handleClose(): void {
    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests.entries()) {
      pending.reject(new Error('Data channel closed'));
    }
    this.pendingRequests.clear();
  }
}
