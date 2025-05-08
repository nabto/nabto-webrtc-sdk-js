import { createSignalingClient, SignalingClient } from "@nabto/webrtc-client";


const cli: SignalingClient = createSignalingClient();

cli.clientHello();
