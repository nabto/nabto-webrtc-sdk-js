import { createSignalingClient, SignalingChannelState, SignalingClient, SignalingConnectionState } from '../../src'

import { deleteTestClientByTestId, postTestClient, postTestClientByTestIdConnectDevice, postTestClientByTestIdDisconnectClient, postTestClientByTestIdDisconnectDevice, postTestClientByTestIdDropClientMessages, postTestClientByTestIdDropDeviceMessages, postTestClientByTestIdSendDeviceError, postTestClientByTestIdSendDeviceMessages, postTestClientByTestIdSendNewMessageType, postTestClientByTestIdWaitForDeviceMessages } from '../generated/client'

export interface ClientTestOptions {
  failHttp?: boolean
  failWs?: boolean
  extraClientConnectResponseData?: boolean
}

export class ClientTestInstance {
  observedConnectionStates: Array<SignalingConnectionState> = []
  constructor(public productId: string, public deviceId: string, public endpointUrl: string, public testId: string) {

  }
  static async create(options: ClientTestOptions): Promise<ClientTestInstance> {
    const f = await postTestClient({ body: options });
    if (f.data) {
      return new ClientTestInstance(f.data.productId, f.data.deviceId, f.data.endpointUrl, f.data.testId);
    } else {
      throw new Error("Missing response data")
    }
  }
  async destroyTest(): Promise<void> {
    await deleteTestClientByTestId({ path: { testId: this.testId } })
  }
  createSignalingClient(requireOnline?: boolean): SignalingClient {
    const signalingClient = createSignalingClient({ productId: this.productId, deviceId: this.deviceId, endpointUrl: this.endpointUrl, requireOnline: requireOnline })
    signalingClient.on("connectionstatechange", () => {
      this.observedConnectionStates.push(signalingClient.connectionState);
    })
    return signalingClient;

  }

  async connectDevice(): Promise<void> {
    await postTestClientByTestIdConnectDevice({ path: { testId: this.testId } })
  }
  async disconnectDevice(): Promise<void> {
    await postTestClientByTestIdDisconnectDevice({ path: { testId: this.testId } })
  }
  async dropDeviceMessages(): Promise<void> {
    await postTestClientByTestIdDropDeviceMessages({ path: { testId: this.testId } })
  }
  async disconnectClient(): Promise<void> {
    await postTestClientByTestIdDisconnectClient({ path: { testId: this.testId } })
  }
  async dropClientMessages(): Promise<void> {
    await postTestClientByTestIdDropClientMessages({ path: { testId: this.testId } })
  }
  async deviceWaitForMessagesIsReceived(messages: unknown[], timeout: number): Promise<unknown[]> {
    const response = await postTestClientByTestIdWaitForDeviceMessages({ path: { testId: this.testId }, body: { messages: messages, timeout: timeout } })
    if (response.data && response.data.messages) {
      return response.data?.messages;
    }
    throw new Error("Missing response messages")
  }

  async deviceSendMessages(messages: Array<string>) {
    await postTestClientByTestIdSendDeviceMessages({ path: { testId: this.testId }, body: { messages: messages } });
  }
  async deviceSendError(errorCode: string, errorMessage: string) {
    await postTestClientByTestIdSendDeviceError({ path: { testId: this.testId }, body: { errorCode: errorCode, errorMessage: errorMessage } });
  }


  async sendNewMessageType() {
    await postTestClientByTestIdSendNewMessageType({ path: { testId: this.testId }, body: {} })
  }
  async waitForObservedStates(client: SignalingClient, states: Array<SignalingConnectionState>): Promise<boolean> {
    return new Promise((resolve, _reject) => {
      if (JSON.stringify(this.observedConnectionStates) === JSON.stringify(states)) {
        resolve(true);
      } else {
        client.on("connectionstatechange", () => {
          if (JSON.stringify(this.observedConnectionStates) === JSON.stringify(states)) {
            resolve(true);
          }
        })
      }
    })
  }

  async waitForSignalingChannelState(signalingClient: SignalingClient, state: SignalingChannelState) {
    return new Promise<void>((resolve, _reject) => {
      signalingClient.on("channelstatechange", () => {
        if (signalingClient.channelState === state) {
          resolve();
        }
      })
    })

  }
  async waitForError(signalingClient: SignalingClient) {
    return new Promise<void>((resolve, reject) => {
      signalingClient.on("error", (error: unknown) => {
        reject(error);
      })
    })
  }
}
