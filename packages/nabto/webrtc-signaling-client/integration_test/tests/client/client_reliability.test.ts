import { test, afterEach, beforeEach, describe, expect } from 'vitest'

import { ClientTestInstance } from '../../src/ClientTestInstance'
import { SignalingChannelState, SignalingClient, SignalingConnectionState } from '../../../src'

describe("Test that messages are sent reliably.", async () => {
  let testInstance: ClientTestInstance
  let client: SignalingClient
  beforeEach(async () => {
    testInstance = await ClientTestInstance.create({});
    client = testInstance.createSignalingClient();
  })

  afterEach(async () => {
    await testInstance.destroyTest();
  })

  test("observe the device receives all sent messages", async () => {
    await testInstance.connectDevice();
    const signalingChannel = client;
    const messages = ["1", "2", "3"]
    for (const msg of messages) {
      await signalingChannel.sendMessage(msg);
    }
    const receivedMessages = await testInstance.deviceWaitForMessagesIsReceived(messages, 200);
    expect(receivedMessages).toStrictEqual(messages)
  })

  test("observe that the client receives all sent messages", async () => {
    await testInstance.connectDevice();
    const signalingChannel = client;
    const messages = ["1", "2", "3"]

    const receivedMessages = new Array<unknown>();
    const promise = new Promise<void>((resolve, _reject) => {
      signalingChannel.on("message", async (msg: unknown) => {
        receivedMessages.push(msg);
        if (JSON.stringify(receivedMessages) === JSON.stringify(messages)) {
          resolve()
        }
      })
    })
    await testInstance.deviceSendMessages(messages);
    await promise;
  })

  test("test that a client sends messages to a device which is connected later", async () => {
    await testInstance.waitForObservedStates(client, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED])
    const signalingChannel = client;
    const messages = ["1", "2", "3"]
    for (const msg of messages) {
      await signalingChannel.sendMessage(msg);
    }
    expect(signalingChannel.channelState).toBe(SignalingChannelState.OFFLINE);
    await testInstance.connectDevice();
    const receivedMessages = await testInstance.deviceWaitForMessagesIsReceived(messages, 200);
    expect(receivedMessages).toStrictEqual(messages)
  })

  test("test that a client receives messages from a device which is connected later", async () => {
    await testInstance.waitForObservedStates(client, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED])
    const signalingChannel = client;
    const messages = ["1", "2", "3"]

    const receivedMessages = new Array<unknown>();
    const promise = new Promise<void>((resolve, _reject) => {
      signalingChannel.on("message", async (msg: unknown) => {
        receivedMessages.push(msg);
        if (JSON.stringify(receivedMessages) === JSON.stringify(messages)) {
          resolve()
        }
      })
    })
    await testInstance.deviceSendMessages(messages);
    await testInstance.connectDevice();
    await promise;
  })

  test("test that a client resends messages when a device reconnects and the device has lost messages in the process", async () => {
    await testInstance.waitForObservedStates(client, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED])
    await testInstance.connectDevice();
    // instruct the device in dropping further received packets.
    await testInstance.dropDeviceMessages();
    const signalingChannel = client;
    const messages = ["1", "2", "3"]

    for (const msg of messages) {
      await signalingChannel.sendMessage(msg);
    }
    {
      const receivedMessages = await testInstance.deviceWaitForMessagesIsReceived(messages, 200);
      expect(receivedMessages).toStrictEqual([])
    }

    await testInstance.disconnectDevice();
    await testInstance.connectDevice();

    {
      const receivedMessages = await testInstance.deviceWaitForMessagesIsReceived(messages, 200);
      expect(receivedMessages).toStrictEqual(messages)
    }
  })
  test("test that the client resends messages when the websocket enters a stale state", async () => {
    await testInstance.waitForObservedStates(client, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED])
    await testInstance.connectDevice();

    // drop messages from the client, forcing it to reconnect.
    await testInstance.dropClientMessages();

    const signalingChannel = client;
    const messages = ["1", "2", "3"]

    for (const msg of messages) {
      await signalingChannel.sendMessage(msg);
    }
    {
      const receivedMessages = await testInstance.deviceWaitForMessagesIsReceived(messages, 200);
      expect(receivedMessages).toStrictEqual([])
    }

    // checkAlive based on network information or RTCPeerConnection events.
    signalingChannel.checkAlive();


    {
      const receivedMessages = await testInstance.deviceWaitForMessagesIsReceived(messages, 3000);
      expect(receivedMessages).toStrictEqual(messages)
    }
  })
})
