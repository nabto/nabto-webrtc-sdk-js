import { test, afterEach, beforeEach, describe, expect } from 'vitest'

import { DeviceTestInstance } from '../../src/DeviceTestInstance'
import { SignalingChannel, SignalingConnectionState, SignalingDevice } from '../../../src'
import type { JSONValue } from '@nabto/webrtc-signaling-common'

// Reliability Tests

/**
 * Message receiver that starts collecting messages immediately when armed.
 * Filters out the initial "hello" message automatically.
 */
class MessageReceiver {
  private receivedMessages: string[] = [];
  private messageHandler: (msg: JSONValue) => Promise<void>;

  constructor(private channel: SignalingChannel) {
    this.messageHandler = async (msg: JSONValue) => {
      if (msg === "hello") {
        return; // discard the initial hello message
      }
      if (typeof msg === 'string') {
        this.receivedMessages.push(msg);
      }
    };
    this.channel.on("message", this.messageHandler);
  }

  /**
   * Wait for specific messages to be received.
   * @param expectedMessages - Array of expected messages to wait for
   * @param timeout - Timeout in milliseconds (default: 5000)
   * @returns Promise that resolves with the received messages or rejects on timeout
   */
  async waitForMessages(expectedMessages: string[], timeout: number = 5000): Promise<string[]> {
    return new Promise((resolve, reject) => {
      // Check if we already have the expected messages
      if (JSON.stringify(this.receivedMessages) === JSON.stringify(expectedMessages)) {
        resolve([...this.receivedMessages]);
        return;
      }

      const checkMessages = async () => {
        if (JSON.stringify(this.receivedMessages) === JSON.stringify(expectedMessages)) {
          clearTimeout(timeoutId);
          this.channel.off("message", checkMessages);
          resolve([...this.receivedMessages]);
        }
      };

      this.channel.on("message", checkMessages);

      const timeoutId = setTimeout(() => {
        this.channel.off("message", checkMessages);
        reject(new Error(`Timeout waiting for messages. Expected: ${JSON.stringify(expectedMessages)}, Received: ${JSON.stringify(this.receivedMessages)}`));
      }, timeout);
    });
  }

  /**
   * Get all messages received so far
   */
  getReceivedMessages(): string[] {
    return [...this.receivedMessages];
  }

  /**
   * Clean up the message handler
   */
  dispose(): void {
    this.channel.off("message", this.messageHandler);
  }
}

describe("Reliability Tests", async () => {
  let testInstance: DeviceTestInstance
  let device: SignalingDevice
  let clientId: string
  let signalingChannel: SignalingChannel
  let messageReceiver: MessageReceiver
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
    messageReceiver = new MessageReceiver(signalingChannel);
  })

  afterEach(async () => {
    messageReceiver.dispose();
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

    await testInstance.clientSendMessages(clientId, messages);
    const receivedMessages = await messageReceiver.waitForMessages(messages);
    expect(receivedMessages).toStrictEqual(messages);
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
  test("Reliability Test 4: Resend messages which are lost on a stale websocket connection", async () => {
    // 1. Create a channel to a peer which is connected.
    // Already done in beforeEach - signalingChannel is created and connected

    // 2. Send a message.
    const initialMessage = "1";
    await signalingChannel.sendMessage(initialMessage);

    // 3. Observe the message is received by the other peer.
    const receivedMessages1 = await testInstance.clientWaitForMessagesIsReceived(clientId, [initialMessage], 200);
    expect(receivedMessages1).toStrictEqual([initialMessage]);

    // 4. Let the websocket connection drop all further messages. use dropDeviceMessages
    await testInstance.dropDeviceMessages();

    // 5. send more messages.
    const messages2 = ["2", "3", "4"];
    for (const msg of messages2) {
      await signalingChannel.sendMessage(msg);
    }

    // 6. Call checkAlive (to trigger a reconnect.)
    device.checkAlive();

    // 7. Observe a new WebSocket is made and messages are received by the remote peer.
    const allExpectedMessages = [initialMessage, ...messages2];
    const receivedMessages2 = await testInstance.clientWaitForMessagesIsReceived(clientId, allExpectedMessages, 4000);
    expect(receivedMessages2).toStrictEqual(allExpectedMessages);
  });
  test("Reliability Test 5: Discard duplicate messages from the remote peer", async () => {
    // 1. Create a channel to a peer which is connected.
    // Already done in beforeEach - signalingChannel is created and connected
    // messageReceiver is armed from the start in beforeEach

    // 2. let the signaling service drop further messages from the local peer. use dropDeviceMessages
    await testInstance.dropDeviceMessages();

    // 3. send messages to the local peer from the remote peer. use clientSendMessages
    const messages1 = ["1", "2", "3"];
    await testInstance.clientSendMessages(clientId, messages1);

    // 4. acks from the local peer is lost.
    // (This happens automatically because dropDeviceMessages is active)

    // 5. call checkAlive to reconnect the peer.
    device.checkAlive();

    // 6. the local peer receives duplicated messages. (cannot be validated with the current api)
    // After reconnection, the remote peer will resend messages1 because it didn't receive acks

    // 7. send an extra message from the remote peer.
    const extraMessage = ["4"];
    await testInstance.clientSendMessages(clientId, extraMessage);

    // 8. observe all messages are received by the local peer and the duplicates has been removed.
    const expectedMessages = [...messages1, ...extraMessage];
    const receivedMessages = await messageReceiver.waitForMessages(expectedMessages, 5000);
    expect(receivedMessages).toStrictEqual(expectedMessages);
  });

  test("Reliability Test 6: Test that a peer resend unacked messages when a PEER_ONLINE event is received", async () => {
    // 1. Create a channel to a peer which is connected.
    // Already done in beforeEach - signalingChannel is created and connected

    // 2. Make the remote peer connection state, such that the client is not receiving PEER_OFFLINE messages.
    // Drop client messages so acknowledgments won't be sent back to the device
    await testInstance.dropClientMessages(clientId);

    // 3. Send messages to the remote peer.
    const messages = ["1", "2", "3"];
    for (const msg of messages) {
      await signalingChannel.sendMessage(msg);
    }

    // 4. Reconnect the remote peer.
    // Disconnect and reconnect the client to trigger a PEER_ONLINE event
    await testInstance.disconnectClient(clientId);
    await testInstance.connectClient(clientId);

    // Send a message to establish the connection
    await testInstance.clientSendMessages(clientId, ["reconnect"]);

    // 5. Observe the remote peer receives the messages.
    // The device should resend the unacknowledged messages when the client comes back online
    const receivedMessages = await testInstance.clientWaitForMessagesIsReceived(clientId, messages, 4000);
    expect(receivedMessages).toStrictEqual(messages);
  });
})
