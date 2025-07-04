import { createSignalingClient, SignalingChannelState, SignalingClient, SignalingConnectionState } from '../../src'

import { deleteTestClientByTestId, postTestClient, postTestClientByTestIdConnectDevice, postTestClientByTestIdDisconnectClient, postTestClientByTestIdDisconnectDevice, postTestClientByTestIdDropClientMessages, postTestClientByTestIdDropDeviceMessages, postTestClientByTestIdGetActiveWebsockets, postTestClientByTestIdSendDeviceError, postTestClientByTestIdSendDeviceMessages, postTestClientByTestIdSendNewMessageType, postTestClientByTestIdWaitForDeviceMessages } from '../generated/client'

export interface ClientTestOptions {
  failHttp?: boolean
  failWs?: boolean
  extraClientConnectResponseData?: boolean
  requireAccessToken?: boolean
}

export class ClientTestInstance {
  observedConnectionStates: Array<SignalingConnectionState> = []
  constructor(private options : ClientTestOptions, public productId: string, public deviceId: string, public endpointUrl: string, public testId: string, public accessToken: string) {

  }
  static async create(options: ClientTestOptions): Promise<ClientTestInstance> {
    const f = await postTestClient({ body: options });
    if (f.data) {
      return new ClientTestInstance(options, f.data.productId, f.data.deviceId, f.data.endpointUrl, f.data.testId, f.data.accessToken);
    } else {
      throw new Error("Missing response data")
    }
  }
  async destroyTest(): Promise<void> {
    await deleteTestClientByTestId({ path: { testId: this.testId } })
  }
  createSignalingClient(requireOnline: boolean = false): SignalingClient {
    const signalingClient = createSignalingClient({ productId: this.productId, deviceId: this.deviceId, endpointUrl: this.endpointUrl, requireOnline: requireOnline, accessToken: this.options.requireAccessToken? this.accessToken : undefined });
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

  async getActiveWebSockets(): Promise<number> {
    const response = await postTestClientByTestIdGetActiveWebsockets({ path: { testId: this.testId }, body: {} })
    if (!response.data) {
      throw new Error("Missing response data");
    }
    return response.data?.activeWebSockets;
  }
  async deviceWaitForMessagesIsReceived(messages: unknown[], timeout: number): Promise < unknown[] > {
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
    console.log(this.observedConnectionStates)
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
  async waitForErrorRejectWithError(signalingClient: SignalingClient) {
    return new Promise<void>((resolve, reject) => {
      signalingClient.on("error", (error: unknown) => {
        reject(error);
      })
    })
  }
  async waitForErrorResolveWithError(signalingClient: SignalingClient) {
    return new Promise<unknown>((resolve, _reject) => {
      signalingClient.on("error", (error: unknown) => {
        resolve(error);
      })
    })
  }
}
