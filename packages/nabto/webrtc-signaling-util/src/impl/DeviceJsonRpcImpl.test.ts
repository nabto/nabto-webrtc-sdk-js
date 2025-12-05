import { test, expect, vi } from 'vitest';
import { DeviceJsonRpcImpl, HttpRequestHandler } from "./DeviceJsonRpcImpl";
import type { HttpRequestParams, HttpResponse, ListServicesResult } from '../JsonRpcTypes';

class MockRTCDataChannel extends EventTarget {
  label: string;
  protocol: string;
  readyState: RTCDataChannelState = 'connecting';

  constructor(label: string, protocol: string) {
    super();
    this.label = label;
    this.protocol = protocol;
  }

  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = 'closed';
    this.dispatchEvent(new Event('close'));
  });
}

function simulateOpen(channel: MockRTCDataChannel) {
  channel.readyState = 'open';
  channel.dispatchEvent(new Event('open'));
}

function simulateMessage(channel: MockRTCDataChannel, data: string) {
  channel.dispatchEvent(new MessageEvent('message', { data }));
}

test('DeviceJsonRpc accepts datachannel', () => {
  const channel = new MockRTCDataChannel('http', 'nabto.http/2');
  const handler: HttpRequestHandler = {
    onRequest: vi.fn(),
    onListServices: vi.fn()
  };

  const device = new DeviceJsonRpcImpl(channel as unknown as RTCDataChannel, handler);

  expect(device.getDataChannel()).toBe(channel);
});

test('DeviceJsonRpc handles http.listServices request', async () => {
  const channel = new MockRTCDataChannel('http', 'nabto.http/2');
  const mockServices: ListServicesResult = {
    services: [
      { name: 'service1', description: 'Service 1' },
      { name: 'service2', description: 'Service 2' }
    ]
  };

  const handler: HttpRequestHandler = {
    onRequest: vi.fn(),
    onListServices: vi.fn().mockResolvedValue(mockServices)
  };

  new DeviceJsonRpcImpl(channel as unknown as RTCDataChannel, handler);
  simulateOpen(channel);

  // Simulate request
  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    method: 'http.listServices',
    id: 1
  }));

  // Wait for async handling
  await new Promise(resolve => setTimeout(resolve, 10));

  expect(handler.onListServices).toHaveBeenCalled();
  expect(channel.send).toHaveBeenCalledWith(
    JSON.stringify({
      jsonrpc: '2.0',
      result: mockServices,
      id: 1
    })
  );
});

test('DeviceJsonRpc handles http.request', async () => {
  const channel = new MockRTCDataChannel('http', 'nabto.http/2');
  const mockResponse: HttpResponse = {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: 'base64data'
  };

  const handler: HttpRequestHandler = {
    onRequest: vi.fn().mockResolvedValue(mockResponse),
    onListServices: vi.fn()
  };

  new DeviceJsonRpcImpl(channel as unknown as RTCDataChannel, handler);
  simulateOpen(channel);

  const params: HttpRequestParams = {
    service: 'test-service',
    method: 'POST',
    target: '/api/endpoint',
    headers: { 'Content-Type': 'application/json' },
    body: 'request-body'
  };

  // Simulate request
  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    method: 'http.request',
    params,
    id: 42
  }));

  // Wait for async handling
  await new Promise(resolve => setTimeout(resolve, 10));

  expect(handler.onRequest).toHaveBeenCalledWith(params);
  expect(channel.send).toHaveBeenCalledWith(
    JSON.stringify({
      jsonrpc: '2.0',
      result: mockResponse,
      id: 42
    })
  );
});

test('DeviceJsonRpc handles unknown method', async () => {
  const channel = new MockRTCDataChannel('http', 'nabto.http/2');
  const handler: HttpRequestHandler = {
    onRequest: vi.fn(),
    onListServices: vi.fn()
  };

  new DeviceJsonRpcImpl(channel as unknown as RTCDataChannel, handler);
  simulateOpen(channel);

  // Simulate request with unknown method
  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    method: 'unknown.method',
    id: 1
  }));

  // Wait for async handling
  await new Promise(resolve => setTimeout(resolve, 10));

  expect(channel.send).toHaveBeenCalledWith(
    JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32601,
        message: 'Method not found'
      },
      id: 1
    })
  );
});

