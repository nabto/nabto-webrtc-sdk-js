/**
 * JSON-RPC 2.0 request structure
 */
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
  id?: string | number;
}

/**
 * JSON-RPC 2.0 response structure
 */
export interface JsonRpcResponse {
  jsonrpc: '2.0';
  result?: unknown;
  error?: JsonRpcError;
  id: string | number | null;
}

/**
 * JSON-RPC 2.0 error structure
 */
export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

/**
 * Parameters for an HTTP request
 */
export interface HttpRequestParams {
  service: string;
  method: string;
  target: string;
  headers?: Record<string, string>;
  body?: string; // Base64 encoded
}

/**
 * Result from an HTTP request
 */
export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body?: string; // Base64 encoded
}

/**
 * Service information from http.listServices
 */
export interface HttpService {
  name: string;
  description: string;
}

/**
 * Result from http.listServices
 */
export interface ListServicesResult {
  services: HttpService[];
}

/**
 * Service information from rtsp.listServices
 */
export interface RtspService {
  name: string;
  description: string;
}

/**
 * Result from rtsp.listServices
 */
export interface RtspListServicesResult {
  services: RtspService[];
}

/**
 * Digest authentication for RTSP
 */
export interface RtspDigestAuthentication {
  username: string;
  password: string;
}

/**
 * Parameters for rtsp.createSession
 */
export interface RtspCreateSessionParams {
  service: string;
  mediaStreamId?: string;
  digestAuthentication?: RtspDigestAuthentication;
  target: string;
}

/**
 * Result from rtsp.createSession
 */
export interface RtspCreateSessionResult {
  session: string;
}

/**
 * Parameters for rtsp.play
 */
export interface RtspPlayParams {
  session: string;
  target?: string;
}

/**
 * Parameters for rtsp.pause
 */
export interface RtspPauseParams {
  session: string;
}

/**
 * Parameters for rtsp.teardown
 */
export interface RtspTeardownParams {
  session: string;
}
