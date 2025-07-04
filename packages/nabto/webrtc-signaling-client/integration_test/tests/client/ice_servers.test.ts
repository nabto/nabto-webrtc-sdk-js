import { test, afterEach, beforeEach, describe, expect } from 'vitest'

import { ClientTestInstance } from '../../src/ClientTestInstance'
import { SignalingConnectionState } from '../../../src'

describe("Test of ice servers functionality", async () => {
  let testInstance: ClientTestInstance

  afterEach(async () => {
    await testInstance.destroyTest();
  })
  test('Ice Servers Test 1, get ice servers without access token.', async () => {
    testInstance = await ClientTestInstance.create({requireAccessToken: false});
    const client = testInstance.createSignalingClient();
    const iceServers = await client.requestIceServers();
    expect(iceServers).toBeDefined();
    expect(iceServers.length).toEqual(2);
    expect(iceServers[0].urls.length).toEqual(2);
    expect(iceServers[0].urls[0].startsWith("stun:")).toBe(true)
  })
  test('Ice Servers Test 2, get ice servers with access token.', async () => {
    testInstance = await ClientTestInstance.create({requireAccessToken: true});
    const client = testInstance.createSignalingClient();
    const iceServers = await client.requestIceServers();
    expect(iceServers).toBeDefined();
    expect(iceServers.length).toEqual(3);
    expect(iceServers[2].urls.length).toEqual(2);
    expect(iceServers[2].urls[0].startsWith("turn:")).toBe(true)
  })

  test('Ice Servers Test 3, request ice servers with an invalid access token.', async () => {
    testInstance = await ClientTestInstance.create({ requireAccessToken: true });
    testInstance.accessToken = "invalid-access-token";
    const client = testInstance.createSignalingClient();
    await expect(client.requestIceServers()).rejects.toThrow("Access denied");
  })

})
