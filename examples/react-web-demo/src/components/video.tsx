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
        <Stack 
            direction={{ xs: "column", md: "row" }} 
            gap={2} 
            sx={{ 
                height: { xs: 'auto', md: '200px' }, 
                justifyContent: "space-between",
                minHeight: { xs: '300px', md: '200px' },
                alignItems: { xs: 'stretch', md: 'flex-start' }
            }}
        >
            <video 
                ref={videoRef} 
                controls={false} 
                muted={muted} 
                autoPlay 
                style={{ 
                    backgroundColor: "black", 
                    width: '100%', 
                    height: '200px',
                    objectFit: 'contain'
                }} 
            />
            <ChatBox onSend={onSendChat} messages={chatMessages} />
        </Stack>
    )
}
