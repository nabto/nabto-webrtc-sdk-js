# Nabto WebRTC SDK JS
JavaScript implementation of Nabto WebRTC Signaling


## Prerequisites
```
npm install -g pnpm
```

## Structure

The `packages` directory contains all packages that is to be deployed to the npm repository. These packages are:
 * @nabto/webrtc-base: The SDK implementations shared by both clients and devices
 * @nabto/webrtc-client: The WebRTC Client SDK
 * @nabto/webrtc-device: The WebRTC Device SDK
 * @nabto/webrtc-util: The utility components that can be used on top of the SDK

The `examples` directory contains examples using the SDK packages.

## Usage

Running `pnpm install` in any package directory, example directory, or the root directory will build everything.
