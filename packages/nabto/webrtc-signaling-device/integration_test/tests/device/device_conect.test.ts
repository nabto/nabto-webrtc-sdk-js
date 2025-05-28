import { test,  afterEach, beforeEach, describe, expect } from 'vitest'

import { SignalingChannel, SignalingChannelState, SignalingDevice } from '../../../src'
import { SignalingConnectionState } from '../../../src'
import { DeviceTestInstance } from '../../src/DeviceTestInstance'

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
    await testInstance.waitForObservedStates(device, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED])
  })
  test('close changes state to closed', async () => {
    const device = testInstance.createSignalingDevice();
    await testInstance.waitForObservedStates(device, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED])
    await device.stop()
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
    expect(createdChannel?.channelState).toBe(SignalingChannelState.ONLINE);
    const offlinePromise = new Promise<boolean>((resolve, _reject) => {
      createdChannel?.on("channelstatechange", () => {
        if (createdChannel?.channelState === SignalingChannelState.OFFLINE) {
          resolve(true)
        }
      })
    })
    await testInstance.disconnectClient(clientId);
    await createdChannel?.sendMessage("message")
    await offlinePromise
    expect(createdChannel?.channelState).toBe(SignalingChannelState.OFFLINE);
  })
})
