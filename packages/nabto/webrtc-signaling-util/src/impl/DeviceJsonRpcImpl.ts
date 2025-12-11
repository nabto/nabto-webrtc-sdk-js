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
   * Optional basic authentication
   */
  auth?: {
    username: string;
    password: string;
  };
}

/**
 * Handler for HTTP requests received from the client
 */
export interface HttpRequestHandler {
  /**
   * Called when an http.request is received
   * @param params The request parameters
   * @param serviceConfig The service configuration for the requested service
   * @returns Promise resolving to the HTTP response
   */
  onRequest(params: HttpRequestParams, serviceConfig: HttpServiceConfig): Promise<HttpResponse>;

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
function createDefaultHttpRequestHandler(): HttpRequestHandler {
  return {
    async onRequest(params: HttpRequestParams, serviceConfig: HttpServiceConfig): Promise<HttpResponse> {
      // Construct full URL by appending target to base URL
      const url = `${serviceConfig.baseUrl}${params.target}`;

      // Decode body if present
      const body = params.body ? atob(params.body) : undefined;

      // Prepare headers
      const headers: Record<string, string> = { ...params.headers };

      // Add basic auth header if configured
      if (serviceConfig.auth) {
        const credentials = btoa(`${serviceConfig.auth.username}:${serviceConfig.auth.password}`);
        headers['Authorization'] = `Basic ${credentials}`;
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
  private serviceMap: Map<string, HttpServiceConfig>;

  constructor(
    private dataChannel: RTCDataChannel,
    services: HttpServiceConfig[],
    handler?: HttpRequestHandler
  ) {
    this.services = services;
    this.serviceMap = new Map(services.map(s => [s.name, s]));

    // Use custom handler if provided, otherwise create default handler
    this.handler = handler ?? createDefaultHttpRequestHandler();

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
   * Private helper method - responses are automatically queued until channel is open
   */
  private waitForOpen(): Promise<void> {
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

  /**
   * Adds a new HTTP service configuration
   */
  public addService(service: HttpServiceConfig): void {
    // Check if service already exists
    if (this.serviceMap.has(service.name)) {
      throw new Error(`Service with name '${service.name}' already exists`);
    }

    // Add the service to the array and map
    this.services.push(service);
    this.serviceMap.set(service.name, service);
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
          case 'http.request': {
            const params = request.params as HttpRequestParams;

            // Find the service configuration
            const serviceConfig = this.serviceMap.get(params.service);
            if (!serviceConfig) {
              const error = new Error(`Service not found: ${params.service}`) as Error & { code: number };
              error.code = -32002; // Custom error code for service not found
              throw error;
            }

            result = await this.handler.onRequest(params, serviceConfig);
            break;
          }

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

  private async send(response: JsonRpcResponse): Promise<void> {
    // Wait for channel to open if needed
    await this.waitForOpen();

    const json = JSON.stringify(response);
    this.dataChannel.send(json);
  }
}
