This is a simple example showing how a client can be made using HTML and
javascript. The example uses the Nabto WebRTC Signaling Client SDK and the Nabto WebRTC
Util library.

The Nabto WebRTC Signaling Client SDK is a platform independent SDK for the
Nabto WebRTC Signaling service. Where as the Nabto WebRTC Util library is a set
of generic utilities which can be used in typescript/javascript based
applications.

The external dependencies the example depends on is defined in the
`sdk_exports.ts` file. This file is bundled for the browser using esbuild.
Esbuild puts the symbols into the SDK namespace. See package.json for the actual
esbuild command.

How to:

1. Run `pnpm install`, it creates the `dist/sdk_exports.js` file.
2. Open src/index.html in a browser.
