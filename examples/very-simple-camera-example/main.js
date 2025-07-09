import { createSignalingDevice } from '@nabto/webrtc-signaling-device'
import { PerfectNegotiation, DeviceTokenGenerator, createDeviceMessageTransport, DeviceMessageTransportSecurityMode, SignalingEventHandler } from '@nabto/webrtc-signaling-util'

const productId = "...";
const deviceId = "...";
const sharedSecret = "...";
const privateKey = `-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----` // a private key in PEM format.

class RTCConnectionHandler {
    messageTransport;
    constructor(signalingDevice, channel) {
        this.messageTransport = createDeviceMessageTransport(signalingDevice, channel, { securityMode: DeviceMessageTransportSecurityMode.SHARED_SECRET, sharedSecretCallback: async (keyId) => { return sharedSecret; } });
        this.messageTransport.on("setupdone", async (iceServers) => {
            const pc = new RTCPeerConnection({ iceServers: iceServers });
            new PerfectNegotiation(pc, this.messageTransport);
            new SignalingEventHandler(pc, signalingDevice);
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            stream.getTracks().forEach((track) => {
                pc.addTrack(track);
            })
        })
    }
}

function createDevice() {
    const tokenGenerator = new DeviceTokenGenerator(productId, deviceId, privateKey);
    const signalingDevice = createSignalingDevice({ productId: productId, deviceId: deviceId, tokenGenerator: () => { return tokenGenerator.generateToken() } });
    signalingDevice.onNewSignalingChannel = (channel, authorized) => {
        new RTCConnectionHandler(signalingDevice, channel);
    }
    signalingDevice.start();
}

createDevice();
