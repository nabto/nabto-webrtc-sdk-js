import { test, expect, describe, vi } from 'vitest';
import { createClientJsonRpc, createDeviceJsonRpc, HttpRequestHandler } from './';
import type { HttpRequestParams } from './';

/**
 * Mock data channel for testing without WebRTC
 */
class MockDataChannel extends EventTarget {
  label: string;
  protocol: string;
  readyState: RTCDataChannelState = 'open';

  // Tracks all messages sent through this channel
  sentMessages: string[] = [];

  // Simulates a connected peer's channel
  peer: MockDataChannel | null = null;

  constructor(label: string, protocol: string) {
    super();
    this.label = label;
    this.protocol = protocol;
  }

  send(data: string): void {
    this.sentMessages.push(data);

    // If we have a peer, simulate sending the message to them
    if (this.peer) {
      // Simulate async message delivery
      setTimeout(() => {
        this.peer!.dispatchEvent(new MessageEvent('message', { data }));
      }, 0);
    }
  }

  close(): void {
    this.readyState = 'closed';
    this.dispatchEvent(new Event('close'));
  }

  // Helper to connect two mock channels
  static createPair(label: string = 'http', protocol: string = 'nabto.http/2'): [MockDataChannel, MockDataChannel] {
    const client = new MockDataChannel(label, protocol);
    const device = new MockDataChannel(label, protocol);

    client.peer = device;
    device.peer = client;

    return [client, device];
  }
}

