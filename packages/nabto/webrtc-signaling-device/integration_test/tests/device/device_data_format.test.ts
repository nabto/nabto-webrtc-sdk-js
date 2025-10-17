import { afterEach, beforeEach, describe, test, expect } from "vitest";
import { DeviceTestInstance } from "../../src/DeviceTestInstance";
import { SignalingConnectionState } from "@nabto/webrtc-signaling-common";
import { SignalingChannel, SignalingChannelState, SignalingDevice } from "../../../src";

// Device Connectivity Tests - Protocol Extensibility

describe("Device Connectivity Test 6: HTTP Protocol extensibility", async () => {
  let testInstance: DeviceTestInstance
  beforeEach(async () => {
    testInstance = await DeviceTestInstance.create({ extraDeviceConnectResponseData: true });
  })

  afterEach(async () => {
    await testInstance.destroyTest();
  })

  test("Device Connectivity Test 6: HTTP Protocol extensibility", async () => {
    // Observe that the device accepts extra fields in the JSON response.
    const device = testInstance.createSignalingDevice();
    device.start();
    await testInstance.waitForObservedStates(device, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED]);
  })
})

describe("Device Connectivity Test 7: WSS Protocol type extensibility", async () => {
  let testInstance: DeviceTestInstance
  let device: SignalingDevice
  beforeEach(async () => {
    testInstance = await DeviceTestInstance.create({});
  })

  afterEach(async () => {
    await testInstance.destroyTest();
  })

  test("Device Connectivity Test 7: WSS Protocol type extensibility", async () => {
    // Observe that the device discards messages with an unknown type.
    device = testInstance.createSignalingDevice();
    device.start();
    await testInstance.waitForObservedStates(device, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED]);
    await testInstance.sendNewMessageType()

    // Ensure the device still works by creating a channel
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
})

// Note: Device Connectivity Test 8 (WSS Protocol field extensibility) would require
// test server support to send known message types with unknown fields.
// This test is not currently implemented due to missing test infrastructure.
