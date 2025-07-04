import { test, afterEach, beforeEach, describe, expect } from 'vitest'

import { SignalingConnectionState } from '../../../src'
import { DeviceTestInstance } from '../../src/DeviceTestInstance'

describe("Test of ice servers functionality", async () => {
  let testInstance: DeviceTestInstance

  afterEach(async () => {
    await testInstance.destroyTest();
  })

  test('Ice Servers Test 2, get ice servers with access token.', async () => {
    testInstance = await DeviceTestInstance.create({});
    const device = testInstance.createSignalingDevice();
    const iceServers = await device.requestIceServers();
    expect(iceServers).toBeDefined();
    expect(iceServers.length).toEqual(3);
    expect(iceServers[2].urls.length).toEqual(2);
    expect(iceServers[2].urls[0].startsWith("turn:")).toBe(true)
  })

  test('Ice Servers Test 3, request ice servers with an invalid access token.', async () => {
    testInstance = await DeviceTestInstance.create({});
    testInstance.accessToken = "invalid-access-token";
    const device = testInstance.createSignalingDevice();
    await expect(device.requestIceServers()).rejects.toThrow("Access denied");
  })

})
