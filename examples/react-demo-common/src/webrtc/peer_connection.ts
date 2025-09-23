import { SignalingChannel, SignalingError } from '@nabto/webrtc-signaling-common';
import { createDeviceMessageTransport, DeviceConnectionTimeout, DeviceMessageTransportSecurityMode, PerfectNegotiation, SignalingEventHandler } from "@nabto/webrtc-signaling-util";
import { createLogger, Logger } from "../log";
import { MessageTransport } from '@nabto/webrtc-signaling-util';
import { SignalingClient } from '@nabto/webrtc-signaling-client';
import { SignalingEventHandlerConnection } from '@nabto/webrtc-signaling-util';
import { SignalingDevice } from '@nabto/webrtc-signaling-device';
import { ClientMessageTransportSecurityMode, createClientMessageTransport } from '@nabto/webrtc-signaling-util';

import { z } from 'zod';


const ChatMessageSchema = z.object({
    sender: z.string(),
    text: z.string(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export enum PeerConnectionLogLevel {
    NONE = 0,
    ERROR = 1,
    DEBUG = 2,
}

export interface PeerConnection {
    onRtcSignalingState: ((state: RTCSignalingState) => void) | undefined
    onRtcConnectionState: ((state: RTCPeerConnectionState) => void) | undefined
    onMediaStream: ((state: MediaStream) => void) | undefined
    onDataChannelMessage: ((sender: string, text: string) => void) | undefined
    onRtcTrack: ((event: RTCTrackEvent) => void) | undefined
    // Called when the rtc peer connection has been created.
    onRTCPeerConnectionCreated?: () => void
    onError: ((origin: string, err: Error) => void) | undefined

    sendChatMessageFromThisPeer(text: string): void
    sendChatMessage(msg: ChatMessage): void
    addStream(stream: MediaStream): void
    close(): void
}

function generateName(length: number): string {
    const alphanum = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVXZ';
    const name: string[] = [];
    for (let i = 0; i < length; i++) {
        const char = alphanum[Math.floor(Math.random() * alphanum.length)];
        name.push(char);
    }
    return name.join("");
}

class PeerConnectionImpl implements PeerConnection {
    onRtcSignalingState: ((state: RTCSignalingState) => void) | undefined;
    onRtcConnectionState: ((state: RTCPeerConnectionState) => void) | undefined;
    onRtcTrack: ((event: RTCTrackEvent) => void) | undefined;
    onMediaStream: ((state: MediaStream) => void) | undefined;
    onDataChannelMessage: ((sender: string, text: string) => void) | undefined;
    onError: ((origin: string, err: Error) => void) | undefined;
    onRTCPeerConnectionCreated: (() => void) | undefined;

    private log: Logger
    private pc?: RTCPeerConnection;
    private dc?: RTCDataChannel;
    private chatName = generateName(6);

    private perfectNegotiation?: PerfectNegotiation;
    private signalingEventHandler?: SignalingEventHandler;
    private deviceConnectionTimeout?: DeviceConnectionTimeout;

    constructor(
        private name: string,
        private signalingClientOrDevice: SignalingEventHandlerConnection,
        private signalingChannel: SignalingChannel,
        private defaultMessageTransport: MessageTransport,
        private isDevice: boolean,
    ) {
        this.log = createLogger(name);
        this.defaultMessageTransport.on("setupdone", async (iceServers?: RTCIceServer[]) => {
            this.setupPeerConnection(iceServers);
        })
        this.defaultMessageTransport.on("error", (error: unknown) => {
            this.handleError("DefaultMessageTransport", error);
        })
        this.signalingChannel.on("error", (error: unknown) => {
            this.handleError("SignalingChannel", error);
        });
        if (isDevice) {
            this.deviceConnectionTimeout = new DeviceConnectionTimeout(60000, () => {
                this.handleError("DeviceConnectionTimeout", new Error("The connection timed out due to inactivity."));
            });
        }
    }

    // This data channel is created by the device.
    // When the device receives a message it is broadcast to all the clients.
    private createDefaultDataChannel(pc: RTCPeerConnection) {
        this.dc = pc.createDataChannel("default");
        this.dc.onmessage = (msg: MessageEvent) => {
            if (typeof msg.data !== "string") {
                this.handleError(`data channel ${this.dc?.id}`, new Error(`Data channel received message that was not a string`));
                return;
            }
            try {
                const json = JSON.parse(msg.data);
                const parsed = ChatMessageSchema.parse(json);
                this.onDataChannelMessage?.(parsed.sender, parsed.text);
            } catch {
                this.handleError(`data channel ${this.dc?.id}`, new Error(`Data channel received message with the wrong format ${JSON.stringify(msg.data)}`));
            }
        }
    }



    sendChatMessageFromThisPeer(text: string) {
        const msg = {
            sender: this.chatName,
            text: text,
        }
        this.sendChatMessage(msg);
    }

    sendChatMessage(msg: ChatMessage) {
        this.dc?.send(JSON.stringify(msg));
    }

    addStream(stream: MediaStream) {
        if (this.pc) {
            const pc = this.pc;
            stream.getTracks().forEach(t => {
                pc.addTrack(t, stream);
            });
        }
    }

    close() {
        this.log.d(`Closing peer connection ${this.name}`);
        this.signalingChannel.close();
        this.dc?.close();
        this.dc = undefined;
        this.pc?.close();
        this.onRtcConnectionStateChange();
        this.onRtcSignalingStateChange();
        this.deviceConnectionTimeout?.close();
    }

    private setupPeerConnection(iceServers?: RTCIceServer[]) {
        this.log.d("Setup Peer Connection");
        this.pc = new RTCPeerConnection({ iceServers });
        this.pc.ontrack = async event => await this.onTrack(event);
        this.perfectNegotiation = new PerfectNegotiation(this.pc, this.defaultMessageTransport);
        this.signalingEventHandler = new SignalingEventHandler(this.pc, this.signalingClientOrDevice);
        this.pc.onsignalingstatechange = () => this.onRtcSignalingStateChange();
        this.pc.onconnectionstatechange = () => this.onRtcConnectionStateChange();
        this.pc.ondatachannel = event => this.onDataChannel(event);

        if (this.deviceConnectionTimeout) {
            this.deviceConnectionTimeout.registerRTCPeerConnection(this.pc);
        }

        this.pc.onicecandidateerror = event => {
            if (event.errorCode == 701) {
                return;
            }
            this.handleError("RTCPeerConnection", new Error(`ICE candidate error code ${event.errorCode}, reason: ${event.errorText}`));
            this.log.e(event);
        }

        if (this.isDevice) {
            this.createDefaultDataChannel(this.pc);
        }

        this.onRTCPeerConnectionCreated?.()
    }

    private handleError(origin: string, error: unknown) {
        //this.log.e(origin, JSON.stringify(error));
        if (typeof error === "string") {
            this.onError?.(origin, new Error(error));
        } else if (error instanceof Error) {
            this.onError?.(origin, error);
        } else if (error instanceof SignalingError) {
            this.onError?.(origin, error);
        } else {
            this.onError?.(origin, new Error("Unknown error occurred"));
        }
    }

    // ----------------------------------------------
    // RTCPeerConnection callbacks
    // ----------------------------------------------

    private async onTrack(event: RTCTrackEvent) {
        this.onRtcTrack?.(event);

        if (event.streams && event.streams[0]) {
            this.onMediaStream?.(event.streams[0]);
        } else {
            const stream = new MediaStream();
            stream.addTrack(event.track);
            this.onMediaStream?.(stream);
        }
    }

    // The client does not create a data channel but listens for new chat data
    // channels.
    private onDataChannel(event: RTCDataChannelEvent) {
        const channel = event.channel;

        channel.onopen = () => {
            this.dc = channel;
        }

        channel.onclose = () => {
            this.dc = undefined;
        }

        channel.onerror = (ev: Event) => {
            const event = ev as RTCErrorEvent;
            this.handleError(`data channel ${channel.id}`, event.error);
        }

        channel.onmessage = (msg: MessageEvent) => {
            if (typeof msg.data !== "string") {
                this.handleError(`data channel ${channel.id}`, new Error(`Data channel received message that was not a string`));
                return;
            }
            try {
                const json = JSON.parse(msg.data);
                const parsed = ChatMessageSchema.parse(json)
                this.onDataChannelMessage?.(parsed.sender, parsed.text);
            } catch {
                this.handleError(`data channel ${channel.id}`, new Error(`Data channel received message with the wrong format ${JSON.stringify(msg.data)}`));
            }
        }
    }

    private onRtcSignalingStateChange() {
        if (this.pc) {
            this.log.d(`RTC Signaling state ==> ${this.pc.signalingState}`);
            this.onRtcSignalingState?.(this.pc.signalingState);
        }
    }

    private onRtcConnectionStateChange() {
        if (this.pc) {
            this.log.d(`RTC Connection state ==> ${this.pc.connectionState}`);
            this.onRtcConnectionState?.(this.pc.connectionState);
        }
    }
}

export type PeerConnectionOptions = {
    signalingClient?: SignalingClient,
    signalingDevice?: SignalingDevice,
    signalingChannel: SignalingChannel,
    name?: string,
    sharedSecret?: string,
    isDevice: boolean,
};

export async function createPeerConnection(options: PeerConnectionOptions): Promise<PeerConnection> {
    const channel = options.signalingChannel;
    const isDevice = options.isDevice;
    const name = options.name ?? (isDevice ? "device" : "client");

    let signalingConn: SignalingEventHandlerConnection;
    let messageTransport : MessageTransport
    if (isDevice) {
        if (!options.signalingDevice) {
            throw new Error("createPeerConnection called with isDevice but signaling device not provided");
        }
        if (options.sharedSecret) {
            const sharedSecret = options.sharedSecret;
            messageTransport = createDeviceMessageTransport(options.signalingDevice, options.signalingChannel, {
                securityMode: DeviceMessageTransportSecurityMode.SHARED_SECRET,
                sharedSecretCallback: async () => {
                    return sharedSecret;
                },
            })
        } else {
            messageTransport = createDeviceMessageTransport(options.signalingDevice, options.signalingChannel, {
                securityMode: DeviceMessageTransportSecurityMode.NONE
            })
        }
        signalingConn = options.signalingDevice;
    } else {
        if (!options.signalingClient) {
            throw new Error("createPeerConnection called with !isDevice but signaling client not provided");
        }
        if (options.sharedSecret) {
            messageTransport = createClientMessageTransport(options.signalingClient, {securityMode: ClientMessageTransportSecurityMode.SHARED_SECRET, keyId: "default", sharedSecret: options.sharedSecret})
        } else {
            messageTransport = createClientMessageTransport(options.signalingClient, {securityMode: ClientMessageTransportSecurityMode.NONE});
        }
        signalingConn = options.signalingClient;
    }

    const pc = new PeerConnectionImpl(name, signalingConn, channel, messageTransport, isDevice);
    return pc;
}
