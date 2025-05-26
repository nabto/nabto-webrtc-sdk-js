import { KeyboardEvent, useRef, useState, PropsWithChildren, useEffect, SyntheticEvent } from 'react';
import Paper from '@mui/material/Paper';
import InputBase from '@mui/material/InputBase';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import SendIcon from '@mui/icons-material/Send';
import { Box, Stack, Typography } from '@mui/material';

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
      sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', width: 400 }}
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
  const ref = useRef<HTMLElement>();
  const [scroll, setScroll] = useState(0);

  useEffect(() => {
    if (scroll < 10) {
      ref.current?.scrollIntoView();
    }
  }, [props.messages, scroll]);

  const onscroll = (event: SyntheticEvent<HTMLDivElement>) => {
    const t = event.currentTarget;
    setScroll(t.scrollHeight - t.offsetHeight - t.scrollTop);
  }

  return (<>
    <Stack>
      <Paper 
        sx={{
          height: "100%",
          width: 400,
          overflow: "clip",
          overflowY: "scroll",
          overflowAnchor: "none"
        }}
        onScroll={onscroll}
        variant="outlined">
          {
            props.messages.map((msg, index) => (<ChatMessage key={index} sender={msg.sender}>{msg.text}</ChatMessage>))
          }
          <Box ref={ref}></Box>
      </Paper>
      <ChatInput onSend={props.onSend}/>
    </Stack>
  </>)
}
