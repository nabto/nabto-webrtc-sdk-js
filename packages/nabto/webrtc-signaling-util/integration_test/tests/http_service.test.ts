import { test, expect, describe } from 'vitest';

/**
 * Integration test for JSON-RPC HTTP service through integration_test_server
 *
 * NOTE: This test requires the integration_test_server to be running.
 * Start it with: cd integration_test_server && bun dev
 *
 * This test verifies that HTTP service endpoints on the integration_test_server
 * can be accessed. A full end-to-end test would require:
 * 1. Setting up a device connection through the signaling server
 * 2. Establishing WebRTC connection with data channel
 * 3. Using DeviceJsonRpc to proxy HTTP requests to local services
 * 4. Using ClientJsonRpc to make requests through the device
 */

const INTEGRATION_TEST_SERVER_URL = 'http://localhost:13745';

describe('HTTP Service Integration Tests', () => {
  test('integration_test_server HTTP service endpoints are accessible', async () => {
    const response = await fetch(`${INTEGRATION_TEST_SERVER_URL}/http-service/hello`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('message');
    expect(data.message).toBe('Hello from HTTP service!');
  });

  test('HTTP service echo endpoint works', async () => {
    const testData = { test: 'data', number: 42 };
    const response = await fetch(`${INTEGRATION_TEST_SERVER_URL}/http-service/echo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.echo).toEqual(testData);
  });

  test('HTTP service can return different status codes', async () => {
    const response = await fetch(`${INTEGRATION_TEST_SERVER_URL}/http-service/status/404`);
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.status).toBe(404);
  });
});

/**
 * TODO: Add full end-to-end integration test
 *
 * A complete integration test would:
 *
 * 1. Create a test device instance:
 *    POST /test/device
 *    Returns: { productId, deviceId, testId, endpointUrl, accessToken }
 *
 * 2. Set up device-side WebRTC with DeviceJsonRpc:
 *    - Create SignalingDevice with the test credentials
 *    - Set up RTCPeerConnection
 *    - Create DeviceJsonRpc with handler that proxies to localhost:13745/http-service
 *    - Start the signaling device
 *
 * 3. Create client instance and connect:
 *    POST /test/device/:testId/clients
 *    POST /test/device/:testId/clients/:clientId/connect
 *
 * 4. Set up client-side WebRTC with ClientJsonRpc:
 *    - Create SignalingClient with test credentials
 *    - Set up RTCPeerConnection with MessageTransport
 *    - Create ClientJsonRpc
 *    - Establish WebRTC connection through signaling
 *
 * 5. Make JSON-RPC HTTP requests through the device:
 *    const response = await clientJsonRpc.request({
 *      service: 'test-service',
 *      method: 'GET',
 *      target: '/hello'
 *    });
 *
 * 6. Verify response came from integration_test_server HTTP service
 *
 * 7. Cleanup:
 *    DELETE /test/device/:testId
 */
