// Setup file for integration tests
// Polyfill WebRTC APIs for Node.js environment

import { webcrypto } from 'crypto';
import wrtc from '@roamhq/wrtc';

// Polyfill crypto for Node.js
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as unknown as { crypto: Crypto }).crypto = webcrypto as unknown as Crypto;
}

// Polyfill WebRTC APIs
(globalThis as unknown as { RTCPeerConnection: typeof RTCPeerConnection }).RTCPeerConnection = wrtc.RTCPeerConnection;
(globalThis as unknown as { RTCSessionDescription: typeof RTCSessionDescription }).RTCSessionDescription = wrtc.RTCSessionDescription;
(globalThis as unknown as { RTCIceCandidate: typeof RTCIceCandidate }).RTCIceCandidate = wrtc.RTCIceCandidate;
