import { createSignalingDevice, SignalingConnectionState, SignalingDevice } from '../../src'

import { deleteTestDeviceByTestId, postTestDevice, postTestDeviceByTestIdClients, postTestDeviceByTestIdClientsByClientIdConnect, postTestDeviceByTestIdClientsByClientIdDisconnect, postTestDeviceByTestIdClientsByClientIdDropClientMessages, postTestDeviceByTestIdClientsByClientIdSendMessages, postTestDeviceByTestIdClientsByClientIdWaitForMessages, postTestDeviceByTestIdDisconnectDevice, postTestDeviceByTestIdDropDeviceMessages, postTestDeviceByTestIdSendNewMessageType } from '../generated/client'

export interface DeviceTestOptions {
  failHttp?: boolean
  failWs?: boolean
  extraDeviceConnectResponseData?: boolean
  productIdNotFound?: boolean
  deviceIdNotFound?: boolean
}

export class DeviceTestInstance {
  observedConnectionStates: Array<SignalingConnectionState> = []
  observedErrors: Array<unknown> = []
  constructor(public productId: string, public deviceId: string, public endpointUrl: string, public testId: string, public accessToken: string) {

  }

  static async create(options: DeviceTestOptions): Promise<DeviceTestInstance> {
    const f = await postTestDevice({ body: options });
    if (f.data) {
      return new DeviceTestInstance(f.data.productId, f.data.deviceId, f.data.endpointUrl, f.data.testId, f.data.accessToken);
    } else {
      throw new Error("Missing http response data");
    }
  }

  async destroyTest(): Promise<void> {
    await deleteTestDeviceByTestId({ path: { testId: this.testId } })
  }

  createSignalingDevice(): SignalingDevice {
    const signalingDevice = createSignalingDevice({ productId: this.productId, deviceId: this.deviceId, endpointUrl: this.endpointUrl, tokenGenerator: async () => { return this.accessToken } })
    signalingDevice.on("connectionstatechange", () => {
      this.observedConnectionStates.push(signalingDevice.connectionState);
    })
    signalingDevice.on("error", (error: unknown) => {
      this.observedErrors.push(error);
    })

    return signalingDevice;
  }

  async createClient(): Promise<string> {
    const response = await postTestDeviceByTestIdClients({ path: { testId: this.testId } })
    if (response.data) {
      console.log(`Client with id: ${response.data.clientId} created.`)
      return response.data.clientId;
    } else {
      throw new Error("Missing response data")
    }
  }

  async connectClient(clientId: string): Promise<void> {
    await postTestDeviceByTestIdClientsByClientIdConnect({ path: { testId: this.testId, clientId: clientId } })
  }
  async disconnectClient(clientId: string): Promise<void> {
    await postTestDeviceByTestIdClientsByClientIdDisconnect({ path: { testId: this.testId, clientId: clientId } })
  }
  async dropClientMessages(clientId: string): Promise<void> {
    await postTestDeviceByTestIdClientsByClientIdDropClientMessages({ path: { testId: this.testId, clientId: clientId } })
  }
  async disconnectDevice(): Promise<void> {
    await postTestDeviceByTestIdDisconnectDevice({ path: { testId: this.testId } })
  }
  async dropDeviceMessages(): Promise<void> {
    await postTestDeviceByTestIdDropDeviceMessages({ path: { testId: this.testId } })
  }
  async clientWaitForMessagesIsReceived(clientId: string, messages: string[], timeout: number): Promise<string[]> {
    const response = await postTestDeviceByTestIdClientsByClientIdWaitForMessages({ path: { testId: this.testId, clientId: clientId }, body: { messages: messages, timeout: timeout } })
    if (response.data && response.data.messages) {
      const res: string[] = [];
      for (const m of response.data.messages) {
        if (typeof m === 'string') {
          res.push(m);
        }
      }
      return res;
    }
    throw new Error("Missing response messages")
  }

  async clientSendMessages(clientId: string, messages: Array<string>) {
    await postTestDeviceByTestIdClientsByClientIdSendMessages({ path: { testId: this.testId, clientId: clientId }, body: { messages: messages } });
  }

  async sendNewMessageType() {
    await postTestDeviceByTestIdSendNewMessageType({ path: { testId: this.testId } })
  }

  async waitForState(device: SignalingDevice, state: SignalingConnectionState): Promise<boolean> {
    return new Promise((resolve, _reject) => {
      if (device.connectionState === state) {
        resolve(true);
      } else {
        device.on("connectionstatechange", () => {
          if (device.connectionState === state) {
            resolve(true);
          }
        })
      }
    })
  }
  async waitForObservedStates(device: SignalingDevice, states: Array<SignalingConnectionState>) : Promise<boolean> {
    return new Promise((resolve, _reject) => {
      if (JSON.stringify(this.observedConnectionStates) === JSON.stringify(states)) {
        resolve(true);
      } else {
        device.on("connectionstatechange", () => {
          if (JSON.stringify(this.observedConnectionStates) === JSON.stringify(states)) {
            resolve(true);
          }
        })
      }
    })
  }
}
