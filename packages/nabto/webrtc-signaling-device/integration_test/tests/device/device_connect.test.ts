import { test,  afterEach, beforeEach, describe, expect } from 'vitest'

import { SignalingChannel, SignalingChannelState, SignalingDevice, DeviceIdNotFoundError, ProductIdNotFoundError } from '../../../src'
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

// Device Client Tests

describe("Device Client Tests", async () => {
  let testInstance: DeviceTestInstance;
  let device: SignalingDevice;
  beforeEach(async () => {
    testInstance = await DeviceTestInstance.create({});
    device = testInstance.createSignalingDevice();
    device.start();
  })

  afterEach(async () => {
    await testInstance.destroyTest();
  })

  test('Device Client Test 1: Success - client can connect to a device', async () => {
    // Test that a client can connect to a device.
    await testInstance.waitForObservedStates(device, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED]);
    const clientId = await testInstance.createClient();
    const clientConnectedPromise = new Promise<boolean>((resolve, _reject) => {
      device.onNewSignalingChannel = async (channel: SignalingChannel, _authorized: boolean) => {
        expect(channel.channelState).toBe(SignalingChannelState.CONNECTED);
        resolve(true)
      }
    });
    await testInstance.connectClient(clientId);
    await testInstance.clientSendMessages(clientId, ["test_message"])
    await clientConnectedPromise
  })

  test('Device Client Test 2: Client disconnect', async () => {
    // Test that a channel state switches to DISCONNECTED if a client is disconnected and a message is sent to it.
    await testInstance.waitForObservedStates(device, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED]);
    const clientId = await testInstance.createClient();
    let createdChannel : SignalingChannel | undefined;
    const clientConnectedPromise = new Promise<boolean>((resolve, _reject) => {
      device.onNewSignalingChannel = async (channel: SignalingChannel, _authorized: boolean) => {
        createdChannel = channel;
        resolve(true)
      }
    });
    await testInstance.connectClient(clientId);
    await testInstance.clientSendMessages(clientId, ["test_message"])
    await clientConnectedPromise
    expect(createdChannel).not.toBeNull()
    expect(createdChannel?.channelState).toBe(SignalingChannelState.CONNECTED);

    const offlinePromise = new Promise<boolean>((resolve, _reject) => {
      createdChannel?.on("channelstatechange", () => {
        if (createdChannel?.channelState === SignalingChannelState.DISCONNECTED) {
          resolve(true)
        }
      })
    })
    await testInstance.disconnectClient(clientId);
    await createdChannel?.sendMessage("message")
    await offlinePromise
    expect(createdChannel?.channelState).toBe(SignalingChannelState.DISCONNECTED);
  })

  test('Device Client Test 3: Connect multiple clients', async () => {
    // Test that a device can handle multiple clients.
    await testInstance.waitForObservedStates(device, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED]);

    const numberOfClients = 10;
    const channels = new Array<SignalingChannel>()
    const clientsConnectedPromise = new Promise<boolean>((resolve, _reject) => {
      device.onNewSignalingChannel = async (channel: SignalingChannel, _authorized: boolean) => {
        channels.push(channel);
        console.log(channels.length)
        if (channels.length === numberOfClients) {
          resolve(true)
        }
      }
    });
    for (let i = 0; i < numberOfClients; i++) {
      const clientId = await testInstance.createClient();
      await testInstance.connectClient(clientId);
      await testInstance.clientSendMessages(clientId, ["message"]);
    }
    await clientsConnectedPromise;
    expect(channels.length).toBe(numberOfClients);
  })

  test('Device Client Test 4: Channel close', async () => {
    // Test that a channel can be closed.
    await testInstance.waitForObservedStates(device, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED]);
    const clientId = await testInstance.createClient();
    let createdChannel : SignalingChannel | undefined;
    const clientConnectedPromise = new Promise<boolean>((resolve, _reject) => {
      device.onNewSignalingChannel = async (channel: SignalingChannel, _authorized: boolean) => {
        createdChannel = channel;
        resolve(true)
      }
    });
    await testInstance.connectClient(clientId);
    await testInstance.clientSendMessages(clientId, ["test_message"])
    await clientConnectedPromise
    expect(createdChannel).not.toBeNull()
    expect(createdChannel?.channelState).toBe(SignalingChannelState.CONNECTED);

    const closedPromise = new Promise<boolean>((resolve, _reject) => {
      createdChannel?.on("channelstatechange", () => {
        if (createdChannel?.channelState === SignalingChannelState.CLOSED) {
          resolve(true)
        }
      })
    })
    await createdChannel?.close()
    await closedPromise
    expect(createdChannel?.channelState).toBe(SignalingChannelState.CLOSED);
    // Note: Observing that the client gets a CHANNEL_CLOSED error would require client-side test infrastructure
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
