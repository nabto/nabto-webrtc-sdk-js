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

# Examples

## React Web Demo

The React Web Demo consists of a Web demo written in typescript/react the
purpose of the demo is to showcase how a WebRTC Client and device can be
constructed.

### Video feature

When the React Web Demo runs in device mode it sends video and audio. When a
client connects to a device it receives the video and audio. Video and audio
tracks are added to all WebRTC connections by the device.

### Chat feature

The demo contains a chat feature to showcase how WebRTC data channels can be used
to send data between the peers. The chat feature works by having the device
being a central chat hub. When a client writes a chat message the message is
sent to the device which then broadcasts the chat message to all the clients
which are connected to the device.

The chat messages has the following json format and is encoded and sent as a
string over the data channel:
```
{
    "sender": <string>,
    "text": <string>
}
```
