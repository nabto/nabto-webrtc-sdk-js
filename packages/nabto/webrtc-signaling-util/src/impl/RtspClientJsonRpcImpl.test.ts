import { test, expect, vi } from 'vitest';
import { RtspClientJsonRpcImpl } from './RtspClientJsonRpcImpl';

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

test('RtspClientJsonRpc accepts datachannel', () => {
  const channel = new MockRTCDataChannel('rtsp', { protocol: 'nabto.rtsp/1' });

  const client = new RtspClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  expect(client.getDataChannel()).toBe(channel);
});

test('RtspClientJsonRpc listServices sends correct request', async () => {
  const channel = new MockRTCDataChannel('rtsp', { protocol: 'nabto.rtsp/1' });
  simulateOpen(channel);

  const client = new RtspClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  const listPromise = client.listServices();

  // Wait for async send
  await new Promise(resolve => setTimeout(resolve, 10));

  // Check that request was sent
  expect(channel.send).toHaveBeenCalledWith(
    JSON.stringify({
      jsonrpc: '2.0',
      method: 'rtsp.listServices',
      id: 1
    })
  );

  // Simulate response
  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    result: {
      services: [
        { name: 'camera1', description: 'Camera 1' },
        { name: 'camera2', description: 'Camera 2' }
      ]
    },
    id: 1
  }));

  const result = await listPromise;
  expect(result.services).toHaveLength(2);
  expect(result.services[0].name).toBe('camera1');
  expect(result.services[1].name).toBe('camera2');
});

test('RtspClientJsonRpc createSession sends correct request', async () => {
  const channel = new MockRTCDataChannel('rtsp', { protocol: 'nabto.rtsp/1' });
  simulateOpen(channel);

  const client = new RtspClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  const params = {
    service: 'camera1',
    target: '/stream1',
    mediaStreamId: 'stream-1',
    digestAuthentication: {
      username: 'user',
      password: 'pass'
    }
  };

  const sessionPromise = client.createSession(params);

  // Wait for async send
  await new Promise(resolve => setTimeout(resolve, 10));

  // Check that request was sent
  expect(channel.send).toHaveBeenCalledWith(
    JSON.stringify({
      jsonrpc: '2.0',
      method: 'rtsp.createSession',
      params,
      id: 1
    })
  );

  // Simulate response
  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    result: {
      session: 'session-123'
    },
    id: 1
  }));

  const result = await sessionPromise;
  expect(result.session).toBe('session-123');
});

test('RtspClientJsonRpc play sends correct request', async () => {
  const channel = new MockRTCDataChannel('rtsp', { protocol: 'nabto.rtsp/1' });
  simulateOpen(channel);

  const client = new RtspClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  const playPromise = client.play({ session: 'session-123' });

  // Wait for async send
  await new Promise(resolve => setTimeout(resolve, 10));

  // Check that request was sent
  expect(channel.send).toHaveBeenCalledWith(
    JSON.stringify({
      jsonrpc: '2.0',
      method: 'rtsp.play',
      params: { session: 'session-123' },
      id: 1
    })
  );

  // Simulate response
  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    result: {},
    id: 1
  }));

  await playPromise;
});

test('RtspClientJsonRpc play with target override', async () => {
  const channel = new MockRTCDataChannel('rtsp', { protocol: 'nabto.rtsp/1' });
  simulateOpen(channel);

  const client = new RtspClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  const playPromise = client.play({ session: 'session-123', target: '/stream2' });

  // Wait for async send
  await new Promise(resolve => setTimeout(resolve, 10));

  // Check that request was sent with target
  expect(channel.send).toHaveBeenCalledWith(
    JSON.stringify({
      jsonrpc: '2.0',
      method: 'rtsp.play',
      params: { session: 'session-123', target: '/stream2' },
      id: 1
    })
  );

  // Simulate response
  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    result: {},
    id: 1
  }));

  await playPromise;
});

test('RtspClientJsonRpc pause sends correct request', async () => {
  const channel = new MockRTCDataChannel('rtsp', { protocol: 'nabto.rtsp/1' });
  simulateOpen(channel);

  const client = new RtspClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  const pausePromise = client.pause({ session: 'session-123' });

  // Wait for async send
  await new Promise(resolve => setTimeout(resolve, 10));

  // Check that request was sent
  expect(channel.send).toHaveBeenCalledWith(
    JSON.stringify({
      jsonrpc: '2.0',
      method: 'rtsp.pause',
      params: { session: 'session-123' },
      id: 1
    })
  );

  // Simulate response
  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    result: {},
    id: 1
  }));

  await pausePromise;
});

