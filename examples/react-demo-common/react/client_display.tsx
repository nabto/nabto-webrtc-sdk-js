import {
    SignalingClient,
    SignalingConnectionState,
    createSignalingClient,
    SignalingErrorCodes,
    SignalingError
} from "@nabto/webrtc-signaling-client";
import { SignalingChannelState } from "@nabto/webrtc-signaling-common";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPeerConnection, PeerConnection } from "../webrtc";
import { ProgressState, ConnectionDisplayProps, IsError, SettingsValues } from "./shared";

export function useClientDisplayState(props: ConnectionDisplayProps) {
    const { onProgress, pushNotification } = props;

    const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>();
    const [signalingState, setSignalingState] = useState<RTCSignalingState>();
    const [signalingConnectionState, setSignalingConnectionState] = useState<SignalingConnectionState>();
    const [signalingPeerState, setSignalingPeerState] = useState<SignalingChannelState>();

    const signalingClient = useRef<SignalingClient>();
    const peerConnection = useRef<PeerConnection>();

    // media
    const [mediaStream, setMediaStream] = useState<MediaStream>();

    // Chat state
    const [chatMessages, setChatMessages] = useState<{ sender: string, text: string }[]>([]);
    const chatSend = useCallback((text: string) => {
        peerConnection.current?.send(text)
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
            pc.onConnectionState = undefined;
            pc.onSignalingState = undefined;
            pc.onMediaStream = undefined;
            pc.onDataChannelMessage = undefined;
            pc.onError = undefined;
            pc.close();
        }

        if (client) {
            client.close();
        }

        if (pc || client)
        {
            setProgressState("connecting");
            setTimeout(() => {
                setProgressState("disconnected");
            }, 500);
        }
    }, []);

    const startConnection = useCallback((settings: SettingsValues) => {
        if (signalingClient.current && progressState != "disconnected")  {
            return;
        }

        const handleError = (err: unknown) => {
            if (IsError(err)) {
                stopConnection();
                pushNotification?.({
                    msg: err.message,
                    type: "error"
                });
            }
        };

        setProgressState("connecting");
        signalingClient.current = createSignalingClient(settings);
        const client = signalingClient.current;
        const channel = client;
        const token = settings.requireCentralAuth ? settings.clientAccessToken : undefined;

        client.on("connectionstatechange", () => {
            switch (client.connectionState) {
                case SignalingConnectionState.CONNECTED: {
                    setProgressState("connected");
                    break;
                }

                case SignalingConnectionState.CONNECTING: {
                    setProgressState("connecting");
                    break;
                }

                case SignalingConnectionState.FAILED:
                case SignalingConnectionState.CLOSED: {
                    setProgressState("disconnected");
                    break;
                }
            }
            setSignalingConnectionState(client.connectionState)
        });

        channel.on("channelstatechange", () => setSignalingPeerState(channel.channelState));
        channel.on("error", (err) => {
            console.error(err);
            if (err instanceof SignalingError) {
                switch (err.errorCode) {
                    case SignalingErrorCodes.CHANNEL_CLOSED: {
                        stopConnection();
                        break;
                    };

                    case SignalingErrorCodes.VERIFICATION_ERROR: {
                        pushNotification?.({
                            msg: "Failed to verify. Incorrect shared secret.",
                            type: "error"
                        });
                        stopConnection();
                        break;
                    }
                }
            }
        });

        client.connect();
        // TODO  setProgressState("connected");
        createPeerConnection({
            signalingClient: client,
            signalingChannel: channel,
            sharedSecret: settings.sharedSecret,
            centralAuth: settings.requireCentralAuth,
            isDevice: false,
        }).then(pc => {
            pc.onConnectionState = setConnectionState;
            pc.onSignalingState = setSignalingState;
            pc.onMediaStream = setMediaStream;
            pc.onDataChannelMessage = (sender, text) => setChatMessages(s => [...s, { sender, text }]);
            pc.onError = (origin, error) => {
                pushNotification?.({
                    type: "error",
                    msg: `${error} (${origin})`
                });
            };
            peerConnection.current = pc;
        }).catch(handleError);
    }, [progressState, pushNotification, stopConnection]);

    return {
        mediaStream,
        chatSend,
        chatMessages,
        progressState,
        signalingConnectionState,
        signalingPeerState,
        signalingState,
        connectionState,
        startConnection,
        stopConnection
    };
}
