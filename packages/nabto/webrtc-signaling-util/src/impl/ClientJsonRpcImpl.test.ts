import { test, expect, beforeEach, afterEach, vi } from 'vitest';
import { ClientJsonRpcImpl } from './ClientJsonRpcImpl';

class MockRTCDataChannel extends EventTarget {
  label: string;
  protocol: string;
  readyState: RTCDataChannelState = 'connecting';

  constructor(label: string, options?: RTCDataChannelInit) {
    super();
    this.label = label;
    this.protocol = options?.protocol || '';
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

function simulateError(channel: MockRTCDataChannel) {
  channel.dispatchEvent(new Event('error'));
}

test('ClientJsonRpc waitForOpen() resolves when channel is already open', async () => {
  const channel = new MockRTCDataChannel('http', { protocol: 'nabto.http/2' });
  channel.readyState = 'open';
  const client = new ClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  await expect(client.waitForOpen()).resolves.toBeUndefined();
});

test('ClientJsonRpc waitForOpen() waits for channel to open', async () => {
  const channel = new MockRTCDataChannel('http', { protocol: 'nabto.http/2' });
  const client = new ClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  const openPromise = client.waitForOpen();

  simulateOpen(channel);
  await expect(openPromise).resolves.toBeUndefined();
});

test('ClientJsonRpc waitForOpen() rejects on channel error', async () => {
  const channel = new MockRTCDataChannel('http', { protocol: 'nabto.http/2' });
  const client = new ClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  const openPromise = client.waitForOpen();

  simulateError(channel);
  await expect(openPromise).rejects.toThrow('Data channel failed to open');
});

test('ClientJsonRpc sends http.listServices request', async () => {
  const channel = new MockRTCDataChannel('http', { protocol: 'nabto.http/2' });
  channel.readyState = 'open';
  const client = new ClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  const responsePromise = client.listServices();

  expect(channel.send).toHaveBeenCalledWith(
    JSON.stringify({
      jsonrpc: '2.0',
      method: 'http.listServices',
      id: 1
    })
  );

  // Simulate response
  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    result: {
      services: [
        { name: 'test-service', description: 'Test service' }
      ]
    },
    id: 1
  }));

  const result = await responsePromise;
  expect(result).toEqual({
    services: [
      { name: 'test-service', description: 'Test service' }
    ]
  });
});

test('ClientJsonRpc sends http.request', async () => {
  const channel = new MockRTCDataChannel('http', { protocol: 'nabto.http/2' });
  channel.readyState = 'open';
  const client = new ClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  const params = {
    service: 'test-service',
    method: 'GET',
    target: '/api/test',
    headers: { 'Content-Type': 'application/json' },
    body: 'base64data'
  };

  const responsePromise = client.request(params);

  expect(channel.send).toHaveBeenCalledWith(
    JSON.stringify({
      jsonrpc: '2.0',
      method: 'http.request',
      params,
      id: 1
    })
  );

  // Simulate response
  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    result: {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: 'base64response'
    },
    id: 1
  }));

  const result = await responsePromise;
  expect(result).toEqual({
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: 'base64response'
  });
});

test('ClientJsonRpc handles error responses', async () => {
  const channel = new MockRTCDataChannel('http', { protocol: 'nabto.http/2' });
  channel.readyState = 'open';
  const client = new ClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  const responsePromise = client.listServices();

  // Simulate error response
  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    error: {
      code: -32002,
      message: 'Service not found',
      data: { details: 'Additional info' }
    },
    id: 1
  }));

  await expect(responsePromise).rejects.toThrow('Service not found');

  try {
    await responsePromise;
  } catch (error: any) {
    expect(error.code).toBe(-32002);
    expect(error.data).toEqual({ details: 'Additional info' });
  }
});

test('ClientJsonRpc cancel sends notification and rejects pending request', async () => {
  const channel = new MockRTCDataChannel('http', { protocol: 'nabto.http/2' });
  channel.readyState = 'open';
  const client = new ClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  const responsePromise = client.request({
    service: 'test',
    method: 'GET',
    target: '/'
  });

  // Cancel the request
  client.cancel(1);

  expect(channel.send).toHaveBeenCalledWith(
    JSON.stringify({
      jsonrpc: '2.0',
      method: 'http.cancel',
      params: { id: 1 }
    })
  );

  await expect(responsePromise).rejects.toThrow('Request cancelled by client');
});

test('ClientJsonRpc handles multiple concurrent requests', async () => {
  const channel = new MockRTCDataChannel('http', { protocol: 'nabto.http/2' });
  channel.readyState = 'open';
  const client = new ClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  const promise1 = client.listServices();
  const promise2 = client.request({ service: 'test', method: 'GET', target: '/' });

  // Respond to second request first
  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    result: { status: 200, headers: {} },
    id: 2
  }));

  // Then respond to first request
  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    result: { services: [] },
    id: 1
  }));

  const [result1, result2] = await Promise.all([promise1, promise2]);
  expect(result1).toEqual({ services: [] });
  expect(result2).toEqual({ status: 200, headers: {} });
});

test('ClientJsonRpc rejects pending requests when channel closes', async () => {
  const channel = new MockRTCDataChannel('http', { protocol: 'nabto.http/2' });
  channel.readyState = 'open';
  const client = new ClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  const responsePromise = client.listServices();

  // Close the channel
  channel.close();

  await expect(responsePromise).rejects.toThrow('Data channel closed');
});

test('ClientJsonRpc close() cleans up channel and rejects pending requests', async () => {
  const channel = new MockRTCDataChannel('http', { protocol: 'nabto.http/2' });
  channel.readyState = 'open';
  const client = new ClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  const responsePromise = client.listServices();

  client.close();

  expect(channel.close).toHaveBeenCalled();
  await expect(responsePromise).rejects.toThrow('Data channel closed');
});

test('ClientJsonRpc rejects request when channel is not open', async () => {
  const channel = new MockRTCDataChannel('http', { protocol: 'nabto.http/2' });
  const client = new ClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  await expect(client.listServices()).rejects.toThrow('Data channel is not open');
});
