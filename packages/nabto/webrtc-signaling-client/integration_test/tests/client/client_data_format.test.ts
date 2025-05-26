import { afterEach, beforeEach, describe, test } from "vitest";
import { ClientTestInstance } from "../../src/ClientTestInstance";
import { SignalingConnectionState } from "@nabto/webrtc-signaling-common";

describe("test that the http protocol is allowed to return extra data", async () => {
  let testInstance: ClientTestInstance
  beforeEach(async () => {
    testInstance = await ClientTestInstance.create({ extraClientConnectResponseData: true });
  })

  afterEach(async () => {
    await testInstance.destroyTest();
  })
  test("test that the client accepts more data in the json response than defined", async () => {
    const client = testInstance.createSignalingClient();
    await testInstance.waitForObservedStates(client, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED]);
  })
})

describe("test that the ws protocol accepts new message types", async () => {
  let testInstance: ClientTestInstance
  beforeEach(async () => {
    testInstance = await ClientTestInstance.create({});
  })

  afterEach(async () => {
    await testInstance.destroyTest();
  })
  test("test that a client can accept websocket messages with a new type, without breaking", async () => {
    const client = testInstance.createSignalingClient();
    await testInstance.waitForObservedStates(client, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED]);
    await testInstance.connectDevice()
    await testInstance.sendNewMessageType()
  })
})
