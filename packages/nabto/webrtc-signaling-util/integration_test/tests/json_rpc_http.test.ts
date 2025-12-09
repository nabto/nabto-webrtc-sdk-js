import { test, expect, describe } from 'vitest';
import { createDeviceJsonRpc, createClientJsonRpc } from '../../src';

/**
 * Integration tests for JSON-RPC HTTP service
 *
 * These tests verify that the device can invoke the HTTP server through JSON-RPC
 * using service configurations with base URLs.
 * All tests make real HTTP requests to the integration_test_server.
 *
 * NOTE: This test requires the integration_test_server to be running.
 * Start it with: cd integration_test_server && bun dev
 */

const INTEGRATION_TEST_SERVER_URL = 'http://localhost:13745';

/**
 * Helper to create a mock data channel pair for testing
 */
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

  static createPair(): [MockDataChannel, MockDataChannel] {
    const client = new MockDataChannel();
    const device = new MockDataChannel();
    client.peer = device;
    device.peer = client;
    return [client, device];
  }
}

describe('JSON-RPC HTTP Integration Tests - With Client', () => {
  /**
   * Tests with client in the loop making requests through the device to the HTTP server
   */

  test('Client can make GET request through device to HTTP server', async () => {
    const [clientChannel, deviceChannel] = MockDataChannel.createPair();

    // Create device JSON-RPC with service configuration
    const deviceJsonRpc = createDeviceJsonRpc(deviceChannel as any, [
      {
        name: 'http-service',
        baseUrl: INTEGRATION_TEST_SERVER_URL,
        description: 'Integration test HTTP service'
      }
    ]);

    // Create client JSON-RPC
    const clientJsonRpc = createClientJsonRpc(clientChannel as any);

    // Make request through JSON-RPC (target is just the path now)
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

  test('Client can make POST request with body through device', async () => {
    const [clientChannel, deviceChannel] = MockDataChannel.createPair();

    const deviceJsonRpc = createDeviceJsonRpc(deviceChannel as any, [
      { name: 'http-service', baseUrl: INTEGRATION_TEST_SERVER_URL }
    ]);
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

  test('Client can handle different HTTP status codes through device', async () => {
    const [clientChannel, deviceChannel] = MockDataChannel.createPair();

    const deviceJsonRpc = createDeviceJsonRpc(deviceChannel as any, [
      { name: 'http-service', baseUrl: INTEGRATION_TEST_SERVER_URL }
    ]);
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

  test('Client can handle large responses through device', async () => {
    const [clientChannel, deviceChannel] = MockDataChannel.createPair();

    const deviceJsonRpc = createDeviceJsonRpc(deviceChannel as any, [
      { name: 'http-service', baseUrl: INTEGRATION_TEST_SERVER_URL }
    ]);
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

  test('Multiple concurrent requests work through device', async () => {
    const [clientChannel, deviceChannel] = MockDataChannel.createPair();

    const deviceJsonRpc = createDeviceJsonRpc(deviceChannel as any, [
      { name: 'http-service', baseUrl: INTEGRATION_TEST_SERVER_URL }
    ]);
    const clientJsonRpc = createClientJsonRpc(clientChannel as any);

    const [response1, response2] = await Promise.all([
      clientJsonRpc.request({
        service: 'http-service',
        method: 'GET',
        target: '/http-service/hello'
      }),
      clientJsonRpc.request({
        service: 'http-service',
        method: 'POST',
        target: '/http-service/echo',
        headers: { 'Content-Type': 'application/json' },
        body: btoa(JSON.stringify({ test: 'concurrent' }))
      })
    ]);

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);

    const body1 = JSON.parse(atob(response1.body!));
    expect(body1.message).toBe('Hello from HTTP service!');

    const body2 = JSON.parse(atob(response2.body!));
    expect(body2.echo).toEqual({ test: 'concurrent' });

    clientJsonRpc.close();
    deviceJsonRpc.close();
  });

  test('Client gets error for unknown service', async () => {
    const [clientChannel, deviceChannel] = MockDataChannel.createPair();

    const deviceJsonRpc = createDeviceJsonRpc(deviceChannel as any, [
      { name: 'http-service', baseUrl: INTEGRATION_TEST_SERVER_URL }
    ]);
    const clientJsonRpc = createClientJsonRpc(clientChannel as any);

    await expect(
      clientJsonRpc.request({
        service: 'unknown-service',
        method: 'GET',
        target: '/test'
      })
    ).rejects.toThrow('Service not found: unknown-service');

    clientJsonRpc.close();
    deviceJsonRpc.close();
  });

  test('Client can list configured services', async () => {
    const [clientChannel, deviceChannel] = MockDataChannel.createPair();

    const deviceJsonRpc = createDeviceJsonRpc(deviceChannel as any, [
      {
        name: 'http-service',
        baseUrl: INTEGRATION_TEST_SERVER_URL,
        description: 'Integration test HTTP service'
      },
      {
        name: 'api-service',
        baseUrl: 'http://localhost:9999',
        description: 'Another API service'
      }
    ]);
    const clientJsonRpc = createClientJsonRpc(clientChannel as any);

    const result = await clientJsonRpc.listServices();

    expect(result.services).toHaveLength(2);
    expect(result.services[0].name).toBe('http-service');
    expect(result.services[0].description).toBe('Integration test HTTP service');
    expect(result.services[1].name).toBe('api-service');
    expect(result.services[1].description).toBe('Another API service');

    clientJsonRpc.close();
    deviceJsonRpc.close();
  });
});

describe('JSON-RPC HTTP Integration Tests - Without Client', () => {
  /**
   * Tests without client - device makes direct HTTP requests
   */

  test('Device can make GET request to HTTP server directly', async () => {
    const [clientChannel, deviceChannel] = MockDataChannel.createPair();

    const deviceJsonRpc = createDeviceJsonRpc(deviceChannel as any, [
      { name: 'http-service', baseUrl: INTEGRATION_TEST_SERVER_URL }
    ]);

    // Simulate a JSON-RPC request directly on the device channel
    const requestPromise = new Promise<any>((resolve) => {
      clientChannel.addEventListener('message', (event) => {
        const response = JSON.parse((event as MessageEvent).data);
        if (response.id === 1) {
          resolve(response);
        }
      });
    });

    // Send JSON-RPC request
    deviceChannel.dispatchEvent(new MessageEvent('message', {
      data: JSON.stringify({
        jsonrpc: '2.0',
        method: 'http.request',
        params: {
          service: 'http-service',
          method: 'GET',
          target: '/http-service/hello'
        },
        id: 1
      })
    }));

    const response = await requestPromise;

    expect(response.result.status).toBe(200);
    const body = JSON.parse(atob(response.result.body));
    expect(body.message).toBe('Hello from HTTP service!');

    deviceJsonRpc.close();
  });

  test('Device can make POST request to HTTP server directly', async () => {
    const [clientChannel, deviceChannel] = MockDataChannel.createPair();

    const deviceJsonRpc = createDeviceJsonRpc(deviceChannel as any, [
      { name: 'http-service', baseUrl: INTEGRATION_TEST_SERVER_URL }
    ]);

    const requestPromise = new Promise<any>((resolve) => {
      clientChannel.addEventListener('message', (event) => {
        const response = JSON.parse((event as MessageEvent).data);
        if (response.id === 1) {
          resolve(response);
        }
      });
    });

    const testData = { test: 'value', number: 123 };
    deviceChannel.dispatchEvent(new MessageEvent('message', {
      data: JSON.stringify({
        jsonrpc: '2.0',
        method: 'http.request',
        params: {
          service: 'http-service',
          method: 'POST',
          target: '/http-service/echo',
          headers: { 'Content-Type': 'application/json' },
          body: btoa(JSON.stringify(testData))
        },
        id: 1
      })
    }));

    const response = await requestPromise;

    expect(response.result.status).toBe(200);
    const body = JSON.parse(atob(response.result.body));
    expect(body.echo).toEqual(testData);

    deviceJsonRpc.close();
  });

  test('Device can handle HTTP errors directly', async () => {
    const [clientChannel, deviceChannel] = MockDataChannel.createPair();

    const deviceJsonRpc = createDeviceJsonRpc(deviceChannel as any, [
      { name: 'http-service', baseUrl: INTEGRATION_TEST_SERVER_URL }
    ]);

    const requestPromise = new Promise<any>((resolve) => {
      clientChannel.addEventListener('message', (event) => {
        const response = JSON.parse((event as MessageEvent).data);
        if (response.id === 1) {
          resolve(response);
        }
      });
    });

    deviceChannel.dispatchEvent(new MessageEvent('message', {
      data: JSON.stringify({
        jsonrpc: '2.0',
        method: 'http.request',
        params: {
          service: 'http-service',
          method: 'GET',
          target: '/http-service/status/500'
        },
        id: 1
      })
    }));

    const response = await requestPromise;

    expect(response.result.status).toBe(500);
    const body = JSON.parse(atob(response.result.body));
    expect(body.status).toBe(500);

    deviceJsonRpc.close();
  });
});
