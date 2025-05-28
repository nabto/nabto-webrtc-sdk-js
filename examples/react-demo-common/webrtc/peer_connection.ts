import { SignalingChannel, SignalingError, SignalingErrorCodes } from '@nabto/webrtc-signaling-common';
import { createDeviceMessageTransport, DeviceMessageTransportOptions, DeviceMessageTransportSecurityMode, PerfectNegotiation, SignalingEventHandler } from "@nabto/webrtc-signaling-util";
import { createLogger, Logger } from "../log";
import { MessageTransport } from '@nabto/webrtc-signaling-util';
import { SignalingClient } from '@nabto/webrtc-signaling-client';
import { SignalingEventHandlerConnection } from '@nabto/webrtc-signaling-util';
import { SignalingDevice } from '@nabto/webrtc-signaling-device';
import { ClientMessageTransportSecurityMode, createClientMessageTransport } from '@nabto/webrtc-signaling-util/src/ClientMessageTransport';

export enum PeerConnectionLogLevel {
    NONE = 0,
    ERROR = 1,
    DEBUG = 2,
}

export interface PeerConnection {
    onSignalingState: ((state: RTCSignalingState) => void) | undefined
    onConnectionState: ((state: RTCPeerConnectionState) => void) | undefined
    onMediaStream: ((state: MediaStream) => void) | undefined
    onDataChannelMessage: ((sender: string, text: string) => void) | undefined
    // Called when the rtc peer connection has been created.
    onRTCPeerConnectionCreated?: () => void
    onError: ((origin: string, err: Error) => void) | undefined

    send(text: string): void
    addStream(stream: MediaStream): void
    close(): void
}

function LateInitProxy<T extends object>(): T {
    const proxy = new Proxy<T>({} as T, {
        get: () => { throw new Error(`PeerConnection is not properly initialized! did you forget to call the start() method?`) }
    });
    return proxy;
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
    onSignalingState: ((state: RTCSignalingState) => void) | undefined;
    onConnectionState: ((state: RTCPeerConnectionState) => void) | undefined;
    onMediaStream: ((state: MediaStream) => void) | undefined;
    onDataChannelMessage: ((sender: string, text: string) => void) | undefined;
    onError: ((origin: string, err: Error) => void) | undefined;
    onRTCPeerConnectionCreated: (() => void) | undefined;

    private log: Logger
    private pc: RTCPeerConnection;
    private dc?: RTCDataChannel;
    private chatName = generateName(6);

    private perfectNegotiation?: PerfectNegotiation;
    private signalingEventHandler?: SignalingEventHandler;

    constructor(
        private name: string,
        private signaling: SignalingEventHandlerConnection,
        private signalingChannel: SignalingChannel,
        private defaultMessageTransport: MessageTransport,
        private isDevice: boolean,
    ) {
        this.log = createLogger(name);
        this.pc = LateInitProxy<RTCPeerConnection>();
        this.defaultMessageTransport.on("setupdone", async (iceServers?: RTCIceServer[]) => {
            this.setupPeerConnection(iceServers);
        })
        this.defaultMessageTransport.on("error", (error: Error) => {
            this.handleError("DefaultMessageTransport", error);
        })
    }

    private createDefaultDataChannel() {
        this.dc = this.pc.createDataChannel("default");
        this.dc.onmessage = (msg) => {
            if (typeof msg.data === "string") {
                const parsed = JSON.parse(msg.data);
                if (typeof parsed.sender === "string" && typeof parsed.text === "string") {
                    this.onDataChannelMessage?.(parsed.sender, parsed.text);
                } else {
                    this.log.e("DataChannel received invalid message", msg.data);
                }
            } else {
                this.log.e("DataChannel received message that was not a string", msg);
            }
        }
    }

    send(text: string) {
        this.dc?.send(text);
    }

    addStream(stream: MediaStream) {
        stream.getTracks().forEach(t => {
            this.pc.addTrack(t, stream);
        });
    }

    close() {
        this.log.d(`Closing peer connection ${this.name}`);
        this.signalingChannel.stop();
        this.dc = undefined;
        this.pc.close();
        this.onConnectionStateChange();
        this.onSignalingStateChange();
    }

    private setupPeerConnection(iceServers?: RTCIceServer[]) {
        this.pc = new RTCPeerConnection({ iceServers });
        this.pc.ontrack = event => this.onTrack(event);
        this.perfectNegotiation = new PerfectNegotiation(this.pc, this.defaultMessageTransport);
        this.signalingEventHandler = new SignalingEventHandler(this.pc, this.signaling);
        this.pc.onsignalingstatechange = () => this.onSignalingStateChange();
        this.pc.onconnectionstatechange = () => this.onConnectionStateChange();
        this.pc.ondatachannel = event => this.onDataChannel(event);

        this.pc.onicecandidateerror = event => {
            this.handleError("RTCPeerConnection", new Error(`ICE candidate error code ${event.errorCode}, reason: ${event.errorText}`));
            this.log.e(event);
        }
        if (this.isDevice) {
            this.createDefaultDataChannel();
        }
        this.onRTCPeerConnectionCreated?.()
    }

    private handleChatCommand(command: string) {
        const subparts = command.split(" ")
        if (subparts[0] == "/setname" && /^[a-z0-9]+$/i.test(subparts[1])) {
            this.chatName = subparts[1].substring(0, 6);
        }
    }

    private handleError(origin: string, error: unknown) {
        this.log.e(origin, JSON.stringify(error));
        if (typeof error === "string") {
            this.onError?.(origin, new Error(error));
        } else if (error instanceof Error) {
            this.onError?.(origin, error);
        } else if (error instanceof SignalingError) {
            this.onError?.(origin, new Error(error.errorCode));
        } else {
            this.onError?.(origin, new Error("Unknown error occurred"));
        }
    }

    // ----------------------------------------------
    // RTCPeerConnection callbacks
    // ----------------------------------------------

    private onTrack(event: RTCTrackEvent) {
        if (event.streams && event.streams[0]) {
            this.onMediaStream?.(event.streams[0]);
        } else {
            const stream = new MediaStream();
            stream.addTrack(event.track);
            this.onMediaStream?.(stream);
        }
    }

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

        channel.onmessage = msg => {
            if (typeof msg.data === "string") {
                if (msg.data.startsWith("/")) {
                    this.handleChatCommand(msg.data);
                    return;
                }

                this.onDataChannelMessage?.(this.chatName, msg.data);
            } else {
                this.handleError(`data channel ${channel.id}`, new Error(`Data channel received message that was not a string`));
            }
        }
    }

    private onSignalingStateChange() {
        this.log.d(`Signaling state ==> ${this.pc.signalingState}`);
        this.onSignalingState?.(this.pc.signalingState);
    }

    private onConnectionStateChange() {
        this.log.d(`Connection state ==> ${this.pc.connectionState}`);
        this.onConnectionState?.(this.pc.connectionState);
    }
}

export type PeerConnectionOptions = {
    signalingClient?: SignalingClient,
    signalingDevice?: SignalingDevice,
    signalingChannel: SignalingChannel,
    centralAuth: boolean,
    name?: string,
    sharedSecret?: string,
    accessToken?: string,
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
                sharedSecretCallback: async (keyId) => {
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
