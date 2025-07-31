import { ICEApi } from './backend/apis/ICEApi';
import { instanceOfHttpError } from './backend/models/HttpError';
import { Configuration, ResponseError } from './backend/runtime';
import { HttpError } from '@nabto/webrtc-signaling-common'

export class IceServersImpl {
  iceApi: ICEApi

  constructor(basePath: string, private productId: string, private deviceId: string) {
    this.iceApi = new ICEApi(new Configuration({ basePath: basePath }))
  }

  async requestIceServers(accessToken?: string): Promise<Array<RTCIceServer>> {
    const authorization = accessToken?`Bearer ${accessToken}`:undefined
    try {
      const response = await this.iceApi.v1IceServers({
        authorization: authorization,
        v1IceServersRequest: {
          productId: this.productId,
          deviceId: this.deviceId
        }
      })

      if (response.iceServers) {
        return response.iceServers;
      } else {
        return []
      }
    }
    catch (e) {
      if (e instanceof ResponseError) {
        const response = await e.response.json()
        if (instanceOfHttpError(response)) {
          throw new HttpError(e.response.status, response.message);
        } else {
          throw new HttpError(e.response.status, e.message);
        }
      }
      // fallback to throw the original error.
      throw e;
    }
  }
}