test('RtspClientJsonRpc teardown sends correct request', async () => {
  const channel = new MockRTCDataChannel('rtsp', { protocol: 'nabto.rtsp/1' });
  simulateOpen(channel);

  const client = new RtspClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  const teardownPromise = client.teardown({ session: 'session-123' });

  // Wait for async send
  await new Promise(resolve => setTimeout(resolve, 10));

  // Check that request was sent
  expect(channel.send).toHaveBeenCalledWith(
    JSON.stringify({
      jsonrpc: '2.0',
      method: 'rtsp.teardown',
      params: { session: 'session-123' },
      id: 1
    })
  );

  // Simulate response
  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    result: {},
    id: 1
  }));

  await teardownPromise;
});

test('RtspClientJsonRpc handles error responses', async () => {
  const channel = new MockRTCDataChannel('rtsp', { protocol: 'nabto.rtsp/1' });
  simulateOpen(channel);

  const client = new RtspClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  const sessionPromise = client.createSession({
    service: 'camera1',
    target: '/stream1'
  });

  // Wait for request to be sent
  await new Promise(resolve => setTimeout(resolve, 10));

  // Simulate error response
  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    error: {
      code: -32002,
      message: 'Service not found'
    },
    id: 1
  }));

  await expect(sessionPromise).rejects.toThrow('Service not found');

  try {
    await sessionPromise;
  } catch (error: unknown) {
    expect((error as { code: number }).code).toBe(-32002);
  }
});

test('RtspClientJsonRpc handles error with data', async () => {
  const channel = new MockRTCDataChannel('rtsp', { protocol: 'nabto.rtsp/1' });
  simulateOpen(channel);

  const client = new RtspClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  const playPromise = client.play({ session: 'invalid-session' });

  // Wait for request to be sent
  await new Promise(resolve => setTimeout(resolve, 10));

  // Simulate error response with data
  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    error: {
      code: -32001,
      message: 'Session not found',
      data: { session: 'invalid-session' }
    },
    id: 1
  }));

  await expect(playPromise).rejects.toThrow('Session not found');

  try {
    await playPromise;
  } catch (error: unknown) {
    expect((error as { code: number }).code).toBe(-32001);
    expect((error as { data: unknown }).data).toEqual({ session: 'invalid-session' });
  }
});

test('RtspClientJsonRpc waits for channel to open', async () => {
  const channel = new MockRTCDataChannel('rtsp', { protocol: 'nabto.rtsp/1' });

  const client = new RtspClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  const listPromise = client.listServices();

  // Request should not be sent yet
  expect(channel.send).not.toHaveBeenCalled();

  // Open the channel
  simulateOpen(channel);

  // Wait a bit for the open handler
  await new Promise(resolve => setTimeout(resolve, 10));

  // Now request should be sent
  expect(channel.send).toHaveBeenCalled();

  // Simulate response
  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    result: { services: [] },
    id: 1
  }));

  await listPromise;
});

test('RtspClientJsonRpc rejects requests when channel fails to open', async () => {
  const channel = new MockRTCDataChannel('rtsp', { protocol: 'nabto.rtsp/1' });

  const client = new RtspClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  const listPromise = client.listServices();

  // Simulate error event
  channel.dispatchEvent(new Event('error'));

  await expect(listPromise).rejects.toThrow('Data channel failed to open');
});

test('RtspClientJsonRpc close() closes channel and rejects pending requests', async () => {
  const channel = new MockRTCDataChannel('rtsp', { protocol: 'nabto.rtsp/1' });
  simulateOpen(channel);

  const client = new RtspClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  const sessionPromise = client.createSession({
    service: 'camera1',
    target: '/stream1'
  });

  // Wait for request to be sent
  await new Promise(resolve => setTimeout(resolve, 10));

  client.close();

  expect(channel.close).toHaveBeenCalled();
  await expect(sessionPromise).rejects.toThrow('Data channel closed');
});

test('RtspClientJsonRpc handles channel close event', async () => {
  const channel = new MockRTCDataChannel('rtsp', { protocol: 'nabto.rtsp/1' });
  simulateOpen(channel);

  const client = new RtspClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  const sessionPromise = client.createSession({
    service: 'camera1',
    target: '/stream1'
  });

  // Wait for request to be sent
  await new Promise(resolve => setTimeout(resolve, 10));

  // Simulate channel close
  channel.readyState = 'closed';
  channel.dispatchEvent(new Event('close'));

  await expect(sessionPromise).rejects.toThrow('Data channel closed');
});

