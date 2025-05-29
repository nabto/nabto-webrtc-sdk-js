import { useCallback, useEffect, useRef, useState } from "react";
import { Device, createDevice } from "../webrtc";
import { ProgressState, IsError, SettingsValues, DeviceConnectionDisplayProps } from "./shared";

export function useDeviceDisplayState(props: DeviceConnectionDisplayProps) {
    const { onProgress, pushNotification } = props;

    const [signalingServiceState, setSignalingServiceState] = useState<string>();
    const [peerConnectionStates, setPeerConnectionStates] = useState<{ name: string, state: RTCPeerConnectionState }[]>([])
    const device = useRef<Device>();

    // media
    const [mediaStream, setMediaStream] = useState<MediaStream>();

    // Chat state
    const [chatMessages, setChatMessages] = useState<{ sender: string, text: string }[]>([]);

    const chatSend = useCallback((text: string) => {
        if (device.current) {
            const sender = "DEVICE";
            device.current.broadcast(sender, text);
            setChatMessages(s => [...s, { sender, text }]);
        }
    }, [device]);

    // Connectivity state
    const [progressState, setProgressState] = useState<ProgressState>("disconnected");
    useEffect(() => onProgress(progressState));

    const updateUserMedia = useCallback((userMedia: MediaDeviceInfo[], useVideo: boolean, useAudio: boolean) => {
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
                    pushNotification?.({
                        type: "error",
                        msg: err.message
                    })
                }
            });
        }
    }, [pushNotification]);

    const stop = useCallback(() => {
        const dev = device.current;
        device.current = undefined;
        setMediaStream(undefined);

        if (dev) {
            dev.onPeerConnectionStates = undefined;
            dev.onSignalingServiceConnectionState = undefined;
            dev.onError = undefined;
            dev.onMessage = undefined;
            dev.close();
        }

        setProgressState("disconnected");
    }, []);

    const start = useCallback((settings: SettingsValues) => {
        if (device.current && progressState != "disconnected") {
            return;
        }

        const handleError = (err: unknown) => {
            if (IsError(err)) {
                stop();
                pushNotification?.({
                    msg: err.message,
                    type: "error"
                });
            }
        };

        setProgressState("connecting");

        createDevice(settings).then(dev => {
            device.current = dev;
            dev.onPeerConnectionStates = setPeerConnectionStates;
            dev.onSignalingServiceConnectionState = setSignalingServiceState;
            dev.onMessage = (sender, text) => {
                setChatMessages(s => [...s, { sender, text }]);
            };
            dev.onError = (origin, error) => {
                pushNotification?.({
                    type: "error",
                    msg: `${error} (${origin})`
                });
            }
            setProgressState("connected");

            navigator.mediaDevices.enumerateDevices().then(userMedia => {
                updateUserMedia(userMedia, settings.openVideoStream, settings.openAudioStream);
            }).catch(handleError);
            
            navigator.mediaDevices.ondevicechange = () => {
                navigator.mediaDevices.enumerateDevices().then(userMedia => {
                    updateUserMedia(userMedia, settings.openVideoStream, settings.openAudioStream);
                }).catch(handleError);
            }
        }).catch(handleError);
    }, [pushNotification, progressState, stop, updateUserMedia]);

    return {
        mediaStream,
        chatSend,
        chatMessages,
        progressState,
        signalingServiceState,
        peerConnectionStates,
        start,
        stop
    };
}
