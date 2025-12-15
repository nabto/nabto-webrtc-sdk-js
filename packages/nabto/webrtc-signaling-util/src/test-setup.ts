// Setup file for unit tests that need WebRTC APIs
import { webcrypto } from 'crypto';
import wrtc from '@roamhq/wrtc';

// Polyfill crypto for Node.js
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as unknown as { crypto: Crypto }).crypto = webcrypto as unknown as Crypto;
}

// Polyfill WebRTC APIs for tests that need them
(globalThis as unknown as { RTCPeerConnection: typeof RTCPeerConnection }).RTCPeerConnection = wrtc.RTCPeerConnection;
(globalThis as unknown as { RTCSessionDescription: typeof RTCSessionDescription }).RTCSessionDescription = wrtc.RTCSessionDescription;
(globalThis as unknown as { RTCIceCandidate: typeof RTCIceCandidate }).RTCIceCandidate = wrtc.RTCIceCandidate;
