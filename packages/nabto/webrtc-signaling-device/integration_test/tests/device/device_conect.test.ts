import { test,  afterEach, beforeEach, describe, expect } from 'vitest'

import { SignalingChannel, SignalingChannelState, SignalingDevice } from '../../../src'
import { SignalingConnectionState } from '../../../src'
import { DeviceTestInstance } from '../../src/DeviceTestInstance'
import { DeviceIdNotFoundError, ProductIdNotFoundError } from '@nabto/webrtc-signaling-common'

describe("Test device connection to the signaling service", async () => {
  let testInstance: DeviceTestInstance
  beforeEach(async () => {
    testInstance = await DeviceTestInstance.create({});
  })

  afterEach(async () => {
    await testInstance.destroyTest();
  })

  test('ok', async () => {
    const device = testInstance.createSignalingDevice();
    device.start();
    await testInstance.waitForObservedStates(device, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED])
  })
  test('close changes state to closed', async () => {
    const device = testInstance.createSignalingDevice();
    device.start();
    await testInstance.waitForObservedStates(device, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED])
    await device.close()
    await testInstance.waitForObservedStates(device, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED, SignalingConnectionState.CLOSED])
  })
})
describe("Test device connection to the signaling service which returns an http error", async () => {
  let testInstance: DeviceTestInstance
  beforeEach(async () => {
    testInstance = await DeviceTestInstance.create({ failHttp: true });
  })

  afterEach(async () => {
    await testInstance.destroyTest();
  })
  test('http fail', async () => {
    const device = testInstance.createSignalingDevice();
    device.start();
    // The connect does not fail but keeps retrying in the background.
    await testInstance.waitForObservedStates(device, [SignalingConnectionState.CONNECTING, SignalingConnectionState.WAIT_RETRY])
  })
})
describe("Test device connection to the signaling service which returns an ws error", async () => {
  let testInstance: DeviceTestInstance
  beforeEach(async () => {
    testInstance = await DeviceTestInstance.create({ failWs: true });
  })

  afterEach(async () => {
    await testInstance.destroyTest();
  })

  test('ws fail', async () => {
    const device = testInstance.createSignalingDevice();
    device.start();
    await testInstance.waitForObservedStates(device, [SignalingConnectionState.CONNECTING, SignalingConnectionState.WAIT_RETRY])
  })
})

describe("Test device connection to the signaling", async () => {
  let testInstance: DeviceTestInstance
  beforeEach(async () => {
    testInstance = await DeviceTestInstance.create({});
  })

  afterEach(async () => {
    await testInstance.destroyTest();
  })
  test('The device reconnects if the connection is terminated by the server', async () => {
    const device = testInstance.createSignalingDevice();
    device.start();
    await testInstance.waitForObservedStates(device, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED]);
    await testInstance.disconnectDevice();
    await testInstance.waitForObservedStates(device, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED, SignalingConnectionState.WAIT_RETRY, SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED]);
  })
})

describe("Test clients connect through the signaling service", async () => {
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
  test('Connect a client', async () => {
    await testInstance.waitForObservedStates(device, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED]);
    const clientId = await testInstance.createClient();
    const clientConnectedPromise = new Promise<boolean>((resolve, _reject) => {
      device.onNewSignalingChannel = async (_channel: SignalingChannel, _authorized: boolean) => {
        resolve(true)
      }
    });
    await testInstance.connectClient(clientId);
    await testInstance.clientSendMessages(clientId, ["test_message"])
    await clientConnectedPromise
  })

  test('Connect multiple clients', async () => {

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
  })

  test('Client is disconnected after being connected', async () => {
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
