import {createSignalingClient } from '@nabto/webrtc-signaling-client'
import { createClientMessageTransport, ClientMessageTransportSecurityMode, PerfectNegotiation } from '@nabto/webrtc-signaling-util'

const productId = "...";
const deviceId = "...";
const sharedSecret = "...";

function connect()  {
    const signalingClient = createSignalingClient({productId: productId, deviceId: deviceId});
    const messageTransport = createClientMessageTransport(signalingClient, {securityMode: ClientMessageTransportSecurityMode.SHARED_SECRET, sharedSecret: sharedSecret})
    messageTransport.on("setupdone", async (iceServers) => {
        const pc = new RTCPeerConnection({iceServers: iceServers});
        new PerfectNegotiation(pc, messageTransport);
        pc.addEventListener("track", (event) => {
            const videoElement = document.getElementById("videoview");
            videoElement.srcObject = event.streams[0];
        })
    })
    signalingClient.start();
}

connect();
