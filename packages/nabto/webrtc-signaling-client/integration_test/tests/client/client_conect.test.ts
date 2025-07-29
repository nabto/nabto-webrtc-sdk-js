import { test, afterEach, beforeEach, describe, expect } from 'vitest'

import { ClientTestInstance } from '../../src/ClientTestInstance'
import {
  DeviceOfflineError,
  SignalingChannelState,
  SignalingClient,
  SignalingErrorCodes,
  SignalingConnectionState,
  ProductIdNotFoundError,
  DeviceIdNotFoundError,
} from "../../../src";
import { SignalingError } from '@nabto/webrtc-signaling-common'

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
    await client.start();
  })
  test('connectionstate switches to close after calling close.', async () => {
    const client = testInstance.createSignalingClient();
    client.start();
    await testInstance.waitForObservedStates(client, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED]);
    await client.close();
    const expectedStates: Array<SignalingConnectionState> = [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED, SignalingConnectionState.CLOSED]
    await testInstance.waitForObservedStates(client, expectedStates);
  })
  test('connectionstate switches to close after calling close on the signalingchannel.', async () => {
    const client = testInstance.createSignalingClient();
    client.start();
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
    client.start()
    const observedStates = testInstance.waitForObservedStates(client, [SignalingConnectionState.CONNECTING, SignalingConnectionState.FAILED])
    await expect(testInstance.waitForErrorRejectWithError(client)).rejects.toThrowError('Bad')
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
    client.start()
    await expect(() => testInstance.waitForErrorRejectWithError(client)).rejects.toThrowError('error')
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

    client.start();
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
    client.start();
    await testInstance.waitForObservedStates(client, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED])
    expect(client.channelState).toBe(SignalingChannelState.DISCONNECTED);
  })

  test('Device is online', async () => {
    await testInstance.connectDevice();
    client.start();
    await testInstance.waitForObservedStates(client, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED])
    expect(client.channelState).toBe(SignalingChannelState.CONNECTED);
  })

  test('Device becomes online', async () => {
    client.start();
    await testInstance.waitForObservedStates(client, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED])
    expect(client.channelState).toBe(SignalingChannelState.DISCONNECTED);

    const stateChangePromise = new Promise<boolean>(resolve => {
      client.on("channelstatechange", () => resolve(true));
    });
    client.sendMessage({})
    await testInstance.connectDevice();
    const status = await stateChangePromise;
    expect(status).toBe(true);
    expect(client.channelState).toBe(SignalingChannelState.CONNECTED);
  })
  test('Device is online', async () => {
    await testInstance.connectDevice();
    client.start();
    await testInstance.waitForSignalingChannelState(client, SignalingChannelState.CONNECTED);
    expect(client.channelState).toBe(SignalingChannelState.CONNECTED);
  })
})

describe("Test connection to a device which is offline but is required to be online", async () => {
  let testInstance: ClientTestInstance;
  let client: SignalingClient;
  beforeEach(async () => {
    testInstance = await ClientTestInstance.create({});
    client = testInstance.createSignalingClient({ requireOnline: true });
  })

  afterEach(async () => {
    await testInstance.destroyTest();
  })
  test('Device is offline', async () => {
    client.start();

    await expect(testInstance.waitForErrorRejectWithError(client)).rejects.toThrowError(DeviceOfflineError)
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
    client.start();
    await testInstance.waitForObservedStates(client, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED]);
    expect(client.channelState).to.be.equal(SignalingChannelState.DISCONNECTED);
    await testInstance.connectDevice();
    expect(client.channelState).to.be.equal(SignalingChannelState.CONNECTED);
    await testInstance.deviceSendError(SignalingErrorCodes.CHANNEL_NOT_FOUND, "Channel is not found");
    expect(client.channelState).to.be.equal(SignalingChannelState.FAILED);
    console.log(client.channelState)
    client.close();
    expect(client.channelState).to.be.equal(SignalingChannelState.CLOSED);

  })
  test("After closed has been called the state is closed", async () => {
    client.start();
    await testInstance.waitForObservedStates(client, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED]);
    expect(client.channelState).to.be.equal(SignalingChannelState.DISCONNECTED);
    client.close();
    expect(client.channelState).to.be.equal(SignalingChannelState.CLOSED);
  })
  test("Client connectivity test 9", async () => {
    client.start();
    await testInstance.waitForObservedStates(client, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED]);
    await testInstance.dropClientMessages();
    client.checkAlive();
    await testInstance.waitForObservedStates(client, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED, SignalingConnectionState.WAIT_RETRY, SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED]);
    const activeWebSockets = await testInstance.getActiveWebSockets();
    expect(activeWebSockets).toBe(1);
  })
  test("Client connectivity test 10", async () => {
    client.start();
    await testInstance.waitForObservedStates(client, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED]);
    await testInstance.connectDevice();
    const waitForError = testInstance.waitForErrorResolveWithError(client);
    const errorCode = "INTERNAL_ERROR";
    const errorMessage = "Internal error.";
    await testInstance.deviceSendError(errorCode, errorMessage);
    const error = await waitForError;
    if (error instanceof SignalingError) {
      expect(error.errorCode).toBe(errorCode);
      expect(error.errorMessage).toBe(errorMessage);
    } else {
      throw new Error('Expected error to be instance of SignalingError');
    }
  })
})

