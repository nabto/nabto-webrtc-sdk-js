import { useCallback, useEffect, useRef, useState } from "react";
import { Device, createDevice } from "../webrtc";
import { ProgressState, SettingsValues, DeviceConnectionDisplayProps } from "./shared";

export type DeviceState = ReturnType<typeof useDeviceState>
export function useDeviceState(props: DeviceConnectionDisplayProps) {
    const { onProgress } = props;

    const [signalingServiceState, setSignalingServiceState] = useState<string>();
    const [peerConnectionStates, setPeerConnectionStates] = useState<{ name: string, state: RTCPeerConnectionState }[]>([])
    const device = useRef<Device>();
    
    // error state
    const [userMediaError, setUserMediaError] = useState<Error>();
    const [createDeviceError, setCreateDeviceError] = useState<Error>();
    const [deviceConnectError, setDeviceConnectError] = useState<Error>();
    const [deviceError, setDeviceError] = useState<Error>();

    // media
    const [mediaStream, setMediaStream] = useState<MediaStream>();

    // Chat state
    const [chatMessages, setChatMessages] = useState<{ sender: string, text: string }[]>([]);

    const chatSend = useCallback((text: string) => {
        if (device.current) {
            const sender = "DEVICE";
            device.current.broadcastChatMessage(sender, text);
            setChatMessages(s => [...s, { sender, text }]);
        }
    }, [device]);

    // Connectivity state
    const [progressState, setProgressState] = useState<ProgressState>("disconnected");
    useEffect(() => onProgress(progressState));

    const updateUserMedia = useCallback((userMedia: MediaDeviceInfo[], useVideo: boolean, useAudio: boolean) => {
        setUserMediaError(undefined);
        if (device.current && userMedia.length > 0) {
            const cams = userMedia.filter(d => d.kind == "videoinput");
            const mics = userMedia.filter(d => d.kind == "audioinput");
            device.current.updateUserMedia({
                video: useVideo && cams.length > 0,
                audio: useAudio && mics.length > 0
            })
            .then(setMediaStream)
            .catch(err => {
                if (err instanceof Error) {
                    setUserMediaError(err);
                }
            });
        }
    }, []);

    const stop = useCallback(() => {
        const dev = device.current;
        device.current = undefined;
        setMediaStream(undefined);

        if (dev) {
            dev.close();
        }

        setProgressState("disconnected");
    }, []);

    const start = useCallback((settings: SettingsValues) => {
        if (device.current && progressState != "disconnected") {
            return;
        }

        setProgressState("connecting");
        setCreateDeviceError(undefined);
        setDeviceConnectError(undefined);
        setDeviceError(undefined);

        createDevice(settings).then(dev => {
            device.current = dev;
            dev.onPeerConnectionStates = setPeerConnectionStates;
            dev.onSignalingServiceConnectionState = setSignalingServiceState;
            dev.onChatMessage = (sender, text) => {
                setChatMessages(s => [...s, { sender, text }]);
            };
            dev.onError = (_, error) => {
                if (error instanceof Error) {
                    setDeviceError(error);
                }
            };
            setProgressState("connected");
            navigator.mediaDevices.enumerateDevices().then(userMedia => {
                updateUserMedia(userMedia, settings.openVideoStream, settings.openAudioStream);
            });

            navigator.mediaDevices.ondevicechange = () => {
                navigator.mediaDevices.enumerateDevices().then(userMedia => {
                    updateUserMedia(userMedia, settings.openVideoStream, settings.openAudioStream);
                });
            }
        }).catch(err => {
            stop();
            if (err instanceof Error) {
                setCreateDeviceError(err);
            }
        });
    }, [progressState, stop, updateUserMedia]);

    return {
        mediaStream,
        chatSend,
        chatMessages,
        progressState,
        signalingServiceState,
        peerConnectionStates,
        userMediaError,
        createDeviceError,
        deviceConnectError,
        deviceError,
        start,
        stop
    };
}
