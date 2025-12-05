import type {
  JsonRpcRequest,
  JsonRpcResponse,
  HttpRequestParams,
  HttpResponse,
  HttpService,
  ListServicesResult
} from '../JsonRpcTypes';

/**
 * HTTP service configuration
 */
export interface HttpServiceConfig extends HttpService {
  protocol: 'http' | 'https';
  port: number;
  address: string;
}

/**
 * Handler for HTTP requests received from the client
 */
export interface HttpRequestHandler {
  /**
   * Called when an http.request is received
   * @param params The request parameters
   * @returns Promise resolving to the HTTP response
   */
  onRequest(params: HttpRequestParams): Promise<HttpResponse>;

  /**
   * Called when an http.listServices request is received
   * @returns Promise resolving to the list of services
   */
  onListServices(): Promise<ListServicesResult>;

  /**
   * Called when an http.cancel notification is received
   * @param requestId The ID of the request to cancel
   */
  onCancel?(requestId: string | number): void;
}

/**
 * Device-side JSON-RPC HTTP proxy over WebRTC data channels
 */
export class DeviceJsonRpcImpl {
  constructor(
    private dataChannel: RTCDataChannel,
    private handler: HttpRequestHandler
  ) {
    // Set up event listeners
    this.dataChannel.addEventListener('error', (event) => {
      console.error('DeviceJsonRpc data channel error:', event);
    });

    this.dataChannel.addEventListener('message', (event) => {
      this.handleMessage(event.data);
    });
  }

  /**
   * Waits for the data channel to be open and ready
   */
  public waitForOpen(): Promise<void> {
    if (this.dataChannel.readyState === 'open') {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for data channel to open'));
      }, 30000);

      const onOpen = () => {
        clearTimeout(timeout);
        this.dataChannel.removeEventListener('error', onError);
        resolve();
      };

      const onError = (event: Event) => {
        clearTimeout(timeout);
        this.dataChannel.removeEventListener('open', onOpen);
        reject(new Error('Data channel failed to open'));
      };

      this.dataChannel.addEventListener('open', onOpen, { once: true });
      this.dataChannel.addEventListener('error', onError, { once: true });
    });
  }

  /**
   * Closes the data channel
   */
  public close(): void {
    this.dataChannel.close();
  }

  /**
   * Gets the current data channel
   */
  public getDataChannel(): RTCDataChannel {
    return this.dataChannel;
  }

  private async handleMessage(data: string): Promise<void> {
    try {
      const request = JSON.parse(data) as JsonRpcRequest;

      // Handle notifications (no id field)
      if (request.id === undefined || request.id === null) {
        this.handleNotification(request);
        return;
      }

      // Handle requests (with id field)
      try {
        let result: unknown;

        switch (request.method) {
          case 'http.request':
            result = await this.handler.onRequest(request.params as HttpRequestParams);
            break;

          case 'http.listServices':
            result = await this.handler.onListServices();
            break;

          default:
            this.sendErrorResponse(request.id, -32601, 'Method not found');
            return;
        }

        this.sendSuccessResponse(request.id, result);
      } catch (error) {
        const err = error as Error & { code?: number; data?: unknown };
        this.sendErrorResponse(
          request.id,
          err.code ?? -32603,
          err.message,
          err.data
        );
      }
    } catch (error) {
      console.error('Failed to parse JSON-RPC request:', error);
      this.sendErrorResponse(null, -32700, 'Parse error');
    }
  }

  private handleNotification(request: JsonRpcRequest): void {
    if (request.method === 'http.cancel') {
      const params = request.params as { id: string | number };
      if (this.handler.onCancel) {
        this.handler.onCancel(params.id);
      }
    }
  }

  private sendSuccessResponse(id: string | number, result: unknown): void {
    const response: JsonRpcResponse = {
      jsonrpc: '2.0',
      result,
      id
    };

    this.send(response);
  }

  private sendErrorResponse(
    id: string | number | null,
    code: number,
    message: string,
    data?: unknown
  ): void {
    const response: JsonRpcResponse = {
      jsonrpc: '2.0',
      error: {
        code,
        message,
        data
      },
      id
    };

    this.send(response);
  }

  private send(response: JsonRpcResponse): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.error('Cannot send response: data channel is not open');
      return;
    }

    const json = JSON.stringify(response);
    this.dataChannel.send(json);
  }
}
