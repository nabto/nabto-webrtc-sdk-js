import { test, afterEach, beforeEach, describe, expect } from 'vitest'

import { DeviceTestInstance } from '../../src/DeviceTestInstance'
import { SignalingChannel, SignalingConnectionState, SignalingDevice } from '../../../src'

describe("Test that messages are sent reliably.", async () => {
  let testInstance: DeviceTestInstance
  let device: SignalingDevice
  let clientId: string
  let signalingChannel: SignalingChannel
  beforeEach(async () => {
    testInstance = await DeviceTestInstance.create({});
    device = testInstance.createSignalingDevice();
    device.start();
    await testInstance.waitForState(device, SignalingConnectionState.CONNECTED);
    clientId = await testInstance.createClient()
    const channelPromise = new Promise<SignalingChannel>((resolve, _reject) => {
      device.onNewSignalingChannel = async (channel: SignalingChannel, _authorized: boolean) => {
        resolve(channel);
      }
    });
    testInstance.clientSendMessages(clientId, ["hello"])
    signalingChannel = await channelPromise;
  })

  afterEach(async () => {
    await testInstance.destroyTest();
  })

  test("observe the client receives all sent messages", async () => {
    const messages = ["1", "2", "3"]
    for (const msg of messages) {
      await signalingChannel.sendMessage(msg);
    }
    const receivedMessages = await testInstance.clientWaitForMessagesIsReceived(clientId, messages, 200);
    expect(receivedMessages).toStrictEqual(messages)
  })

  test("observe that the device receives all sent messages", async () => {
    const messages = ["1", "2", "3"]

    const receivedMessages = new Array<unknown>();
    const promise = new Promise<void>((resolve, _reject) => {
      signalingChannel.on("message", async (msg: unknown) => {
        if (msg === "hello") {
          return; // discard the initial hello message
        }
        receivedMessages.push(msg);
        if (JSON.stringify(receivedMessages) === JSON.stringify(messages)) {
          resolve()
        }
      });
    })
    await testInstance.clientSendMessages(clientId, messages);
    await promise;
  })

  test("observe the client receives all sent messages, if the device reconnects", async () => {
    const messages = ["1", "2", "3"]
    for (const msg of messages) {
      await signalingChannel.sendMessage(msg);
    }
    const receivedMessages = await testInstance.clientWaitForMessagesIsReceived(clientId, messages, 200);
    expect(receivedMessages).toStrictEqual(messages)

    await testInstance.disconnectDevice();

    const messages2 = ["1", "2", "3"]
    for (const msg of messages2) {
      await signalingChannel.sendMessage(msg);
    }
    const expectedMessages = [...messages, ...messages2]
    const receivedMessages2 = await testInstance.clientWaitForMessagesIsReceived(clientId, expectedMessages, 4000);
    expect(receivedMessages2).toStrictEqual(expectedMessages)
  })
})
