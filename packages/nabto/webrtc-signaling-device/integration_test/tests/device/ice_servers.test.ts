import { test, afterEach, describe, expect } from 'vitest'
import { DeviceTestInstance } from '../../src/DeviceTestInstance'

// Ice Servers Tests
describe("Ice Servers Tests", async () => {
  let testInstance: DeviceTestInstance

  afterEach(async () => {
    await testInstance.destroyTest();
  })

  // Ice Servers Test 1: retrieve ice servers without a token
  // A device always has an access token so it does not make sense to implement this test.

  test('Ice Servers Test 2: get ice servers with access token', async () => {
    // Get Ice Servers with a token. Observe that the peer retrieves a list of turn and stun servers.
    testInstance = await DeviceTestInstance.create({});
    const device = testInstance.createSignalingDevice();
    const iceServers = await device.requestIceServers();
    expect(iceServers).toBeDefined();
    expect(iceServers.length).toEqual(3);
    expect(iceServers[2].urls.length).toEqual(2);
    expect(iceServers[2].urls[0].startsWith("turn:")).toBe(true)
  })

  test('Ice Servers Test 3: request ice servers with an invalid access token', async () => {
    // Get Ice Servers with an invalid token. Observe that the peer handles the 401 well-behaved.
    testInstance = await DeviceTestInstance.create({});
    testInstance.accessToken = "invalid-access-token";
    const device = testInstance.createSignalingDevice();
    await expect(device.requestIceServers()).rejects.toThrow("Access denied");
  })

})
