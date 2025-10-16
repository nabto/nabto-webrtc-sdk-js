import { test, afterEach, beforeEach, describe, expect } from 'vitest'

import { DeviceTestInstance } from '../../src/DeviceTestInstance'
import { SignalingChannel, SignalingConnectionState, SignalingDevice } from '../../../src'

// Reliability Tests

describe("Reliability Tests", async () => {
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

  test("Reliability Test 1: Successfully sending messages", async () => {
    // Test that messages can be sent by a peer.
    const messages = ["1", "2", "3"]
    for (const msg of messages) {
      await signalingChannel.sendMessage(msg);
    }
    const receivedMessages = await testInstance.clientWaitForMessagesIsReceived(clientId, messages, 200);
    expect(receivedMessages).toStrictEqual(messages)
  })

  test("Reliability Test 2: Successfully receiving messages", async () => {
    // Test that messages can be received by a peer.
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

  test("Reliability Test 3: Resend messages when a peer becomes online", async () => {
    // Test that messages which are sent to a peer which is DISCONNECTED,
    // become retransmitted when the peer becomes online.
    const messages = ["1", "2", "3"]
    for (const msg of messages) {
      await signalingChannel.sendMessage(msg);
    }
    const receivedMessages = await testInstance.clientWaitForMessagesIsReceived(clientId, messages, 200);
    expect(receivedMessages).toStrictEqual(messages)

    await testInstance.disconnectDevice();

    const messages2 = ["4", "5", "6"]
    for (const msg of messages2) {
      await signalingChannel.sendMessage(msg);
    }
    const expectedMessages = [...messages, ...messages2]
    const receivedMessages2 = await testInstance.clientWaitForMessagesIsReceived(clientId, expectedMessages, 4000);
    expect(receivedMessages2).toStrictEqual(expectedMessages)
  })
})

// Note: The following reliability tests require additional test infrastructure support:
//
// Reliability Test 4: Resend messages which are lost on a stale websocket connection
//   - Requires: checkAlive() method on SignalingChannel or SignalingDevice
//   - Requires: Ability to make websocket drop messages without disconnecting
//
// Reliability Test 5: Discard duplicates from the remote peer
//   - Requires: checkAlive() method to trigger reconnects
//   - Requires: Fine-grained control over message acknowledgments
//   - Requires: Ability to observe duplicate detection
//
// Reliability Test 6: Test that a peer resend unacked messages when a PEER_ONLINE event is received
//   - Requires: Ability to control connection state visibility (prevent PEER_OFFLINE messages)
//   - Requires: checkAlive() or similar mechanism to trigger reconnection
//   - Requires: PEER_ONLINE event observation
//
// These tests are not currently implemented but are documented in the specification.
