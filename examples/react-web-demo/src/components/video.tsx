import { Stack } from "@mui/material";
import { useEffect, useRef } from "react";
import ChatBox from "./chat";


type VideoAndChatProps = {
    mediaStream: MediaStream | undefined,
    onSendChat: (text: string) => void,
    chatMessages: { sender: string, text: string }[],
    muted?: boolean
};

export function VideoAndChat({ mediaStream, onSendChat, chatMessages, muted }: VideoAndChatProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    // set the video element's source when incoming stream changes
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = mediaStream as MediaProvider;
        }
    }, [mediaStream]);


    return (
        <Stack direction="row" gap={2} sx={{ height: '200px', justifyContent: "space-between" }}>
            <video ref={videoRef} controls={false} muted={muted} autoPlay style={{ backgroundColor: "black", width: '300px', height: '100%' }} />
            <ChatBox onSend={onSendChat} messages={chatMessages} />
        </Stack>
    )
}
