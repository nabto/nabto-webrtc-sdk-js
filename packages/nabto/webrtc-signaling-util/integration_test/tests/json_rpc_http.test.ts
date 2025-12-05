import { test, expect, describe, beforeAll, afterAll } from 'vitest';
import { createDeviceJsonRpc, createClientJsonRpc } from '../../src';
import type { HttpRequestHandler, HttpRequestParams, HttpResponse } from '../../src';

/**
 * Integration tests for JSON-RPC HTTP service
 *
 * These tests verify that the device can invoke the HTTP server through JSON-RPC,
 * both with and without the client in the loop.
 *
 * NOTE: This test requires the integration_test_server to be running.
 * Start it with: cd integration_test_server && bun dev
 */

const INTEGRATION_TEST_SERVER_URL = 'http://localhost:13745';

/**
 * Helper to make HTTP requests to the integration test server
 */
async function makeHttpRequest(
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<HttpResponse> {
  const url = `${INTEGRATION_TEST_SERVER_URL}${path}`;

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const responseBody = await response.text();

  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: responseBody ? btoa(responseBody) : undefined
  };
}

/**
 * Create an HTTP request handler that proxies to the integration test server
 */
function createHttpRequestHandler(): HttpRequestHandler {
  return {
    async onRequest(params: HttpRequestParams): Promise<HttpResponse> {
      // Decode body if present
      const body = params.body ? JSON.parse(atob(params.body)) : undefined;

      // Make the HTTP request to the integration test server
      return await makeHttpRequest(
        params.method,
        params.target,
        body,
        params.headers
      );
    },

    async onListServices() {
      return {
        services: [
          {
            name: 'http-service',
            description: 'Integration test HTTP service'
          }
        ]
      };
    }
  };
}

