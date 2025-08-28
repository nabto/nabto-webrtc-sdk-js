import { KeyboardEvent, useRef, PropsWithChildren, useEffect } from 'react';
import Paper from '@mui/material/Paper';
import InputBase from '@mui/material/InputBase';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import SendIcon from '@mui/icons-material/Send';
import { Stack, Typography } from '@mui/material';

function ChatInput(props: { onSend?: (text: string) => void }) {
  const ref = useRef<HTMLInputElement>();

  const send = () => {
      if (ref.current) {
          const value = ref.current.value
          ref.current.value = ""
          props.onSend?.(value)
      }
  }

  const onPressEnter = (ev: KeyboardEvent<HTMLInputElement>) => {
      if (ev.key == "Enter") {
          send();
          ev.preventDefault();
      }
  };

  return (
    <Paper
      component="form"
      sx={{ 
        p: '2px 4px', 
        display: 'flex', 
        alignItems: 'center', 
        width: '100%',
        maxWidth: { xs: '100%', md: '400px' }
      }}
    >
      <InputBase
        sx={{ ml: 1, flex: 1 }}
        placeholder="Send on data channel"
        inputProps={{ 'aria-label': 'send on data channel' }}
        onKeyDown={onPressEnter}
        inputRef={ref}
      />
      <Divider sx={{ height: 28, m: 0.5 }} orientation="vertical" />
      <IconButton color="primary" sx={{ p: '10px' }} aria-label="directions" onClick={send}>
        <SendIcon />
      </IconButton>
    </Paper>
  );
}

function ChatMessage({ children, sender }: PropsWithChildren<{sender: string}>) {
  return (
    <Typography whiteSpace="pre-wrap"><b>[{sender}]:</b> {children}</Typography>);
}

type ChatBoxProps = {
  onSend?: (text: string) => void;
  messages: {sender: string, text: string}[]
}

export default function ChatBox(props: ChatBoxProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [props.messages]);

  return (<>
    <Stack sx={{ width: '100%', maxWidth: { xs: '100%', md: '400px' } }}>
      <Paper 
        ref={ref}
        sx={{
          height: "100%",
          minHeight: "150px",
          width: '100%',
          overflow: "clip",
          overflowY: "scroll",
          overflowAnchor: "none",
          p: 1
        }}
        variant="outlined">
          {
            props.messages.map((msg, index) => (<ChatMessage key={index} sender={msg.sender}>{msg.text}</ChatMessage>))
          }
      </Paper>
      <ChatInput onSend={props.onSend}/>
    </Stack>
  </>)
}
