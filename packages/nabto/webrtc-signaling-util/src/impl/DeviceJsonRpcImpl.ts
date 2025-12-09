import type {
  JsonRpcRequest,
  JsonRpcResponse,
  HttpRequestParams,
  HttpResponse,
  HttpService,
  ListServicesResult
} from '../JsonRpcTypes';

/**
 * HTTP service configuration with base URL and optional authentication
 */
export interface HttpServiceConfig {
  /**
   * Service name that matches the service field in JSON-RPC requests
   */
  name: string;

  /**
   * Base URL for the service (e.g., 'http://localhost:8080' or 'https://api.example.com')
   * The target path will be appended to this URL
   */
  baseUrl: string;

  /**
   * Optional description of the service
   */
  description?: string;

  /**
   * Optional authentication configuration
   */
  auth?: {
    /**
     * Authentication type
     */
    type: 'bearer' | 'basic' | 'custom';

    /**
     * For bearer tokens
     */
    token?: string;

    /**
     * For basic auth
     */
    username?: string;
    password?: string;

    /**
     * For custom auth - custom headers to add to requests
     */
    headers?: Record<string, string>;
  };
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
   * Called when an http.cancel notification is received
   * @param requestId The ID of the request to cancel
   */
  onCancel?(requestId: string | number): void;
}

/**
 * Default HTTP request handler that uses fetch to make HTTP requests
 * with service configuration support
 */
function createDefaultHttpRequestHandler(services: HttpServiceConfig[] = []): HttpRequestHandler {
  // Create a map of service names to configurations
  const serviceMap = new Map(services.map(s => [s.name, s]));

  return {
    async onRequest(params: HttpRequestParams): Promise<HttpResponse> {
      // Find the service configuration
      const serviceConfig = serviceMap.get(params.service);
      if (!serviceConfig) {
        const error = new Error(`Service not found: ${params.service}`) as Error & { code: number };
        error.code = -32002; // Custom error code for service not found
        throw error;
      }

      // Construct full URL by appending target to base URL
      const url = `${serviceConfig.baseUrl}${params.target}`;

      // Decode body if present
      const body = params.body ? atob(params.body) : undefined;

      // Prepare headers
      const headers: Record<string, string> = { ...params.headers };

      // Add authentication headers if configured
      if (serviceConfig.auth) {
        switch (serviceConfig.auth.type) {
          case 'bearer':
            if (serviceConfig.auth.token) {
              headers['Authorization'] = `Bearer ${serviceConfig.auth.token}`;
            }
            break;
          case 'basic':
            if (serviceConfig.auth.username && serviceConfig.auth.password) {
              const credentials = btoa(`${serviceConfig.auth.username}:${serviceConfig.auth.password}`);
              headers['Authorization'] = `Basic ${credentials}`;
            }
            break;
          case 'custom':
            if (serviceConfig.auth.headers) {
              Object.assign(headers, serviceConfig.auth.headers);
            }
            break;
        }
      }

      try {
        // Make HTTP request using fetch
        const response = await fetch(url, {
          method: params.method,
          headers: headers,
          body: body
        });

        // Read response body
        const responseBody = await response.text();

        // Return HTTP response
        return {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseBody ? btoa(responseBody) : undefined
        };
      } catch (error) {
        const err = new Error(`HTTP request failed: ${(error as Error).message}`) as Error & { code: number; data?: unknown };
        err.code = -32603; // Internal error
        err.data = { originalError: (error as Error).message };
        throw err;
      }
    }
  };
}

/**
 * Device-side JSON-RPC HTTP proxy over WebRTC data channels
 */
export class DeviceJsonRpcImpl {
  private handler: HttpRequestHandler;
  private services: HttpServiceConfig[];

  constructor(
    private dataChannel: RTCDataChannel,
    services: HttpServiceConfig[],
    handler?: HttpRequestHandler
  ) {
    this.services = services;

    // Use custom handler if provided, otherwise create default handler
    if (handler) {
      this.handler = handler;
    } else {
      this.handler = createDefaultHttpRequestHandler(services);
    }

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
            // Handle listServices directly using configured services
            result = {
              services: this.services.map(s => ({
                name: s.name,
                description: s.description || `HTTP service at ${s.baseUrl}`
              }))
            };
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