describe('JSON-RPC HTTP Integration Tests - Device Direct', () => {
  /**
   * Tests where the device directly handles HTTP requests without a client
   */

  test('Device can handle GET request to HTTP service', async () => {
    // Create a mock data channel pair
    class MockDataChannel extends EventTarget {
      readyState: RTCDataChannelState = 'open';
      sentMessages: string[] = [];
      peer: MockDataChannel | null = null;

      send(data: string): void {
        this.sentMessages.push(data);
        if (this.peer) {
          setTimeout(() => {
            this.peer!.dispatchEvent(new MessageEvent('message', { data }));
          }, 0);
        }
      }

      close(): void {
        this.readyState = 'closed';
        this.dispatchEvent(new Event('close'));
      }
    }

    const clientChannel = new MockDataChannel();
    const deviceChannel = new MockDataChannel();
    clientChannel.peer = deviceChannel;
    deviceChannel.peer = clientChannel;

    // Create device JSON-RPC with handler that proxies to integration test server
    const handler = createHttpRequestHandler();
    const deviceJsonRpc = createDeviceJsonRpc(deviceChannel as any, handler);

    // Create client JSON-RPC
    const clientJsonRpc = createClientJsonRpc(clientChannel as any);

    // Make request through JSON-RPC
    const response = await clientJsonRpc.request({
      service: 'http-service',
      method: 'GET',
      target: '/http-service/hello'
    });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');

    const body = JSON.parse(atob(response.body!));
    expect(body.message).toBe('Hello from HTTP service!');
    expect(body.timestamp).toBeDefined();

    // Cleanup
    clientJsonRpc.close();
    deviceJsonRpc.close();
  });

  test('Device can handle POST request with body', async () => {
    class MockDataChannel extends EventTarget {
      readyState: RTCDataChannelState = 'open';
      sentMessages: string[] = [];
      peer: MockDataChannel | null = null;

      send(data: string): void {
        this.sentMessages.push(data);
        if (this.peer) {
          setTimeout(() => {
            this.peer!.dispatchEvent(new MessageEvent('message', { data }));
          }, 0);
        }
      }

      close(): void {
        this.readyState = 'closed';
        this.dispatchEvent(new Event('close'));
      }
    }

    const clientChannel = new MockDataChannel();
    const deviceChannel = new MockDataChannel();
    clientChannel.peer = deviceChannel;
    deviceChannel.peer = clientChannel;

    const handler = createHttpRequestHandler();
    const deviceJsonRpc = createDeviceJsonRpc(deviceChannel as any, handler);
    const clientJsonRpc = createClientJsonRpc(clientChannel as any);

    const testData = { test: 'data', number: 42 };
    const response = await clientJsonRpc.request({
      service: 'http-service',
      method: 'POST',
      target: '/http-service/echo',
      headers: { 'Content-Type': 'application/json' },
      body: btoa(JSON.stringify(testData))
    });

    expect(response.status).toBe(200);

    const body = JSON.parse(atob(response.body!));
    expect(body.echo).toEqual(testData);
    expect(body.receivedAt).toBeDefined();

    clientJsonRpc.close();
    deviceJsonRpc.close();
  });

  test('Device can handle different status codes', async () => {
    class MockDataChannel extends EventTarget {
      readyState: RTCDataChannelState = 'open';
      sentMessages: string[] = [];
      peer: MockDataChannel | null = null;

      send(data: string): void {
        this.sentMessages.push(data);
        if (this.peer) {
          setTimeout(() => {
            this.peer!.dispatchEvent(new MessageEvent('message', { data }));
          }, 0);
        }
      }

      close(): void {
        this.readyState = 'closed';
        this.dispatchEvent(new Event('close'));
      }
    }

    const clientChannel = new MockDataChannel();
    const deviceChannel = new MockDataChannel();
    clientChannel.peer = deviceChannel;
    deviceChannel.peer = clientChannel;

    const handler = createHttpRequestHandler();
    const deviceJsonRpc = createDeviceJsonRpc(deviceChannel as any, handler);
    const clientJsonRpc = createClientJsonRpc(clientChannel as any);

    const response = await clientJsonRpc.request({
      service: 'http-service',
      method: 'GET',
      target: '/http-service/status/404'
    });

    expect(response.status).toBe(404);

    const body = JSON.parse(atob(response.body!));
    expect(body.status).toBe(404);

    clientJsonRpc.close();
    deviceJsonRpc.close();
  });

  test('Device can handle large responses', async () => {
    class MockDataChannel extends EventTarget {
      readyState: RTCDataChannelState = 'open';
      sentMessages: string[] = [];
      peer: MockDataChannel | null = null;

      send(data: string): void {
        this.sentMessages.push(data);
        if (this.peer) {
          setTimeout(() => {
            this.peer!.dispatchEvent(new MessageEvent('message', { data }));
          }, 0);
        }
      }

      close(): void {
        this.readyState = 'closed';
        this.dispatchEvent(new Event('close'));
      }
    }

    const clientChannel = new MockDataChannel();
    const deviceChannel = new MockDataChannel();
    clientChannel.peer = deviceChannel;
    deviceChannel.peer = clientChannel;

    const handler = createHttpRequestHandler();
    const deviceJsonRpc = createDeviceJsonRpc(deviceChannel as any, handler);
    const clientJsonRpc = createClientJsonRpc(clientChannel as any);

    const response = await clientJsonRpc.request({
      service: 'http-service',
      method: 'GET',
      target: '/http-service/large'
    });

    expect(response.status).toBe(200);

    const body = JSON.parse(atob(response.body!));
    expect(body.size).toBe(10000);
    expect(body.data).toHaveLength(10000);

    clientJsonRpc.close();
    deviceJsonRpc.close();
  });

  test('Device can list services', async () => {
    class MockDataChannel extends EventTarget {
      readyState: RTCDataChannelState = 'open';
      sentMessages: string[] = [];
      peer: MockDataChannel | null = null;

      send(data: string): void {
        this.sentMessages.push(data);
        if (this.peer) {
          setTimeout(() => {
            this.peer!.dispatchEvent(new MessageEvent('message', { data }));
          }, 0);
        }
      }

      close(): void {
        this.readyState = 'closed';
        this.dispatchEvent(new Event('close'));
      }
    }

    const clientChannel = new MockDataChannel();
    const deviceChannel = new MockDataChannel();
    clientChannel.peer = deviceChannel;
    deviceChannel.peer = clientChannel;

    const handler = createHttpRequestHandler();
    const deviceJsonRpc = createDeviceJsonRpc(deviceChannel as any, handler);
    const clientJsonRpc = createClientJsonRpc(clientChannel as any);

    const result = await clientJsonRpc.listServices();

    expect(result.services).toHaveLength(1);
    expect(result.services[0].name).toBe('http-service');
    expect(result.services[0].description).toBe('Integration test HTTP service');

    clientJsonRpc.close();
    deviceJsonRpc.close();
  });
});

describe('JSON-RPC HTTP Integration Tests - Without Client', () => {
  /**
   * Tests where we directly invoke the device handler without going through JSON-RPC
   * This verifies the device can successfully communicate with the HTTP server
   */

  test('Device handler can make GET request to integration server', async () => {
    const handler = createHttpRequestHandler();

    const response = await handler.onRequest({
      service: 'http-service',
      method: 'GET',
      target: '/http-service/hello'
    });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');

    const body = JSON.parse(atob(response.body!));
    expect(body.message).toBe('Hello from HTTP service!');
  });

  test('Device handler can make POST request with body', async () => {
    const handler = createHttpRequestHandler();

    const testData = { test: 'value', number: 123 };
    const response = await handler.onRequest({
      service: 'http-service',
      method: 'POST',
      target: '/http-service/echo',
      headers: { 'Content-Type': 'application/json' },
      body: btoa(JSON.stringify(testData))
    });

    expect(response.status).toBe(200);

    const body = JSON.parse(atob(response.body!));
    expect(body.echo).toEqual(testData);
  });

  test('Device handler can handle HTTP errors', async () => {
    const handler = createHttpRequestHandler();

    const response = await handler.onRequest({
      service: 'http-service',
      method: 'GET',
      target: '/http-service/status/500'
    });

    expect(response.status).toBe(500);

    const body = JSON.parse(atob(response.body!));
    expect(body.status).toBe(500);
  });

  test('Device handler can list services', async () => {
    const handler = createHttpRequestHandler();

    const result = await handler.onListServices();

    expect(result.services).toHaveLength(1);
    expect(result.services[0].name).toBe('http-service');
  });
});
