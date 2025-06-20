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

    const [rtcConnectionState, setRtcConnectionState] = useState<RTCPeerConnectionState>();
    const [rtcSignalingState, setRtcSignalingState] = useState<RTCSignalingState>();
    const [signalingConnectionState, setSignalingConnectionState] = useState<SignalingConnectionState>();
    const [signalingPeerState, setSignalingPeerState] = useState<SignalingChannelState>();

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
            pc.onError = undefined;
            pc.close();
            pc.onRtcConnectionState = undefined;
            pc.onRtcSignalingState = undefined;

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

        const handleError = (origin: string, err: unknown) => {
            stopConnection();
            if (err instanceof SignalingError && err.errorCode === SignalingErrorCodes.CHANNEL_CLOSED) {
                // this is expected, do nothing.
            } else {
                console.error(`(${origin})`, err)
                if (IsError(err)) {
                    pushNotification?.({
                        msg: `${err} (${origin})`,
                        type: "error"
                    });
                } else {
                    pushNotification?.({
                        msg: `An unknown error occurred, see the log for further details (${origin})`,
                        type: "error"
                    });
                }
            }
        };

        setProgressState("connecting");
        signalingClient.current = createSignalingClient(settings);
        const client = signalingClient.current;
        const channel = client;

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

        client.start();
        // TODO  setProgressState("connected");
        createPeerConnection({
            signalingClient: client,
            signalingChannel: channel,
            sharedSecret: settings.sharedSecret,
            centralAuth: settings.requireCentralAuth,
            isDevice: false,
        }).then(pc => {
            pc.onRtcConnectionState = setRtcConnectionState;
            pc.onRtcSignalingState = setRtcSignalingState;
            pc.onMediaStream = setMediaStream;
            pc.onDataChannelMessage = (sender, text) => setChatMessages(s => [...s, { sender, text }]);
            pc.onError = (origin, error) => {
                handleError(origin, error);
            };
            peerConnection.current = pc;
        }).catch((e) => { handleError("useClientDisplayState", e) });
    }, [progressState, pushNotification, stopConnection]);

    return {
        mediaStream,
        chatSend,
        chatMessages,
        progressState,
        signalingConnectionState,
        signalingPeerState,
        rtcSignalingState: rtcSignalingState,
        rtcConnectionState: rtcConnectionState,
        startConnection,
        stopConnection
    };
}
