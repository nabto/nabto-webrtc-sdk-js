import type { HttpRequestParams, HttpResponse } from '../JsonRpcTypes';
import type { HttpRequestHandler } from './DeviceJsonRpcImpl';

export interface HttpServiceMapping {
  name: string;
  description?: string;
  baseUrl: string;
}

export interface DefaultHttpRequestHandlerOptions {
  /**
   * Mappings from service names to HTTP base URLs
   * Example: { name: 'api', baseUrl: 'http://localhost:8080' }
   */
  services: HttpServiceMapping[];
}

/**
 * Default HTTP request handler that makes actual HTTP requests to configured services
 */
export class DefaultHttpRequestHandler implements HttpRequestHandler {
  private serviceMap: Map<string, HttpServiceMapping>;

  constructor(options: DefaultHttpRequestHandlerOptions) {
    this.serviceMap = new Map(
      options.services.map(s => [s.name, s])
    );
  }

  async onRequest(params: HttpRequestParams): Promise<HttpResponse> {
    const service = this.serviceMap.get(params.service);
    if (!service) {
      const error = new Error(`Service not found: ${params.service}`) as Error & { code: number };
      error.code = -32002; // Custom error code for service not found
      throw error;
    }

    // Construct full URL
    const url = `${service.baseUrl}${params.target}`;

    // Decode body if present
    const body = params.body ? atob(params.body) : undefined;

    try {
      // Make HTTP request
      const response = await fetch(url, {
        method: params.method,
        headers: params.headers,
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

  onCancel?(_requestId: string | number): void {
    // TODO: Implement request cancellation using AbortController
    // For now, this is a no-op
  }
}
