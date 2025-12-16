import { RtspClientJsonRpcImpl } from './impl/RtspClientJsonRpcImpl';
import type {
  RtspListServicesResult,
  RtspCreateSessionParams,
  RtspCreateSessionResult,
  RtspPlayParams,
  RtspPauseParams,
  RtspTeardownParams
} from './JsonRpcTypes';

/**
 * Interface for RTSP JSON-RPC client operations
 */
export interface RtspClientJsonRpc {
  /**
   * Closes the data channel and rejects all pending requests
   */
  close(): void;

  /**
   * Lists available RTSP services on the remote peer
   * Automatically waits for the data channel to open if it's not open yet
   */
  listServices(): Promise<RtspListServicesResult>;

  /**
   * Creates an RTSP session
   * Automatically waits for the data channel to open if it's not open yet
   */
  createSession(params: RtspCreateSessionParams): Promise<RtspCreateSessionResult>;

  /**
   * Sends a play command for an RTSP session
   * Automatically waits for the data channel to open if it's not open yet
   */
  play(params: RtspPlayParams): Promise<void>;

  /**
   * Sends a pause command for an RTSP session
   * Automatically waits for the data channel to open if it's not open yet
   */
  pause(params: RtspPauseParams): Promise<void>;

  /**
   * Sends a teardown command to stop an RTSP session
   * Automatically waits for the data channel to open if it's not open yet
   */
  teardown(params: RtspTeardownParams): Promise<void>;

  /**
   * Gets the current data channel
   */
  getDataChannel(): RTCDataChannel;
}

/**
 * Creates an RTSP JSON-RPC client for controlling RTSP streams over WebRTC data channels
 *
 * @param dataChannel The RTCDataChannel to use for JSON-RPC communication
 * @returns An RtspClientJsonRpc instance
 *
 * @example
 * const rtspClient = createRtspClientJsonRpc(dataChannel);
 *
 * // List available services
 * const services = await rtspClient.listServices();
 *
 * // Create a session
 * const { session } = await rtspClient.createSession({
 *   service: 'camera1',
 *   target: '/stream1',
 *   mediaStreamId: 'stream-1'
 * });
 *
 * // Play the stream
 * await rtspClient.play({ session });
 *
 * // Pause the stream
 * await rtspClient.pause({ session });
 *
 * // Stop the stream
 * await rtspClient.teardown({ session });
 */
export function createRtspClientJsonRpc(dataChannel: RTCDataChannel): RtspClientJsonRpc {
  return new RtspClientJsonRpcImpl(dataChannel);
}
