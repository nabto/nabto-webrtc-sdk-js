import { afterEach, beforeEach, describe, test } from "vitest";
import { DeviceTestInstance } from "../../src/DeviceTestInstance";
import { SignalingConnectionState } from "@nabto/webrtc-signaling-common";

describe("test that the http protocol encodes correct data", async () => {
  let testInstance: DeviceTestInstance
  beforeEach(async () => {
    testInstance = await DeviceTestInstance.create({ extraDeviceConnectResponseData: true });
  })

  afterEach(async () => {
    await testInstance.destroyTest();
  })
  test("test that the device accepts more data in the json response than defined", async () => {
    const device = testInstance.createSignalingDevice();
    device.start();
    await testInstance.waitForObservedStates(device, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED]);
  })
})

describe("test that the ws protocol encodes correct data", async () => {
  let testInstance: DeviceTestInstance
  beforeEach(async () => {
    testInstance = await DeviceTestInstance.create({});
  })

  afterEach(async () => {
    await testInstance.destroyTest();
  })

  test("test that a device can accept websocket messages with a new type, without breaking", async () => {
    const device = testInstance.createSignalingDevice();
    device.start();
    await testInstance.waitForObservedStates(device, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED]);
    await testInstance.sendNewMessageType()
    // TODO ensure the device still works by creating a channel etc.
  })
})
