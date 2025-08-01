import { ICEApi, ClientApi } from './backend';
import { instanceOfHttpError } from './backend/models/HttpError';
import { Configuration, ResponseError } from './backend/runtime';
import { HttpError, ProductIdNotFoundError, DeviceIdNotFoundError } from '@nabto/webrtc-signaling-common'

export interface ClientConnectResponse {
  channelId: string,
  deviceOnline?: boolean,
  signalingUrl: string
}

export class HttpApiImpl {
  clientApi: ClientApi;
  iceApi: ICEApi;

  constructor(
    basePath: string,
    private productId: string,
    private deviceId: string,
    private accessToken?: string
  ) {

    this.clientApi = new ClientApi(new Configuration({ basePath: basePath }));
    this.iceApi = new ICEApi(new Configuration({ basePath: basePath }));
  }

  async requestIceServers(): Promise<Array<RTCIceServer>> {
    const authorization = this.accessToken
      ? `Bearer ${this.accessToken}`
      : undefined;
    try {
      const response = await this.iceApi.v1IceServers({
        authorization: authorization,
        v1IceServersRequest: {
          productId: this.productId,
          deviceId: this.deviceId,
        },
      });

      if (response.iceServers) {
        return response.iceServers;
      } else {
        return [];
      }
    } catch (e) {
      await this.handleError(e);
      throw e; // fallback
    }
  }

  /**
   * WebSocket connection management
   */
  async httpConnectRequest(): Promise<ClientConnectResponse> {
    const authorization: string | undefined = this.accessToken
      ? `Bearer ${this.accessToken}`
      : undefined;
    try {
      const response = await this.clientApi.v1ClientConnect({
        authorization: authorization,
        v1ClientConnectRequest: {
          productId: this.productId,
          deviceId: this.deviceId,
        },
      });
      return {
        channelId: response.channelId,
        deviceOnline: response.deviceOnline,
        signalingUrl: response.signalingUrl,
      };
    } catch (e) {
      await this.handleError(e);
      throw e; //fallback
    }
  }
  async handleError(e: unknown) {
    if (e instanceof ResponseError) {
      let message = e.message;
      const statusCode = e.response.status;

      try {
        const response = await e.response.json();
        if (instanceOfHttpError(response)) {
          message = response.message;
          if (response.code === "PRODUCT_ID_NOT_FOUND") {
            throw new ProductIdNotFoundError(statusCode, message);
          } else if (response.code === "DEVICE_ID_NOT_FOUND") {
            throw new DeviceIdNotFoundError(statusCode, message);
          }
        }
      } catch (e) {
        if (e instanceof HttpError) {
          throw e;
        }
      }
      /* eslint-disable no-empty */ {
      }
      throw new HttpError(e.response.status, message);
    }
    // fallback to throw the original error.
    throw e;
  }
}
