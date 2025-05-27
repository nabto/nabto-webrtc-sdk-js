import { test, afterEach, beforeEach, describe, expect } from 'vitest'

import { ClientTestInstance } from '../../src/ClientTestInstance'
import { SignalingChannelState, SignalingClient, SignalingErrorCodes } from '../../../src'
import { SignalingConnectionState } from '../../../src'

describe("Test of connection to the signaling service", async () => {
  let testInstance: ClientTestInstance
  beforeEach(async () => {
    testInstance = await ClientTestInstance.create({});
  })

  afterEach(async () => {
    await testInstance.destroyTest();
  })
  test('ok', async () => {
    const client = testInstance.createSignalingClient();
    await testInstance.waitForObservedStates(client, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED]);
  })
  test('connectionstate switches to close after calling close.', async () => {
    const client = testInstance.createSignalingClient();
    await testInstance.waitForObservedStates(client, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED]);
    await client.close();
    const expectedStates: Array<SignalingConnectionState> = [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED, SignalingConnectionState.CLOSED]
    await testInstance.waitForObservedStates(client, expectedStates);
  })
  test('connectionstate switches to close after calling close on the signalingchannel.', async () => {
    const client = testInstance.createSignalingClient();
    await testInstance.waitForObservedStates(client, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED]);
    await client.close();
    const expectedStates: Array<SignalingConnectionState> = [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED, SignalingConnectionState.CLOSED]
    await testInstance.waitForObservedStates(client, expectedStates);
  })
})

describe("Test of failing http connection to the signaling service", async () => {
  let testInstance: ClientTestInstance
  beforeEach(async () => {
    testInstance = await ClientTestInstance.create({ failHttp: true });
  })

  afterEach(async () => {
    await testInstance.destroyTest();
  })
  test('http service returns bad request', async () => {
    const client = testInstance.createSignalingClient();
    expect(client.connectionState).to.be.equal(SignalingConnectionState.NEW);
    const observedStates = testInstance.waitForObservedStates(client, [SignalingConnectionState.CONNECTING, SignalingConnectionState.FAILED])
    await expect(testInstance.waitForError(client)).rejects.toThrowError('Bad')
    await observedStates;
    expect(client.connectionState).to.be.equal(SignalingConnectionState.FAILED);
    client.close();
    expect(client.connectionState).to.be.equal(SignalingConnectionState.CLOSED);
  })
})



describe("Test of failing websocket connection to the signaling service", async () => {
  let testInstance: ClientTestInstance
  beforeEach(async () => {
    testInstance = await ClientTestInstance.create({failWs: true});
  })

  afterEach(async () => {
    await testInstance.destroyTest();
  })
  test('websocket service returns error', async () => {
    const client = testInstance.createSignalingClient();
    await expect(() => testInstance.waitForError(client)).rejects.toThrowError('error')
  })
})

describe("Test reconnection", async() => {
  let testInstance: ClientTestInstance
  beforeEach(async () => {
    testInstance = await ClientTestInstance.create({});
  })

  afterEach(async () => {
    await testInstance.destroyTest();
  })
  test('The client reconnects if the connection is terminated by the server', async () => {
    const client = testInstance.createSignalingClient();

    const experiencedStates: Array<SignalingConnectionState> = [];
    client.on("connectionstatechange", () => {
      experiencedStates.push(client.connectionState);
    });

    const expectedStates: Array<SignalingConnectionState> = [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED, SignalingConnectionState.WAIT_RETRY, SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED]

    await testInstance.waitForObservedStates(client, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED])
    await testInstance.disconnectClient();

    const stateChangePromise = new Promise<boolean>(resolve => {
      client.on("connectionstatechange", () => {
        if (client.connectionState === SignalingConnectionState.CONNECTED) {
          resolve(true)
        }
      });
    });
    await stateChangePromise
    expect(experiencedStates).toStrictEqual(expectedStates)
  })
})


describe("Test connection to a device through the signaling service", async () => {
  let testInstance: ClientTestInstance;
  let client: SignalingClient;
  beforeEach(async () => {
    testInstance = await ClientTestInstance.create({});
    client = testInstance.createSignalingClient();
  })

  afterEach(async () => {
    await testInstance.destroyTest();
  })
  test('Device is offline', async () => {
    await testInstance.waitForObservedStates(client, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED])
    expect(client.channelState).toBe(SignalingChannelState.OFFLINE);
  })

  test('Device becomes online', async () => {
    await testInstance.waitForObservedStates(client, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED])
    expect(client.channelState).toBe(SignalingChannelState.OFFLINE);

    const stateChangePromise = new Promise<boolean>(resolve => {
      client.on("channelstatechange", () => resolve(true));
    });
    client.sendMessage({})
    await testInstance.connectDevice();
    const status = await stateChangePromise;
    expect(status).toBe(true);
    expect(client.channelState).toBe(SignalingChannelState.ONLINE);
  })
})


describe("Test connection to a device through the signaling service, the device is online before the client connects", async () => {
  let testInstance: ClientTestInstance;
  let client: SignalingClient;
  beforeEach(async () => {
    testInstance = await ClientTestInstance.create({});
    await testInstance.connectDevice();
    client = testInstance.createSignalingClient();
  })

  afterEach(async () => {
    await testInstance.destroyTest();
  })

  test('Device is online', async () => {
    await testInstance.waitForObservedStates(client, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED])
    expect(client.channelState).toBe(SignalingChannelState.ONLINE);
  })
})




describe("Test connection to a device which is offline but is required to be online", async () => {
  let testInstance: ClientTestInstance;
  let client: SignalingClient;
  beforeEach(async () => {
    testInstance = await ClientTestInstance.create({});
    client = testInstance.createSignalingClient(true);
  })

  afterEach(async () => {
    await testInstance.destroyTest();
  })
  test('Device is offline', async () => {
    await expect(testInstance.waitForError(client)).rejects.toThrowError('The requested device is not online')
  })
})

describe("Signaling channel states", async () => {
  let testInstance: ClientTestInstance;
  let client: SignalingClient;
  beforeEach(async () => {
    testInstance = await ClientTestInstance.create({});
    client = testInstance.createSignalingClient();
  })

  afterEach(async () => {
    await testInstance.destroyTest();
  })
  test("The initial state is new.", async () => {
    expect(client.channelState).to.be.equal(SignalingChannelState.NEW);
  })
  test("If an error occurs the state is error", async () => {
    expect(client.channelState).to.be.equal(SignalingChannelState.NEW)
    await testInstance.waitForObservedStates(client, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED]);
    expect(client.channelState).to.be.equal(SignalingChannelState.OFFLINE);
    await testInstance.connectDevice();
    expect(client.channelState).to.be.equal(SignalingChannelState.ONLINE);
    await testInstance.deviceSendError(SignalingErrorCodes.CHANNEL_NOT_FOUND, "Channel is not found");
    expect(client.channelState).to.be.equal(SignalingChannelState.FAILED);
    console.log(client.channelState)
    client.close();
    expect(client.channelState).to.be.equal(SignalingChannelState.CLOSED);

  })
  test("After closed has been called the state is closed", async () => {
    await testInstance.waitForObservedStates(client, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED]);
    expect(client.channelState).to.be.equal(SignalingChannelState.OFFLINE);
    client.close();
    expect(client.channelState).to.be.equal(SignalingChannelState.CLOSED);
  })
})
