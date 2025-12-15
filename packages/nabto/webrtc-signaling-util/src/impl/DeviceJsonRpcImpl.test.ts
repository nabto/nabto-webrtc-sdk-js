import { test, expect, vi } from 'vitest';
import { DeviceJsonRpcImpl, HttpRequestHandler } from "./DeviceJsonRpcImpl";
import type { HttpRequestParams, HttpResponse } from '../JsonRpcTypes';

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
    onRequest: vi.fn()
  };

  const device = new DeviceJsonRpcImpl(channel as unknown as RTCDataChannel, [], handler);

  expect(device.getDataChannel()).toBe(channel);
});

test('DeviceJsonRpc handles http.listServices request', async () => {
  const channel = new MockRTCDataChannel('http', 'nabto.http/2');

  // Use service configurations instead of handler
  new DeviceJsonRpcImpl(channel as unknown as RTCDataChannel, [
    { name: 'service1', baseUrl: 'http://localhost:8080', description: 'Service 1' },
    { name: 'service2', baseUrl: 'http://localhost:8081', description: 'Service 2' }
  ]);
  simulateOpen(channel);

  // Simulate request
  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    method: 'http.listServices',
    id: 1
  }));

  // Wait for async handling
  await new Promise(resolve => setTimeout(resolve, 10));

  expect(channel.send).toHaveBeenCalledWith(
    JSON.stringify({
      jsonrpc: '2.0',
      result: {
        services: [
          { name: 'service1', description: 'Service 1' },
          { name: 'service2', description: 'Service 2' }
        ]
      },
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
    onRequest: vi.fn().mockResolvedValue(mockResponse)
  };

  const serviceConfig = { name: 'test-service', baseUrl: 'http://localhost:8080' };
  new DeviceJsonRpcImpl(channel as unknown as RTCDataChannel, [serviceConfig], handler);
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

  expect(handler.onRequest).toHaveBeenCalledWith(params, serviceConfig);
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
    onRequest: vi.fn()
  };

  new DeviceJsonRpcImpl(channel as unknown as RTCDataChannel, [], handler);
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
    onRequest: vi.fn().mockRejectedValue(new Error('Service unavailable'))
  };

  new DeviceJsonRpcImpl(channel as unknown as RTCDataChannel, [
    { name: 'test', baseUrl: 'http://localhost:8080' }
  ], handler);
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
  const customError = new Error('Service not found') as Error & { code: number; data: unknown };
  customError.code = -32002;
  customError.data = { details: 'Additional info' };

  const handler: HttpRequestHandler = {
    onRequest: vi.fn().mockRejectedValue(customError)
  };

  new DeviceJsonRpcImpl(channel as unknown as RTCDataChannel, [
    { name: 'test', baseUrl: 'http://localhost:8080' }
  ], handler);
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
    onCancel: vi.fn()
  };

  new DeviceJsonRpcImpl(channel as unknown as RTCDataChannel, [], handler);
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
  // Error response should be sent for the cancelled request
  expect(channel.send).toHaveBeenCalledWith(
    JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32800,
        message: 'Request cancelled by client'
      },
      id: 42
    })
  );
});

test('DeviceJsonRpc handles invalid JSON', async () => {
  const channel = new MockRTCDataChannel('http', 'nabto.http/2');
  const handler: HttpRequestHandler = {
    onRequest: vi.fn()
  };

  new DeviceJsonRpcImpl(channel as unknown as RTCDataChannel, [], handler);
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
    onRequest: vi.fn()
  };

  const device = new DeviceJsonRpcImpl(channel as unknown as RTCDataChannel, [], handler);

  device.close();

  expect(channel.close).toHaveBeenCalled();
});

test('DeviceJsonRpc automatically waits for channel to open before sending responses', async () => {
  const channel = new MockRTCDataChannel('http', 'nabto.http/2');

  new DeviceJsonRpcImpl(channel as unknown as RTCDataChannel, [
    { name: 'test', baseUrl: 'http://localhost:8080' }
  ]);

  // Simulate receiving a request before channel is open
  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    method: 'http.listServices',
    id: 1
  }));

  // Response should not be sent yet
  await new Promise(resolve => setTimeout(resolve, 10));
  expect(channel.send).not.toHaveBeenCalled();

  // Now open the channel
  simulateOpen(channel);

  // Response should now be sent
  await new Promise(resolve => setTimeout(resolve, 10));
  expect(channel.send).toHaveBeenCalled();
});