test('DeviceJsonRpc handles handler errors', async () => {
  const channel = new MockRTCDataChannel('http', 'nabto.http/2');
  const handler: HttpRequestHandler = {
    onRequest: vi.fn().mockRejectedValue(new Error('Service unavailable')),
    onListServices: vi.fn()
  };

  new DeviceJsonRpcImpl(channel as unknown as RTCDataChannel, handler);
  simulateOpen(channel);

  // Simulate request
  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    method: 'http.request',
    params: { service: 'test', method: 'GET', target: '/' },
    id: 1
  }));

  // Wait for async handling
  await new Promise(resolve => setTimeout(resolve, 10));

  expect(channel.send).toHaveBeenCalledWith(
    JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Service unavailable'
      },
      id: 1
    })
  );
});

test('DeviceJsonRpc handles handler errors with custom error code', async () => {
  const channel = new MockRTCDataChannel('http', 'nabto.http/2');
  const customError = new Error('Service not found') as Error & { code: number; data: any };
  customError.code = -32002;
  customError.data = { details: 'Additional info' };

  const handler: HttpRequestHandler = {
    onRequest: vi.fn().mockRejectedValue(customError),
    onListServices: vi.fn()
  };

  new DeviceJsonRpcImpl(channel as unknown as RTCDataChannel, handler);
  simulateOpen(channel);

  // Simulate request
  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    method: 'http.request',
    params: { service: 'test', method: 'GET', target: '/' },
    id: 1
  }));

  // Wait for async handling
  await new Promise(resolve => setTimeout(resolve, 10));

  expect(channel.send).toHaveBeenCalledWith(
    JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32002,
        message: 'Service not found',
        data: { details: 'Additional info' }
      },
      id: 1
    })
  );
});

test('DeviceJsonRpc handles http.cancel notification', async () => {
  const channel = new MockRTCDataChannel('http', 'nabto.http/2');
  const handler: HttpRequestHandler = {
    onRequest: vi.fn(),
    onListServices: vi.fn(),
    onCancel: vi.fn()
  };

  new DeviceJsonRpcImpl(channel as unknown as RTCDataChannel, handler);
  simulateOpen(channel);

  // Simulate cancel notification (no id field)
  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    method: 'http.cancel',
    params: { id: 42 }
  }));

  // Wait for async handling
  await new Promise(resolve => setTimeout(resolve, 10));

  expect(handler.onCancel).toHaveBeenCalledWith(42);
  // No response should be sent for notifications
  expect(channel.send).not.toHaveBeenCalled();
});

test('DeviceJsonRpc handles invalid JSON', async () => {
  const channel = new MockRTCDataChannel('http', 'nabto.http/2');
  const handler: HttpRequestHandler = {
    onRequest: vi.fn(),
    onListServices: vi.fn()
  };

  new DeviceJsonRpcImpl(channel as unknown as RTCDataChannel, handler);
  simulateOpen(channel);

  // Simulate invalid JSON
  simulateMessage(channel, 'not valid json {');

  // Wait for async handling
  await new Promise(resolve => setTimeout(resolve, 10));

  expect(channel.send).toHaveBeenCalledWith(
    JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32700,
        message: 'Parse error'
      },
      id: null
    })
  );
});

test('DeviceJsonRpc close() closes the channel', () => {
  const channel = new MockRTCDataChannel('http', 'nabto.http/2');
  const handler: HttpRequestHandler = {
    onRequest: vi.fn(),
    onListServices: vi.fn()
  };

  const device = new DeviceJsonRpcImpl(channel as unknown as RTCDataChannel, handler);

  device.close();

  expect(channel.close).toHaveBeenCalled();
});

test('DeviceJsonRpc waitForOpen resolves when channel is already open', async () => {
  const channel = new MockRTCDataChannel('http', 'nabto.http/2');
  const handler: HttpRequestHandler = {
    onRequest: vi.fn(),
    onListServices: vi.fn()
  };

  const device = new DeviceJsonRpcImpl(channel as unknown as RTCDataChannel, handler);
  simulateOpen(channel);

  await expect(device.waitForOpen()).resolves.toBeUndefined();
});

test('DeviceJsonRpc waitForOpen waits for channel to open', async () => {
  const channel = new MockRTCDataChannel('http', 'nabto.http/2');
  const handler: HttpRequestHandler = {
    onRequest: vi.fn(),
    onListServices: vi.fn()
  };

  const device = new DeviceJsonRpcImpl(channel as unknown as RTCDataChannel, handler);
  const waitPromise = device.waitForOpen();

  // Simulate channel opening after a delay
  setTimeout(() => {
    simulateOpen(channel);
  }, 50);

  await expect(waitPromise).resolves.toBeUndefined();
});

