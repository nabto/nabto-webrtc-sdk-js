import type {
  JsonRpcRequest,
  JsonRpcResponse,
  RtspListServicesResult,
  RtspCreateSessionParams,
  RtspCreateSessionResult,
  RtspPlayParams,
  RtspPauseParams,
  RtspTeardownParams
} from '../JsonRpcTypes';

/**
 * Client for controlling RTSP streams over WebRTC data channels using JSON-RPC 2.0
 */
export class RtspClientJsonRpcImpl {
  private pendingRequests = new Map<string | number, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }>();
  private nextRequestId = 1;

  constructor(private dataChannel: RTCDataChannel) {
    // Set up event listeners
    this.dataChannel.addEventListener('close', () => {
      this.handleClose();
    });

    this.dataChannel.addEventListener('message', (event) => {
      this.handleMessage(event.data);
    });
  }

  /**
   * Waits for the data channel to be open and ready
   * Returns a promise that resolves when the channel is open
   */
  private waitForOpen(): Promise<void> {
    if (this.dataChannel.readyState === 'open') {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const onOpen = () => {
        this.dataChannel.removeEventListener('error', onError);
        resolve();
      };

      const onError = (_event: Event) => {
        this.dataChannel.removeEventListener('open', onOpen);
        reject(new Error('Data channel failed to open'));
      };

      this.dataChannel.addEventListener('open', onOpen, { once: true });
      this.dataChannel.addEventListener('error', onError, { once: true });
    });
  }

  /**
   * Closes the data channel and rejects all pending requests
   */
  public close(): void {
    this.dataChannel.close();
    this.handleClose();
  }

  /**
   * Lists available RTSP services on the remote peer
   */
  public async listServices(): Promise<RtspListServicesResult> {
    const id = this.nextRequestId++;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'rtsp.listServices',
      id
    };

    return this.sendRequest(request) as Promise<RtspListServicesResult>;
  }

  /**
   * Creates an RTSP session
   */
  public async createSession(params: RtspCreateSessionParams): Promise<RtspCreateSessionResult> {
    const id = this.nextRequestId++;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'rtsp.createSession',
      params,
      id
    };

    return this.sendRequest(request) as Promise<RtspCreateSessionResult>;
  }

  /**
   * Sends a play command for an RTSP session
   */
  public async play(params: RtspPlayParams): Promise<void> {
    const id = this.nextRequestId++;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'rtsp.play',
      params,
      id
    };

    await this.sendRequest(request);
  }

  /**
   * Sends a pause command for an RTSP session
   */
  public async pause(params: RtspPauseParams): Promise<void> {
    const id = this.nextRequestId++;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'rtsp.pause',
      params,
      id
    };

    await this.sendRequest(request);
  }

  /**
   * Sends a teardown command to stop an RTSP session
   */
  public async teardown(params: RtspTeardownParams): Promise<void> {
    const id = this.nextRequestId++;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'rtsp.teardown',
      params,
      id
    };

    await this.sendRequest(request);
  }

  /**
   * Gets the current data channel
   */
  public getDataChannel(): RTCDataChannel {
    return this.dataChannel;
  }

  private async sendRequest(request: JsonRpcRequest): Promise<unknown> {
    // Wait for channel to open if it's not open yet
    await this.waitForOpen();

    if (request.id === undefined) {
      // Notification, no response expected
      this.send(request);
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(request.id!, { resolve, reject });
      this.send(request);
    });
  }

  private send(message: JsonRpcRequest): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('Data channel is not open');
    }

    const json = JSON.stringify(message);
    this.dataChannel.send(json);
  }

  private handleMessage(data: string): void {
    try {
      const response = JSON.parse(data) as JsonRpcResponse;

      if (response.id === null || response.id === undefined) {
        // Notification response, ignore
        return;
      }

      const pending = this.pendingRequests.get(response.id);
      if (!pending) {
        return;
      }

      this.pendingRequests.delete(response.id);

      if (response.error) {
        const error = new Error(response.error.message) as Error & { code: number; data?: unknown };
        error.code = response.error.code;
        error.data = response.error.data;
        pending.reject(error);
      } else {
        pending.resolve(response.result);
      }
    } catch (error) {
      console.error('Failed to parse JSON-RPC response:', error);
    }
  }

  private handleClose(): void {
    // Reject all pending requests
    for (const pending of this.pendingRequests.values()) {
      pending.reject(new Error('Data channel closed'));
    }
    this.pendingRequests.clear();
  }
}
