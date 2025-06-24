import { 
    SignalingClient,
    SignalingConnectionState,
    createSignalingClient,
    SignalingError
} from "@nabto/webrtc-signaling-client";
import { SignalingChannelState } from "@nabto/webrtc-signaling-common";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPeerConnection, PeerConnection } from "../webrtc";
import { ProgressState, ConnectionDisplayProps, SettingsValues } from "./shared";

export type ClientState = ReturnType<typeof useClientState>
export function useClientState(props: ConnectionDisplayProps) {
    const { onProgress } = props;

    const [rtcConnectionState, setRtcConnectionState] = useState<RTCPeerConnectionState>();
    const [rtcSignalingState, setRtcSignalingState] = useState<RTCSignalingState>();
    const [signalingConnectionState, setSignalingConnectionState] = useState<SignalingConnectionState>();
    const [signalingPeerState, setSignalingPeerState] = useState<SignalingChannelState>();

    const [signalingError, setSignalingError] = useState<Error>();
    const [createClientError, setCreateClientError] = useState<Error>();
    const [createPeerConnectionError, setCreatePeerConnectionError] = useState<Error>();
    const [peerConnectionError, setPeerConnectionError] = useState<Error>();

    const signalingClient = useRef<SignalingClient>();
    const peerConnection = useRef<PeerConnection>();

    // media
    const [mediaStream, setMediaStream] = useState<MediaStream>();

    // Chat state
    const [chatMessages, setChatMessages] = useState<{ sender: string, text: string }[]>([]);
    const chatSend = useCallback((text: string) => {
        peerConnection.current?.sendChatMessageFromThisPeer(text)
    }, []);

    // Connectivity state
    const [progressState, setProgressState] = useState<ProgressState>("disconnected");
    useEffect(() => onProgress(progressState));

    const stopConnection = useCallback(() => {
        const client = signalingClient.current;
        const pc = peerConnection.current;
        signalingClient.current = undefined;
        peerConnection.current = undefined;

        if (pc) {
            pc.onMediaStream = undefined;
            pc.onDataChannelMessage = undefined;
            pc.close();
        }

        if (client) {
            client.close();
        }

        setMediaStream(undefined);
        setProgressState("disconnected");
    }, []);

    const startConnection = useCallback((settings: SettingsValues) => {
        if (signalingClient.current && progressState != "disconnected")  {
            return;
        }

        // reset state
        setProgressState("connecting");
        setChatMessages([]);
        setSignalingError(undefined);
        setCreateClientError(undefined);
        setCreatePeerConnectionError(undefined);
        setPeerConnectionError(undefined);
        setSignalingConnectionState(undefined);
        setSignalingPeerState(undefined);
        setRtcConnectionState(undefined);
        setMediaStream(undefined);

        signalingClient.current = createSignalingClient({
            productId: settings.productId,
            deviceId: settings.deviceId,
            accessToken: settings.clientAccessToken,
            endpointUrl: settings.endpointUrl,
            requireOnline: settings.requireOnline
        });
        const client = signalingClient.current;

        client.on("connectionstatechange", () => setSignalingConnectionState(client.connectionState));
        client.on("channelstatechange", () => setSignalingPeerState(client.channelState));
        client.on("error", err => {
            if (err instanceof Error) {
                setSignalingError(err);
            }
            stopConnection();
        });

        client.start();
        createPeerConnection({
            signalingClient: client,
            signalingChannel: client,
            sharedSecret: settings.sharedSecret,
            isDevice: false
        }).then(pc => {
            setProgressState("connected");
            pc.onRtcConnectionState = setRtcConnectionState;
            pc.onRtcSignalingState = setRtcSignalingState;
            pc.onMediaStream = setMediaStream;
            pc.onDataChannelMessage = (sender, text) => setChatMessages(s => [...s, { sender, text }]);
            pc.onError = (_, error) => {
                setPeerConnectionError(undefined);
                if (error instanceof Error) {
                    setPeerConnectionError(error);
                }
            }
            peerConnection.current = pc;
        });
    }, [progressState, stopConnection]);

    return {
        mediaStream,
        chatSend,
        chatMessages,
        progressState,

        signalingConnectionState,
        signalingPeerState,
        rtcSignalingState,
        rtcConnectionState,

        signalingError,
        createClientError,
        createPeerConnectionError,
        peerConnectionError,

        startConnection,
        stopConnection
    };
}