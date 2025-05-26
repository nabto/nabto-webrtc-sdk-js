# Nabto WebRTC SDK JS

JavaScript implementation of Nabto WebRTC Signaling


## Prerequisites
```
npm install -g pnpm
```

## Structure

The `packages` directory contains all packages that is to be deployed to the npm repository. These packages are:
 * @nabto/webrtc-signaling-common: The SDK implementations shared by both clients and devices
 * @nabto/webrtc-signaling-client: The WebRTC Client SDK
 * @nabto/webrtc-signaling-device: The WebRTC Device SDK
 * @nabto/webrtc-signaling-util: The utility components that can be used on top of the SDK

The `examples` directory contains examples using the SDK packages.

## Usage

Running `pnpm install` in any package directory, example directory, or the root directory will build everything.

Running `pnpm run build` from the root directory will also build the examples.
