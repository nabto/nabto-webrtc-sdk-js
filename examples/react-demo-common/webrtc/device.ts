import { DeviceTokenGenerator } from "@nabto/webrtc-signaling-util";
import { SignalingDevice, createSignalingDevice, SignalingConnectionState, SignalingChannel, SignalingError } from "@nabto/webrtc-signaling-device";
import { PeerConnection, createPeerConnection } from "./peer_connection";

type MessageCallback = (sender: string, text: string) => void
type PeerConnectionStatesCallback = (states: { name: string, state: RTCPeerConnectionState }[]) => void
type OnConnectionStateChangeCallback = (state: SignalingConnectionState) => void
type onErrorCallback = (origin: string, error: unknown) => void

export type DeviceSettings = {
    endpointUrl: string;
    productId: string;
    deviceId: string;
    privateKey: string;
    sharedSecret: string;
    requireCentralAuth: boolean;
}

export interface Device {
    onPeerConnectionStates: PeerConnectionStatesCallback | undefined
    onSignalingServiceConnectionState: OnConnectionStateChangeCallback | undefined
    onChatMessage: MessageCallback | undefined
    onError: onErrorCallback | undefined

    updateUserMedia(constraints?: MediaStreamConstraints): Promise<MediaStream>
    broadcastChatMessage(sender: string, text: string): void
    close(): void
}

class DeviceImpl implements Device {
    onPeerConnectionStates: PeerConnectionStatesCallback | undefined;
    onSignalingServiceConnectionState: OnConnectionStateChangeCallback | undefined;
    onChatMessage: MessageCallback | undefined
    onError: onErrorCallback | undefined;
    private idCounter = 0;

    private signalingDevice: SignalingDevice
    private tokenGen: DeviceTokenGenerator
    private connections: Map<string, PeerConnection> = new Map<string, PeerConnection>();
    private connectionStates = new Map<string, RTCPeerConnectionState>();
    private stream?: MediaStream;

    constructor(private settings: DeviceSettings) {
        this.tokenGen = new DeviceTokenGenerator(settings.productId, settings.deviceId, settings.privateKey)
        this.signalingDevice = createSignalingDevice({
            ...settings,
            tokenGenerator: async () => { return this.tokenGen.generateToken() }
        });

        this.signalingDevice.onNewSignalingChannel = async (channel, authorized) => { return this.onNewSignalingChannel(channel, authorized) };

        this.signalingDevice.on("connectionstatechange", () => {
            this.onSignalingServiceConnectionState?.(this.signalingDevice.connectionState)
        })

        if (settings.sharedSecret === "" && !settings.requireCentralAuth) {
            throw new Error("Bad configuration, either a shared secret must be set or central authorization should be set to required.")
        }
        this.signalingDevice.start();
    }

    getNextId() {
        this.idCounter++;
        return `connection-${this.idCounter}`;
    }

    async onNewSignalingChannel(channel: SignalingChannel, authorized: boolean) {
        // Fail if central auth is required and the channel isnt authorized.
        if (this.settings.requireCentralAuth) {
            if (!authorized) {
                const error = new SignalingError("UNAUTHORIZED", "The device requires central authorization, but the client is not centrally authorized to access the device.");
                this.onError?.("DeviceImpl", error);
                channel.sendError(error);
                channel.close();
                return;
            }
        }

        channel.on("channelstatechange", () => {
            console.log(`${id} channel state change to ${channel.channelState}`)
        });

        const id = this.getNextId();
        const peerConnection = await createPeerConnection({
            name: id,
            signalingDevice: this.signalingDevice,
            signalingChannel: channel,
            centralAuth: this.settings.requireCentralAuth,
            sharedSecret: this.settings.sharedSecret,
            accessToken: await this.tokenGen.generateToken(),
            isDevice: true
        });

        this.onNewPeer(id, peerConnection);
    }

    async updateUserMedia(constraints?: MediaStreamConstraints): Promise<MediaStream> {
        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.stream.getTracks().forEach(t => {
            t.addEventListener("ended", () => {
                this.onError?.(t.label, new Error(`${t.kind} track was ended`));
            });
        });

        const connections = this.connections.values();
        for (const pc of connections) {
            pc.addStream(this.stream);
        }

        return this.stream;
    }

    broadcastChatMessage(sender: string, text: string) {
        this.connections.forEach(c => c.sendChatMessage({ sender: sender, text: text }));
    }

    // Close all connections called when stopping the device.
    close() {
        this.connections.forEach(c => c.close());
        this.connections.clear();
        this.connectionStates.clear();
        this.signalingDevice.close();
        if (this.stream) {
            this.stream.getTracks().forEach(track => {
                track.stop();
            });
            this.stream = undefined;
        }
    }

    private onNewPeer(id: string, peerConnection: PeerConnection) {
        peerConnection.onRTCPeerConnectionCreated = () => {
            if (this.stream) {
                peerConnection.addStream(this.stream);
            }
        }

        peerConnection.onDataChannelMessage = (sender, text) => {
            this.broadcastChatMessage(sender, text);
            this.onChatMessage?.(sender, text);
        };

        peerConnection.onRtcConnectionState = state => {
            this.connectionStates.set(id, state);
            this.notifyConnectionStatesChange();
        }

        // There is no way the stop a single peer connection manually, the only
        // way a peer connection in the device is stopped is when the individual
        // peer connection receives an error.
        peerConnection.onError = (origin, error) => {
            if (error instanceof SignalingError && error.errorCode === "CHANNEL_CLOSED") {
                // The channel has been cleanly closed, this is not an "error".
            } else {
                this.onError?.(origin, error);
            }
            // close the peer connection. If it has already been closed this is a no-op.
            peerConnection.close();

            this.connections.delete(id);
            this.connectionStates.delete(id);
            this.notifyConnectionStatesChange();
        };

        this.connections.set(id, peerConnection);
    }

    private notifyConnectionStatesChange() {
        const converted = Array.from(this.connectionStates, ([key, value]) => ({
            name: key,
            state: value
        }));
        this.onPeerConnectionStates?.(converted);
    }
}

export async function createDevice(settings: DeviceSettings): Promise<Device> {
    return new DeviceImpl(settings);
}
