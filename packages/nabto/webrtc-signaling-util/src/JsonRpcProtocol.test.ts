import { test, expect, describe, beforeAll, afterAll } from 'vitest';
import { createClientJsonRpc, createDeviceJsonRpc, HttpRequestHandler } from './';
import type { HttpRequestParams, HttpResponse, ListServicesResult } from './';

/**
 * Protocol-level tests for JSON-RPC HTTP over WebRTC data channels
 *
 * These tests verify the JSON-RPC protocol implementation using local WebRTC
 * peer connections. This tests the protocol correctness without requiring
 * external servers or network connections.
 */

// Simple HTTP service mock for testing
class MockHttpService {
  async handleRequest(params: HttpRequestParams): Promise<HttpResponse> {
    if (params.service === 'test-service') {
      if (params.method === 'GET' && params.target === '/api/hello') {
        return {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: btoa(JSON.stringify({ message: 'Hello from device!' }))
        };
      }
      if (params.method === 'POST' && params.target === '/api/echo') {
        // Echo back the request body
        return {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: params.body || ''
        };
      }
      if (params.method === 'GET' && params.target === '/api/error') {
        return {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
          body: btoa(JSON.stringify({ error: 'Not found' }))
        };
      }
    }

    // Service not found or unknown endpoint
    const error = new Error('Service not found') as Error & { code: number };
    error.code = -32002;
    throw error;
  }

  listServices(): ListServicesResult {
    return {
      services: [
        {
          name: 'test-service',
          description: 'Test HTTP service for integration tests'
        }
      ]
    };
  }
}

describe('JSON-RPC HTTP Protocol Tests', () => {
  let clientPeer: RTCPeerConnection;
  let devicePeer: RTCPeerConnection;
  let clientJsonRpc: ReturnType<typeof createClientJsonRpc>;
  let deviceJsonRpc: ReturnType<typeof createDeviceJsonRpc>;
  let mockService: MockHttpService;

  beforeAll(async () => {
    // Create peer connections with configuration to allow connections without ICE
    const config = {
      iceServers: []
    };
    clientPeer = new RTCPeerConnection(config);
    devicePeer = new RTCPeerConnection(config);

    // Set up ICE candidate exchange
    clientPeer.onicecandidate = (event) => {
      if (event.candidate) {
        devicePeer.addIceCandidate(event.candidate).catch(() => {});
      }
    };

    devicePeer.onicecandidate = (event) => {
      if (event.candidate) {
        clientPeer.addIceCandidate(event.candidate).catch(() => {});
      }
    };

    // Create mock HTTP service
    mockService = new MockHttpService();

    // Create data channel on client side
    const clientDataChannel = clientPeer.createDataChannel('http', { protocol: 'nabto.http/2' });

    // Set up client JSON-RPC with the data channel
    clientJsonRpc = createClientJsonRpc(clientDataChannel);

    // Set up device to receive the data channel
    const deviceDataChannelPromise = new Promise<RTCDataChannel>((resolve) => {
      devicePeer.ondatachannel = (event) => {
        resolve(event.channel);
      };
    });

    // Create offer from client (this will include the data channel)
    const offer = await clientPeer.createOffer();
    await clientPeer.setLocalDescription(offer);
    await devicePeer.setRemoteDescription(offer);

    // Create answer from device
    const answer = await devicePeer.createAnswer();
    await devicePeer.setLocalDescription(answer);
    await clientPeer.setRemoteDescription(answer);

    // Wait for device to receive the data channel
    const deviceDataChannel = await deviceDataChannelPromise;

    // Create device JSON-RPC handler with custom logic
    const handler: HttpRequestHandler = {
      onRequest: async (params: HttpRequestParams) => {
        return mockService.handleRequest(params);
      }
    };

    // Set up device JSON-RPC with service configuration and custom handler
    deviceJsonRpc = createDeviceJsonRpc(deviceDataChannel, [
      {
        name: 'test-service',
        baseUrl: 'http://mock',
        description: 'Test HTTP service for integration tests'
      }
    ], handler);

    // Wait for client data channel to open
    await clientJsonRpc.waitForOpen();

    // Wait for device data channel to open
    await deviceJsonRpc.waitForOpen();
  }, 20000);

  afterAll(() => {
    clientJsonRpc?.close();
    deviceJsonRpc?.close();
    clientPeer?.close();
    devicePeer?.close();
  });

  test('Client can list services from device', async () => {
    const result = await clientJsonRpc.listServices();

    expect(result).toBeDefined();
    expect(result.services).toHaveLength(1);
    expect(result.services[0].name).toBe('test-service');
    expect(result.services[0].description).toBe('Test HTTP service for integration tests');
  });

  test('Client can make GET request through device', async () => {
    const response = await clientJsonRpc.request({
      service: 'test-service',
      method: 'GET',
      target: '/api/hello'
    });

    expect(response.status).toBe(200);
    expect(response.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(atob(response.body || ''));
    expect(body.message).toBe('Hello from device!');
  });

  test('Client can make POST request with body through device', async () => {
    const requestData = { test: 'data' };
    const encodedBody = btoa(JSON.stringify(requestData));

    const response = await clientJsonRpc.request({
      service: 'test-service',
      method: 'POST',
      target: '/api/echo',
      headers: { 'Content-Type': 'application/json' },
      body: encodedBody
    });

    expect(response.status).toBe(200);
    expect(response.body).toBe(encodedBody);

    const responseBody = JSON.parse(atob(response.body || ''));
    expect(responseBody).toEqual(requestData);
  });

  test('Client receives HTTP error responses correctly', async () => {
    const response = await clientJsonRpc.request({
      service: 'test-service',
      method: 'GET',
      target: '/api/error'
    });

    expect(response.status).toBe(404);
    const body = JSON.parse(atob(response.body || ''));
    expect(body.error).toBe('Not found');
  });

  test('Client receives JSON-RPC error for unknown service', async () => {
    await expect(
      clientJsonRpc.request({
        service: 'unknown-service',
        method: 'GET',
        target: '/'
      })
    ).rejects.toThrow('Service not found');

    try {
      await clientJsonRpc.request({
        service: 'unknown-service',
        method: 'GET',
        target: '/'
      });
    } catch (error: any) {
      expect(error.code).toBe(-32002);
    }
  });

  test('Multiple concurrent requests work correctly', async () => {
    const requests = [
      clientJsonRpc.listServices(),
      clientJsonRpc.request({
        service: 'test-service',
        method: 'GET',
        target: '/api/hello'
      }),
      clientJsonRpc.request({
        service: 'test-service',
        method: 'POST',
        target: '/api/echo',
        body: btoa('test')
      })
    ];

    const [services, getResponse, postResponse] = await Promise.all(requests);

    expect(services.services).toHaveLength(1);
    expect(getResponse.status).toBe(200);
    expect(postResponse.status).toBe(200);
  });
});
