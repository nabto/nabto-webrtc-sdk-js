// Setup file for integration tests
// Polyfill WebRTC APIs for Node.js environment

import { webcrypto } from 'crypto';
import wrtc from '@roamhq/wrtc';

// Polyfill crypto for Node.js
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = webcrypto;
}

// Polyfill WebRTC APIs
(globalThis as any).RTCPeerConnection = wrtc.RTCPeerConnection;
(globalThis as any).RTCSessionDescription = wrtc.RTCSessionDescription;
(globalThis as any).RTCIceCandidate = wrtc.RTCIceCandidate;
