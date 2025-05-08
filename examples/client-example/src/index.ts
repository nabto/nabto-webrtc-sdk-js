import { createSignalingClient, SignalingClient } from "signaling-client";


const cli: SignalingClient = createSignalingClient();

cli.clientHello();