test('RtspClientJsonRpc handles multiple concurrent requests', async () => {
  const channel = new MockRTCDataChannel('rtsp', { protocol: 'nabto.rtsp/1' });
  simulateOpen(channel);

  const client = new RtspClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  const listPromise = client.listServices();
  const sessionPromise = client.createSession({
    service: 'camera1',
    target: '/stream1'
  });
  const playPromise = client.play({ session: 'session-123' });

  // Wait for async sends
  await new Promise(resolve => setTimeout(resolve, 10));

  // Verify requests were sent
  expect(channel.send).toHaveBeenCalledTimes(3);

  // Respond to requests
  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    result: { services: [{ name: 'camera1', description: 'Camera 1' }] },
    id: 1
  }));

  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    result: { session: 'session-456' },
    id: 2
  }));

  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    result: {},
    id: 3
  }));

  const [listResult, sessionResult] = await Promise.all([listPromise, sessionPromise, playPromise]);

  expect(listResult.services).toHaveLength(1);
  expect(sessionResult.session).toBe('session-456');
});

test('RtspClientJsonRpc ignores responses with no pending request', async () => {
  const channel = new MockRTCDataChannel('rtsp', { protocol: 'nabto.rtsp/1' });
  simulateOpen(channel);

  const client = new RtspClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  // Simulate response with unknown ID
  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    result: { session: 'session-123' },
    id: 999
  }));

  // Should not throw
  await new Promise(resolve => setTimeout(resolve, 10));
});

test('RtspClientJsonRpc ignores notification responses', async () => {
  const channel = new MockRTCDataChannel('rtsp', { protocol: 'nabto.rtsp/1' });
  simulateOpen(channel);

  const client = new RtspClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  // Simulate notification (no id)
  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    result: {}
  }));

  // Should not throw
  await new Promise(resolve => setTimeout(resolve, 10));
});

test('RtspClientJsonRpc handles invalid JSON gracefully', async () => {
  const channel = new MockRTCDataChannel('rtsp', { protocol: 'nabto.rtsp/1' });
  simulateOpen(channel);

  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

  const client = new RtspClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  // Simulate invalid JSON
  simulateMessage(channel, 'invalid json {');

  await new Promise(resolve => setTimeout(resolve, 10));

  expect(consoleError).toHaveBeenCalledWith(
    'Failed to parse JSON-RPC response:',
    expect.any(Error)
  );

  consoleError.mockRestore();
});

test('RtspClientJsonRpc request IDs increment', async () => {
  const channel = new MockRTCDataChannel('rtsp', { protocol: 'nabto.rtsp/1' });
  simulateOpen(channel);

  const client = new RtspClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  client.listServices();
  client.createSession({ service: 'camera1', target: '/stream1' });
  client.play({ session: 'session-123' });

  // Wait for async sends
  await new Promise(resolve => setTimeout(resolve, 10));

  const calls = channel.send.mock.calls;
  const request1 = JSON.parse(calls[0][0] as string);
  const request2 = JSON.parse(calls[1][0] as string);
  const request3 = JSON.parse(calls[2][0] as string);

  expect(request1.id).toBe(1);
  expect(request2.id).toBe(2);
  expect(request3.id).toBe(3);
});

test('RtspClientJsonRpc createSession without authentication', async () => {
  const channel = new MockRTCDataChannel('rtsp', { protocol: 'nabto.rtsp/1' });
  simulateOpen(channel);

  const client = new RtspClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  const sessionPromise = client.createSession({
    service: 'camera1',
    target: '/stream1'
  });

  // Wait for async send
  await new Promise(resolve => setTimeout(resolve, 10));

  // Check that request was sent without authentication
  const sentMessage = JSON.parse(channel.send.mock.calls[0][0] as string);
  expect(sentMessage.params.digestAuthentication).toBeUndefined();

  // Simulate response
  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    result: { session: 'session-123' },
    id: 1
  }));

  await sessionPromise;
});

test('RtspClientJsonRpc createSession with mediaStreamId', async () => {
  const channel = new MockRTCDataChannel('rtsp', { protocol: 'nabto.rtsp/1' });
  simulateOpen(channel);

  const client = new RtspClientJsonRpcImpl(channel as unknown as RTCDataChannel);

  const sessionPromise = client.createSession({
    service: 'camera1',
    target: '/stream1',
    mediaStreamId: 'my-stream'
  });

  // Wait for async send
  await new Promise(resolve => setTimeout(resolve, 10));

  // Check that request includes mediaStreamId
  const sentMessage = JSON.parse(channel.send.mock.calls[0][0] as string);
  expect(sentMessage.params.mediaStreamId).toBe('my-stream');

  // Simulate response
  simulateMessage(channel, JSON.stringify({
    jsonrpc: '2.0',
    result: { session: 'session-123' },
    id: 1
  }));

  await sessionPromise;
});
