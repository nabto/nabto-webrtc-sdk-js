import { ServerWebSocket } from "bun";

import { Elysia, t, Static } from 'elysia'
import { SimulatedDevice } from "./SimulatedDevice";
import { Routing, RoutingTypes, SignalingError } from "../WebsocketProtocolDataTypes";

const messageType = t.Object({
  type: t.String(),
  authorized: t.Optional(t.Boolean()),
  channelId: t.Optional(t.String())
})

type Message = Static<typeof messageType>

export const TestClientOptionsSchema = t.Object({
  failHttp: t.Optional(t.Boolean()),
  failWs: t.Optional(t.Boolean()),
  endpointUrl: t.Optional(t.String({description: "specify the endpoint url the server returns in the test create response and the websocket url. Format http://<ip>:<port>"})),
  extraClientConnectResponseData: t.Optional(t.Boolean()),
  requireAccessToken: t.Optional(t.Boolean({ description: "Set to true to force the client to use an access token when connecting" })),
  productIdNotFound: t.Optional(t.Boolean({ description: "set to true to force the client api to return a PRODUCT_ID_NOT_FOUND error" })),
  deviceIdNotFound: t.Optional(t.Boolean({ description: "set to true to force the client api to return a DEVICE_ID_NOT_FOUND error"})),
});

export type TestClientOptions = Static<typeof TestClientOptionsSchema>

type wsCloseCallback = (errorCode: number, message: string) => void
type wsSendMessageCallback = (message: string) => void

class TestClientInstance implements TestInstance{
  channelId: string = crypto.randomUUID();
  productId: string = crypto.randomUUID();
  deviceId: string = crypto.randomUUID();
  accessToken: string = crypto.randomUUID();
  testId: string = this.productId;
  endpointUrl: string = "http://127.0.0.1:13745";

  device: SimulatedDevice;

  droppingClientMessages : boolean = false

  wsSender?: wsSendMessageCallback
  wsClose?: wsCloseCallback
  activeWebSockets: number = 0;
  requireAccessToken: boolean;
  constructor(public options: TestClientOptions) {
    this.device = new SimulatedDevice(this.channelId, (msg: Routing) => { this.sendMessage(msg) });
    if (options.endpointUrl) {
      this.endpointUrl = options.endpointUrl;
    }
    this.requireAccessToken = options.requireAccessToken ?? false;
  }
  clientConnected(wsSender: wsSendMessageCallback, wsClose: wsCloseCallback) {
    this.wsSender = wsSender;
    this.wsClose = wsClose;
    this.droppingClientMessages = false;
    this.device.handlePeerConnected();
    this.activeWebSockets++;
  }

  async connectDevice() {
    this.device.connect();
  }

  isDeviceConnected() {
    return this.device.connected;
  }

  disconnectDevice() {
    this.device.disconnect();
  }

  handleWsClose(code: number, reason: string) {
    this.activeWebSockets--;
  }

  async dropDeviceMessages() {
    await this.device.dropMessages();
  }

  async disconnectClient() {
    this.wsClose?.(4042, "Disconnected by the test")
  }
  async dropClientMessages() {
    this.droppingClientMessages = true;
  }
  async sendNewMessageType() {
    this.wsSender?.(JSON.stringify({"type": "NEW_MESSAGE_TYPE", "new_message_type_field": "data"}))
  }

  async sendNewFieldInKnownMessageType() {
    this.wsSender?.(JSON.stringify({"type": "PEER_CONNECTED", "channelId": "42", "new_field": "data"}))
  }

  async getActiveWebSockets(): Promise<number> {

    // This is a stub, in a real implementation this would return the number of active WebSocket connections
    return 1;
  }

  sendMessage(msg: Routing) {
    console.log("Sending routing message", msg);
    this.wsSender?.(JSON.stringify(msg));
  }

  async waitForMessages(messages: unknown[], timeout: number): Promise<unknown[]>
  {
    return await this.device.waitForMessages(messages, timeout)
  }
  async waitForDeviceError(timeout: number): Promise<SignalingError | undefined>
  {
    return await this.device.waitForError(timeout)
  }
  getReceivedMessages(): unknown[] {
    return this.device.receivedMessages;
  }

  handleWsMessage(msg: Routing) {
    if (this.droppingClientMessages) {
      return;
    }
    if (msg.type === RoutingTypes.PING) {
      this.sendMessage({ type: RoutingTypes.PONG })
    } else if (msg.type === RoutingTypes.PONG) {
      // discard pongs
    } else {
      this.device.handleWsMessage(msg);
    }
  }

  async deviceSendMessages(messages: unknown[]) {
    await this.device.sendMessages(messages);
  }

  async deviceSendError(errorCode: string, errorMessage?: string) {
    await this.device.sendError(errorCode, errorMessage);
  }

  close() {

  }
}


export class TestClients {
  idCounter: number = 0;
  clients: Array<TestClientInstance> = new Array<TestClientInstance>()

  createTestClient(options: TestClientOptions) {
    const testClient = new TestClientInstance(options)
    this.clients.push(testClient);
    return testClient;
  }

  getClientByProductId(productId: string): TestClientInstance | undefined {
    for (let n = 0; n < this.clients.length; n++) {
      const c = this.clients[n];
      if (c.productId === productId) {
        return c;
      }
    }
    return undefined;
  }

  getByTestId(testId: string): TestClientInstance | undefined {

    for (let n = 0; n < this.clients.length; n++) {
      const c = this.clients[n];
      if (c.testId === testId) {
        return c;
      }
    }
    return undefined;
  }
  deleteTest(testId: string) {
    const test = this.getByTestId(testId);
    test?.close();
    this.clients = this.clients.filter((a) => a.testId !== testId)
  }
}


export const testClientsPlugin = new Elysia({name: "testClients"})
  .decorate("testClients", new TestClients())