test('DeviceJsonRpc addService adds a new service', async () => {
  const channel = new MockRTCDataChannel('http', 'nabto.http/2');
  const handler: HttpRequestHandler = {
    onRequest: vi.fn().mockResolvedValue({ status: 200, headers: {}, body: '' })
  };

  const device = new DeviceJsonRpcImpl(channel as unknown as RTCDataChannel, [
    { name: 'service1', baseUrl: 'http://localhost:8080' }
  ], handler);
  simulateOpen(channel);

  // Add a new service
  device.addService({ name: 'service2', baseUrl: 'http://localhost:8081' });

  // Verify the new service appears in listServices
  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    method: 'http.listServices',
    id: 1
  }));

  await new Promise(resolve => setTimeout(resolve, 10));

  expect(channel.send).toHaveBeenCalledWith(
    JSON.stringify({
      jsonrpc: '2.0',
      result: {
        services: [
          { name: 'service1', description: 'HTTP service at http://localhost:8080' },
          { name: 'service2', description: 'HTTP service at http://localhost:8081' }
        ]
      },
      id: 1
    })
  );

  // Verify the new service can handle requests
  channel.send.mockClear();
  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    method: 'http.request',
    params: { service: 'service2', method: 'GET', target: '/test' },
    id: 2
  }));

  await new Promise(resolve => setTimeout(resolve, 10));

  expect(handler.onRequest).toHaveBeenCalledWith(
    { service: 'service2', method: 'GET', target: '/test' },
    { name: 'service2', baseUrl: 'http://localhost:8081' }
  );
});

test('DeviceJsonRpc addService throws error for duplicate service names', () => {
  const channel = new MockRTCDataChannel('http', 'nabto.http/2');

  const device = new DeviceJsonRpcImpl(channel as unknown as RTCDataChannel, [
    { name: 'service1', baseUrl: 'http://localhost:8080' }
  ]);

  expect(() => {
    device.addService({ name: 'service1', baseUrl: 'http://localhost:8081' });
  }).toThrow('Service with name \'service1\' already exists');
});

test('DeviceJsonRpc returns error for non-existent service', async () => {
  const channel = new MockRTCDataChannel('http', 'nabto.http/2');

  new DeviceJsonRpcImpl(channel as unknown as RTCDataChannel, [
    { name: 'service1', baseUrl: 'http://localhost:8080' }
  ]);
  simulateOpen(channel);

  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    method: 'http.request',
    params: { service: 'nonexistent', method: 'GET', target: '/' },
    id: 1
  }));

  await new Promise(resolve => setTimeout(resolve, 10));

  expect(channel.send).toHaveBeenCalledWith(
    JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32002,
        message: 'Service not found: nonexistent'
      },
      id: 1
    })
  );
});

test('DeviceJsonRpc ignores response from cancelled request', async () => {
  const channel = new MockRTCDataChannel('http', 'nabto.http/2');

  // Create a handler with a delayed response
  let resolveRequest: ((value: unknown) => void) | null = null;
  const handler: HttpRequestHandler = {
    onRequest: vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        resolveRequest = resolve;
      });
    }),
    onCancel: vi.fn()
  };

  new DeviceJsonRpcImpl(channel as unknown as RTCDataChannel, [
    { name: 'test', baseUrl: 'http://localhost:8080' }
  ], handler);
  simulateOpen(channel);

  // Start a request
  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    method: 'http.request',
    params: { service: 'test', method: 'GET', target: '/test' },
    id: 123
  }));

  // Wait for request to be processed
  await new Promise(resolve => setTimeout(resolve, 10));
  expect(handler.onRequest).toHaveBeenCalled();

  // Cancel the request
  channel.send.mockClear();
  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    method: 'http.cancel',
    params: { id: 123 }
  }));

  await new Promise(resolve => setTimeout(resolve, 10));

  // Should have sent error response for cancellation
  expect(channel.send).toHaveBeenCalledWith(
    JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32800,
        message: 'Request cancelled by client'
      },
      id: 123
    })
  );
  expect(handler.onCancel).toHaveBeenCalledWith(123);

  // Now resolve the original request (simulating handler that can't cancel)
  channel.send.mockClear();
  resolveRequest!({
    status: 200,
    headers: {},
    body: btoa('response')
  });

  await new Promise(resolve => setTimeout(resolve, 10));

  // No success response should be sent since request was cancelled
  expect(channel.send).not.toHaveBeenCalled();
});