describe("Client Connectivity Test 13, require an access token", async () => {
  let testInstance: ClientTestInstance;
  let client: SignalingClient;
  beforeEach(async () => {
    testInstance = await ClientTestInstance.create({requireAccessToken: true});
    client = testInstance.createSignalingClient();
  })

  afterEach(async () => {
    await testInstance.destroyTest();
  })
  test("Client connectivity test 13", async () => {
    client.start();
    await testInstance.waitForObservedStates(client, [SignalingConnectionState.CONNECTING, SignalingConnectionState.CONNECTED]);
  });
})

describe("Client Connectivity Test 14, fail if the access token is invalid", async () => {
  let testInstance: ClientTestInstance;
  let client: SignalingClient;
  beforeEach(async () => {
    testInstance = await ClientTestInstance.create({ requireAccessToken: true });
    testInstance.accessToken = "invalid";
    client = testInstance.createSignalingClient();
  })

  afterEach(async () => {
    await testInstance.destroyTest();
  })
  test("Client Connectivity Test 14", async () => {
    client.start();
    await expect(testInstance.waitForErrorRejectWithError(client)).rejects.toThrow("Access Denied");
    await testInstance.waitForObservedStates(client, [SignalingConnectionState.CONNECTING, SignalingConnectionState.FAILED]);
  });
})

describe("Client Connectivity Test 15, catchable PRODUCT_ID_NOT_FOUND", async () => {
  let testInstance: ClientTestInstance;
  let client: SignalingClient;
  beforeEach(async () => {
    testInstance = await ClientTestInstance.create({ requireAccessToken: true, productIdNotFound: true });
    testInstance.accessToken = "invalid";
    client = testInstance.createSignalingClient();
  })

  afterEach(async () => {
    await testInstance.destroyTest();
  })
  test("Client Connectivity Test 14", async () => {
    client.start();
    const error = await testInstance.waitForErrorResolveWithError(client);
    expect(error).toBeInstanceOf(ProductIdNotFoundError)
    await testInstance.waitForObservedStates(client, [SignalingConnectionState.CONNECTING, SignalingConnectionState.FAILED]);
  });
})

describe("Client Connectivity Test 16, catchable DEVICE_ID_NOT_FOUND", async () => {
  let testInstance: ClientTestInstance;
  let client: SignalingClient;
  beforeEach(async () => {
    testInstance = await ClientTestInstance.create({ requireAccessToken: true, deviceIdNotFound: true });
    testInstance.accessToken = "invalid";
    client = testInstance.createSignalingClient();
  })

  afterEach(async () => {
    await testInstance.destroyTest();
  })
  test("Client Connectivity Test 14", async () => {
    client.start();
    const error = await testInstance.waitForErrorResolveWithError(client);
    expect(error).toBeInstanceOf(DeviceIdNotFoundError)
    await testInstance.waitForObservedStates(client, [SignalingConnectionState.CONNECTING, SignalingConnectionState.FAILED]);
  });
})
