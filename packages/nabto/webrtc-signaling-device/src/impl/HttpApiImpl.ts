import { DeviceApi } from "./backend";
import { ICEApi } from "./backend/apis/ICEApi";
import { instanceOfHttpError } from "./backend/models/HttpError";
import { Configuration, ResponseError } from "./backend/runtime";
import {
  DeviceIdNotFoundError,
  HttpError,
  ProductIdNotFoundError,
} from "@nabto/webrtc-signaling-common";

export class TooManyRequestError extends HttpError {
  constructor(statusCode: number, message: string, public retryAfter: number) {
    super(statusCode, message);
  }
}

export class HttpApiImpl {
  iceApi: ICEApi;
  deviceApi: DeviceApi;

  constructor(
    basePath: string,
    private productId: string,
    private deviceId: string
  ) {
    this.iceApi = new ICEApi(new Configuration({ basePath: basePath }));
    this.deviceApi = new DeviceApi(new Configuration({ basePath: basePath }));
  }

  async requestIceServers(accessToken?: string): Promise<Array<RTCIceServer>> {
    const authorization = accessToken ? `Bearer ${accessToken}` : undefined;
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
      if (e instanceof ResponseError) {
        const response = await e.response.json();
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
  async deviceConnectRequest(accessToken: string): Promise<string> {
    const token = accessToken;
    try {
      const response = await this.deviceApi.v1DeviceConnect({
        authorization: `Bearer ${token}`,
        v1DeviceConnectRequest: {
          productId: this.productId,
          deviceId: this.deviceId,
        },
      });
      return response.signalingUrl;
    } catch (err: unknown) {
      await this.handleError(err);
      throw new Error(
        "Newer here since the above handler always throws an exception."
      );
    }
  }

  parseRetryAfter(retryAfter: string | null) : number {
    let seconds = 300;
    if (retryAfter) {
      const n = Number(retryAfter);
      if (!Number.isNaN(n)) {
        seconds = n;
      } else {
        try {
          const d = new Date(retryAfter);
          const now = new Date()
          const diff = d.getTime() - now.getTime()
          seconds = diff/1000;
        } catch {
          console.warn(`Could not parse the received retry-after header: ${retryAfter}`);
        }
      }
    }
    console.debug(`Too many requests. Waiting ${seconds}s before making next request`);
    if (seconds < 0) {
      seconds = 300;
    }
    return seconds;
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
      if (statusCode === 429) {
        const retryAfter = e.response.headers.get("Retry-After");
        const seconds = this.parseRetryAfter(retryAfter);
        throw new TooManyRequestError(statusCode, message, seconds);
      }
      throw new HttpError(e.response.status, message);
    }
    // fallback to throw the original error.
    throw e;
  }
}
