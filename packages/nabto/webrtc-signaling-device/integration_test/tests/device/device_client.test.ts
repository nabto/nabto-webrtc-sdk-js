import { test, afterEach, beforeEach, describe, expect } from 'vitest'

import { SignalingChannel, SignalingChannelState, SignalingDevice } from '../../../src'
import { SignalingConnectionState } from '../../../src'
import { DeviceTestInstance } from '../../src/DeviceTestInstance'

// Device Client Tests
// Reference: device_client_tests.md

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
    // TBD: Observe the channel is closed in the integration test server.
  })
})
