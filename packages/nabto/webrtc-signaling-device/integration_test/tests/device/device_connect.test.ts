import { test,  afterEach, beforeEach, describe, expect } from 'vitest'

import { SignalingDevice, DeviceIdNotFoundError, ProductIdNotFoundError } from '../../../src'
import { SignalingConnectionState } from '../../../src'
import { DeviceTestInstance } from '../../src/DeviceTestInstance'

// Device Connectivity Tests

describe("Device Connectivity Tests", async () => {
  let testInstance: DeviceTestInstance
  beforeEach(async () => {
    testInstance = await DeviceTestInstance.create({});
  })

  afterEach(async () => {
    await testInstance.destroyTest();
  })

  test('Device Connectivity Test 1: Ok connection', async () => {
    // This tests that the device can connect to the signaling service.
    const device = testInstance.createSignalingDevice();
    device.start();
    await testInstance.waitForObservedStates(device, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED])
  })

  test('Device Connectivity Test 2: Close the connection', async () => {
    // This tests that close on a device closes the connection to the signaling service.
    const device = testInstance.createSignalingDevice();
    device.start();
    await testInstance.waitForObservedStates(device, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED])
    await device.close()
    await testInstance.waitForObservedStates(device, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED, SignalingConnectionState.CLOSED])
  })

  test('Device Connectivity Test 5: Device reconnects', async () => {
    // Test that the device reconnects if a WebSocket connection is terminated by the server.
    const device = testInstance.createSignalingDevice();
    device.start();
    await testInstance.waitForObservedStates(device, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED]);
    await testInstance.disconnectDevice();
    await testInstance.waitForObservedStates(device, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED, SignalingConnectionState.WAIT_RETRY, SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED]);
  })
})

describe("Device Connectivity Test 3: Initial HTTP Error", async () => {
  let testInstance: DeviceTestInstance
  beforeEach(async () => {
    testInstance = await DeviceTestInstance.create({ failHttp: true });
  })

  afterEach(async () => {
    await testInstance.destroyTest();
  })

  test('Device Connectivity Test 3: Initial HTTP Error', async () => {
    // This tests that the device retries connections to the signaling service if the initial HTTP request fails.
    // The connect does not fail but keeps retrying in the background.
    const device = testInstance.createSignalingDevice();
    device.start();
    await testInstance.waitForObservedStates(device, [SignalingConnectionState.CONNECTING, SignalingConnectionState.WAIT_RETRY])
  })
})

describe("Device Connectivity Test 4: Initial WebSocket Error", async () => {
  let testInstance: DeviceTestInstance
  beforeEach(async () => {
    testInstance = await DeviceTestInstance.create({ failWs: true });
  })

  afterEach(async () => {
    await testInstance.destroyTest();
  })

  test('Device Connectivity Test 4: Initial WebSocket connect error', async () => {
    // This tests that the device retries to connect to the signaling service if the initial websocket connection fails.
    const device = testInstance.createSignalingDevice();
    device.start();
    await testInstance.waitForObservedStates(device, [SignalingConnectionState.CONNECTING, SignalingConnectionState.WAIT_RETRY])
  })
})

describe("Connect to the signaling service with a wrong product id", async () => {
  let testInstance: DeviceTestInstance;
  let device: SignalingDevice;
  beforeEach(async () => {
    testInstance = await DeviceTestInstance.create({ productIdNotFound: true });
    device = testInstance.createSignalingDevice();
    device.start();
  })

  afterEach(async () => {
    await testInstance.destroyTest();
  })
  test('Observe product id not found', async () => {
    await testInstance.waitForObservedStates(device, [SignalingConnectionState.CONNECTING, SignalingConnectionState.WAIT_RETRY]);
    expect(testInstance.observedErrors.length).to.be.equal(1);
    const err = testInstance.observedErrors[0];
    expect(err).toBeInstanceOf(ProductIdNotFoundError)
  })
})

describe("Connect to the signaling service with a wrong device id", async () => {
  let testInstance: DeviceTestInstance;
  let device: SignalingDevice;
  beforeEach(async () => {
    testInstance = await DeviceTestInstance.create({ deviceIdNotFound: true });
    device = testInstance.createSignalingDevice();
    device.start();
  })

  afterEach(async () => {
    await testInstance.destroyTest();
  })
  test('Observe device id not found', async () => {
    await testInstance.waitForObservedStates(device, [SignalingConnectionState.CONNECTING, SignalingConnectionState.WAIT_RETRY]);
    expect(testInstance.observedErrors.length).to.be.equal(1);
    const err = testInstance.observedErrors[0];
    expect(err).toBeInstanceOf(DeviceIdNotFoundError)
  })
})
