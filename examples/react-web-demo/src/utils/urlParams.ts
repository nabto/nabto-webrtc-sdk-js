export interface UrlParams {
  productId?: string;
  deviceId?: string;
  sharedSecret?: string;
  privateKey?: string;
  clientAccessToken?: string;
  endpoint?: string;
  mode?: 'client' | 'device';
  openVideoStream?: boolean;
  openAudioStream?: boolean;
  requireCentralAuth?: boolean;
  enableTwoWay?: boolean;
}

export function parseUrlParams(): UrlParams {
  const params: UrlParams = {};
  
  // Parse query parameters
  const urlParams = new URLSearchParams(window.location.search);
  
  // Parse fragment identifier (everything after #)
  const hash = window.location.hash.slice(1); // Remove the # character
  const fragmentParams = new URLSearchParams(hash);
  
  // Combine both query params and fragment params (fragment takes precedence)
  const allParams = new URLSearchParams([
    ...Array.from(fragmentParams.entries()),
    ...Array.from(urlParams.entries())
  ]);
  
  const mode = allParams.get('mode');
  if (mode === 'client' || mode === 'device') {
    params.mode = mode;
  }

  // Parse string parameters
  params.productId = allParams.get('productId') ?? undefined;
  params.deviceId = allParams.get('deviceId') ?? undefined;
  params.sharedSecret = allParams.get('sharedSecret') ?? undefined;
  params.clientAccessToken = allParams.get('clientAccessToken') ?? undefined;
  params.endpoint = allParams.get('endpoint') ?? undefined;
  params.privateKey = allParams.get('privateKey') ?? undefined;
  
  // Parse boolean parameters
  const openVideoStream = allParams.get('openVideoStream');
  if (openVideoStream === 'true') params.openVideoStream = true;
  if (openVideoStream === 'false') params.openVideoStream = false;
  
  const openAudioStream = allParams.get('openAudioStream');
  if (openAudioStream === 'true') params.openAudioStream = true;
  if (openAudioStream === 'false') params.openAudioStream = false;
  
  const requireCentralAuth = allParams.get('requireCentralAuth');
  if (requireCentralAuth === 'true') params.requireCentralAuth = true;
  if (requireCentralAuth === 'false') params.requireCentralAuth = false;
  
  return params;
}