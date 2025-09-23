import {
    SignalingClient,
    SignalingConnectionState,
    createSignalingClient
} from "@nabto/webrtc-signaling-client";
import { SignalingChannelState } from "@nabto/webrtc-signaling-common";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPeerConnection, PeerConnection } from "../webrtc/peer_connection";
import { ProgressState, ConnectionDisplayProps, SettingsValues } from "./shared";

export type ClientState = ReturnType<typeof useClientState>
export function useClientState(props: ConnectionDisplayProps) {
    const { onProgress } = props;

    const [rtcConnectionState, setRtcConnectionState] = useState<RTCPeerConnectionState>();
    const [rtcSignalingState, setRtcSignalingState] = useState<RTCSignalingState>();
    const [signalingConnectionState, setSignalingConnectionState] = useState<SignalingConnectionState>();
    const [signalingPeerState, setSignalingPeerState] = useState<SignalingChannelState>();

    const [userMediaError, setUserMediaError] = useState<Error>();
    const [signalingError, setSignalingError] = useState<Error>();
    const [createClientError, setCreateClientError] = useState<Error>();
    const [createPeerConnectionError, setCreatePeerConnectionError] = useState<Error>();
    const [peerConnectionError, setPeerConnectionError] = useState<Error>();

    const signalingClient = useRef<SignalingClient>();
    const peerConnection = useRef<PeerConnection>();

    // media
    const localMediaStream = useRef<MediaStream>();
    const [remoteMediaStream, setRemoteMediaStream] = useState<MediaStream>();

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

        localMediaStream.current?.getTracks().forEach(t => t.stop());
        localMediaStream.current = undefined;

        if (pc) {
            pc.onRtcTrack = undefined;
            pc.onMediaStream = undefined;
            pc.onDataChannelMessage = undefined;
            pc.close();
        }

        if (client) {
            client.close();
        }

        setRemoteMediaStream(undefined);
        setProgressState("disconnected");
    }, []);

    const startConnection = useCallback(async (settings: SettingsValues) => {
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
        setRemoteMediaStream(undefined);
        setUserMediaError(undefined);

        if (settings.enableTwoWay)
        {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const isAudioAvailable = devices.filter(d => d.kind == "audioinput").length > 0;
                const isVideoAvailable = devices.filter(d => d.kind == "videoinput").length > 0;
                if (isAudioAvailable || isVideoAvailable) {
                    localMediaStream.current = await navigator.mediaDevices.getUserMedia({
                        video: isVideoAvailable,
                        audio: isAudioAvailable
                    });
                }
            } catch (err) {
                if (err instanceof Error) {
                    setUserMediaError(err);
                }
            }
        }

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

            if (settings.enableTwoWay)
            {
                pc.onRtcSignalingState = (state) => {
                    if (localMediaStream.current && state == "stable") {
                        pc.addStream(localMediaStream.current)
                    }
                }
            }

            pc.onMediaStream = setRemoteMediaStream;
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
        mediaStream: remoteMediaStream,
        chatSend,
        chatMessages,
        progressState,

        signalingConnectionState,
        signalingPeerState,
        rtcSignalingState,
        rtcConnectionState,

        userMediaError,
        signalingError,
        createClientError,
        createPeerConnectionError,
        peerConnectionError,

        startConnection,
        stopConnection
    };
}