describe('JSON-RPC with Mock DataChannels', () => {
  test('Client can list services using mock channels', async () => {
    const [clientChannel, deviceChannel] = MockDataChannel.createPair();

    // Configure services on the device (no handler, so default will be used)
    createDeviceJsonRpc(deviceChannel as unknown as RTCDataChannel, [
      { name: 'mock-service', baseUrl: 'http://localhost:8080', description: 'Mock service for testing' }
    ]);
    const clientJsonRpc = createClientJsonRpc(clientChannel as unknown as RTCDataChannel);

    const result = await clientJsonRpc.listServices();

    expect(result.services).toHaveLength(1);
    expect(result.services[0].name).toBe('mock-service');
    expect(result.services[0].description).toBe('Mock service for testing');
  });

  test('Client can make HTTP request using mock channels', async () => {
    const [clientChannel, deviceChannel] = MockDataChannel.createPair();

    const handler: HttpRequestHandler = {
      onRequest: vi.fn().mockResolvedValue({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: btoa(JSON.stringify({ success: true }))
      })
    };

    createDeviceJsonRpc(deviceChannel as unknown as RTCDataChannel, [
      { name: 'test', baseUrl: 'http://localhost:8080' }
    ], handler);
    const clientJsonRpc = createClientJsonRpc(clientChannel as unknown as RTCDataChannel);

    const response = await clientJsonRpc.request({
      service: 'test',
      method: 'GET',
      target: '/api/test'
    });

    expect(response.status).toBe(200);
    expect(handler.onRequest).toHaveBeenCalledWith({
      service: 'test',
      method: 'GET',
      target: '/api/test'
    }, {
      name: 'test',
      baseUrl: 'http://localhost:8080'
    });
  });

  test('Device handler receives correct request parameters', async () => {
    const [clientChannel, deviceChannel] = MockDataChannel.createPair();

    const handler: HttpRequestHandler = {
      onRequest: vi.fn().mockResolvedValue({
        status: 200,
        headers: {},
        body: ''
      })
    };

    createDeviceJsonRpc(deviceChannel as unknown as RTCDataChannel, [
      { name: 'api', baseUrl: 'http://localhost:8080' }
    ], handler);
    const clientJsonRpc = createClientJsonRpc(clientChannel as unknown as RTCDataChannel);

    const params: HttpRequestParams = {
      service: 'api',
      method: 'POST',
      target: '/data',
      headers: { 'X-Custom': 'header' },
      body: btoa('test data')
    };

    await clientJsonRpc.request(params);

    expect(handler.onRequest).toHaveBeenCalledWith(params, {
      name: 'api',
      baseUrl: 'http://localhost:8080'
    });
  });

  test('Client receives error responses correctly', async () => {
    const [clientChannel, deviceChannel] = MockDataChannel.createPair();

    const handler: HttpRequestHandler = {
      onRequest: vi.fn().mockRejectedValue(Object.assign(
        new Error('Service not found'),
        { code: -32002 }
      ))
    };

    createDeviceJsonRpc(deviceChannel as unknown as RTCDataChannel, [
      { name: 'unknown', baseUrl: 'http://localhost:8080' }
    ], handler);
    const clientJsonRpc = createClientJsonRpc(clientChannel as unknown as RTCDataChannel);

    await expect(clientJsonRpc.request({
      service: 'unknown',
      method: 'GET',
      target: '/'
    })).rejects.toThrow('Service not found');
  });

  test('Multiple concurrent requests work with mock channels', async () => {
    const [clientChannel, deviceChannel] = MockDataChannel.createPair();

    const handler: HttpRequestHandler = {
      onRequest: vi.fn()
        .mockResolvedValueOnce({ status: 200, headers: {}, body: btoa('response1') })
        .mockResolvedValueOnce({ status: 201, headers: {}, body: btoa('response2') })
    };

    createDeviceJsonRpc(deviceChannel as unknown as RTCDataChannel, [
      { name: 'a', baseUrl: 'http://localhost:8080' },
      { name: 'b', baseUrl: 'http://localhost:8081' }
    ], handler);
    const clientJsonRpc = createClientJsonRpc(clientChannel as unknown as RTCDataChannel);

    const [list, req1, req2] = await Promise.all([
      clientJsonRpc.listServices(),
      clientJsonRpc.request({ service: 'a', method: 'GET', target: '/1' }),
      clientJsonRpc.request({ service: 'b', method: 'GET', target: '/2' })
    ]);

    expect(list.services).toHaveLength(2);
    expect(req1.status).toBe(200);
    expect(req2.status).toBe(201);
    expect(handler.onRequest).toHaveBeenCalledTimes(2);
  });

  test('Cancel request works with mock channels', async () => {
    const [clientChannel, deviceChannel] = MockDataChannel.createPair();

    const handler: HttpRequestHandler = {
      onRequest: vi.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ status: 200, headers: {} }), 1000))
      ),
      onCancel: vi.fn()
    };

    createDeviceJsonRpc(deviceChannel as unknown as RTCDataChannel, [
      { name: 'test', baseUrl: 'http://localhost:8080' }
    ], handler);
    const clientJsonRpc = createClientJsonRpc(clientChannel as unknown as RTCDataChannel);

    const requestPromise = clientJsonRpc.request({
      service: 'test',
      method: 'GET',
      target: '/'
    }).catch(err => err); // Handle the rejection to avoid unhandled rejection warning

    // Wait for request to be sent
    await new Promise(resolve => setTimeout(resolve, 10));

    // Cancel the request (client sends cancel notification)
    clientJsonRpc.cancel(1);

    // Wait for the cancel message to be processed and error response to be sent
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(handler.onCancel).toHaveBeenCalledWith(1);

    const error = await requestPromise;
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Request cancelled by client');
  });

  test('Channel close cleans up pending requests', async () => {
    const [clientChannel, deviceChannel] = MockDataChannel.createPair();

    const handler: HttpRequestHandler = {
      onRequest: vi.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ status: 200, headers: {} }), 1000))
      )
    };

    createDeviceJsonRpc(deviceChannel as unknown as RTCDataChannel, [
      { name: 'test', baseUrl: 'http://localhost:8080' }
    ], handler);
    const clientJsonRpc = createClientJsonRpc(clientChannel as unknown as RTCDataChannel);

    const requestPromise = clientJsonRpc.request({
      service: 'test',
      method: 'GET',
      target: '/'
    });

    // Wait for request to be sent
    await new Promise(resolve => setTimeout(resolve, 10));

    // Close the channel
    clientJsonRpc.close();

    await expect(requestPromise).rejects.toThrow('Data channel closed');
  });

  test('Mock channels track sent messages', async () => {
    const [clientChannel, deviceChannel] = MockDataChannel.createPair();

    const handler: HttpRequestHandler = {
      onRequest: vi.fn().mockResolvedValue({ status: 200, headers: {} })
    };

    createDeviceJsonRpc(deviceChannel as unknown as RTCDataChannel, [
      { name: 'test', baseUrl: 'http://localhost:8080' }
    ], handler);
    const clientJsonRpc = createClientJsonRpc(clientChannel as unknown as RTCDataChannel);

    await clientJsonRpc.listServices();
    await clientJsonRpc.request({ service: 'test', method: 'GET', target: '/' });

    // Client should have sent 2 requests
    expect(clientChannel.sentMessages).toHaveLength(2);

    // Device should have sent 2 responses
    expect(deviceChannel.sentMessages).toHaveLength(2);

    // Verify message structure
    const firstRequest = JSON.parse(clientChannel.sentMessages[0]);
    expect(firstRequest).toMatchObject({
      jsonrpc: '2.0',
      method: 'http.listServices',
      id: 1
    });
  });
});
