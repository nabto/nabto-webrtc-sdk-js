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

test('ClientJsonRpc automatically waits for channel to open before sending request', async () => {
  const channel = new MockRTCDataChannel('http', { protocol: 'nabto.http/2' });
  const client = new ClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  // Start the request, it will wait for channel to open
  const listPromise = client.listServices();

  // Channel not open yet, so request should be waiting
  await new Promise(resolve => setTimeout(resolve, 10));
  expect(channel.send).not.toHaveBeenCalled();

  // Now open the channel
  simulateOpen(channel);

  // Wait for the request to be sent
  await new Promise(resolve => setTimeout(resolve, 10));

  // Simulate response
  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    result: { services: [] },
    id: 1
  }));

  await expect(listPromise).resolves.toEqual({ services: [] });
  expect(channel.send).toHaveBeenCalled();
});

test('ClientJsonRpc rejects request when channel fails to open', async () => {
  const channel = new MockRTCDataChannel('http', { protocol: 'nabto.http/2' });
  const client = new ClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  const requestPromise = client.listServices();

  simulateError(channel);
  await expect(requestPromise).rejects.toThrow('Data channel failed to open');
});

test('ClientJsonRpc sends http.listServices request', async () => {
  const channel = new MockRTCDataChannel('http', { protocol: 'nabto.http/2' });
  simulateOpen(channel);
  const client = new ClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  const responsePromise = client.listServices();
  // Wait for async waitForOpen to complete
  await new Promise(resolve => setTimeout(resolve, 0));

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
  simulateOpen(channel);
  const client = new ClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  const params = {
    service: 'test-service',
    method: 'GET',
    target: '/api/test',
    headers: { 'Content-Type': 'application/json' },
    body: 'base64data'
  };

  const responsePromise = client.request(params);
  // Wait for async waitForOpen to complete
  await new Promise(resolve => setTimeout(resolve, 0));

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
  simulateOpen(channel);
  const client = new ClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  const responsePromise = client.listServices();
  // Wait for async waitForOpen to complete
  await new Promise(resolve => setTimeout(resolve, 0));

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
  simulateOpen(channel);
  const client = new ClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  const responsePromise = client.request({
    service: 'test',
    method: 'GET',
    target: '/'
  });
  // Wait for async waitForOpen to complete
  await new Promise(resolve => setTimeout(resolve, 0));

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
  simulateOpen(channel);
  const client = new ClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  const promise1 = client.listServices();
  const promise2 = client.request({ service: 'test', method: 'GET', target: '/' });
  // Wait for async waitForOpen to complete
  await new Promise(resolve => setTimeout(resolve, 0));

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
  simulateOpen(channel);
  const client = new ClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  const responsePromise = client.listServices();
  // Wait for async waitForOpen to complete
  await new Promise(resolve => setTimeout(resolve, 0));

  // Close the channel
  channel.close();

  await expect(responsePromise).rejects.toThrow('Data channel closed');
});

test('ClientJsonRpc close() cleans up channel and rejects pending requests', async () => {
  const channel = new MockRTCDataChannel('http', { protocol: 'nabto.http/2' });
  simulateOpen(channel);
  const client = new ClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  const responsePromise = client.listServices();
  // Wait for async waitForOpen to complete
  await new Promise(resolve => setTimeout(resolve, 0));

  client.close();

  expect(channel.close).toHaveBeenCalled();
  await expect(responsePromise).rejects.toThrow('Data channel closed');
});

