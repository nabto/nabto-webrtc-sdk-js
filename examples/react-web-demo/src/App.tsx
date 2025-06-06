import ConnectedTvIcon from '@mui/icons-material/ConnectedTv';
import { Collapse, LinearProgress, CssBaseline, Paper, Stack, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useState } from 'react';
import Settings, { SettingsValues } from './components/settings';

import { useClientDisplayState, useDeviceDisplayState } from "@nabto/react-demo-common/state";
import { ClientInfoTable } from "./components/clientinfo";
import { useNotificationState } from "./components/notifications";
import { NotificationStack } from "./components/notification_stack";
import { VideoAndChat } from "./components/video";
import { DeviceInfoTable } from './components/deviceinfo';

const CustomPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  alignSelf: 'center',
  marginBottom: '12px',
  [theme.breakpoints.up('sm')]: { width: '800px' }
}));

const MainContainer = styled(Stack)(({ theme }) => ({
  height: 'calc((1 - var(--template-frame-height, 0)) * 100dvh)',
  minHeight: '100%',
  padding: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(4),
  },
  '&::before': {
    content: '""',
    display: 'block',
    position: 'absolute',
    zIndex: -1,
    inset: 0,
    backgroundImage:
      'radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))',
    backgroundRepeat: 'no-repeat',
    ...theme.applyStyles('dark', {
      backgroundImage:
        'radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))',
    }),
  },
}));

function App() {
  const [mode, setMode] = useState<"device" | "client">("client");
  const [notifications, pushNotification, clearNotification] = useNotificationState();
  const [clientDisabled, setClientDisabled] = useState(false);
  const [deviceDisabled, setDeviceDisabled] = useState(false);

  const clientState = useClientDisplayState({
    onProgress: (progress) => setClientDisabled(progress != "disconnected"),
    pushNotification
  });

  const deviceState = useDeviceDisplayState({
    onProgress: (progress) => setDeviceDisabled(progress != "disconnected"),
    pushNotification
  });

  let display: JSX.Element | undefined = undefined;
  if (mode == "client") {
    const {
      mediaStream,
      chatSend,
      chatMessages,
      progressState,
      signalingConnectionState,
      signalingPeerState,
      rtcConnectionState: rtConnectionState,
      rtcSignalingState: rtcSignalingState,
    } = clientState;
    display = (
      <Stack direction="column" gap={3}>
        <NotificationStack clearNotification={clearNotification} notifications={notifications}></NotificationStack>
        <VideoAndChat mediaStream={mediaStream} onSendChat={chatSend} chatMessages={chatMessages} />
        <Collapse unmountOnExit in={progressState == "connecting"}>
          <LinearProgress />
        </Collapse>
        <ClientInfoTable
          signalingServiceState={signalingConnectionState}
          signalingPeerState={signalingPeerState}
          rtcConnectionState={rtConnectionState}
          rtcSignalingState={rtcSignalingState} />
      </Stack>
    );
  } else {
    const {
      mediaStream,
      chatSend,
      chatMessages,
      progressState,
      signalingServiceState,
      peerConnectionStates
    } = deviceState;
    display = (
      <Stack direction="column" gap={3}>
        <NotificationStack clearNotification={clearNotification} notifications={notifications}></NotificationStack>
        <VideoAndChat mediaStream={mediaStream} muted={true} onSendChat={chatSend} chatMessages={chatMessages} />
        <Collapse unmountOnExit in={progressState == "connecting"}>
          <LinearProgress />
        </Collapse>
        <DeviceInfoTable
          signalingServiceState={signalingServiceState}
          peerConnectionStates={peerConnectionStates} />
      </Stack>
    )
  }

  const handleConnect = async (incomingSettings: SettingsValues) => {
    if (mode == "client") {
      clientState.startConnection(incomingSettings);
    } else {
      deviceState.start(incomingSettings);
    }
  };

  const handleDisconnect = async () => {
    if (mode == "client") {
      clientState.stopConnection();
    } else {
      deviceState.stop();
    }
  };

  return (
    <>
      <CssBaseline enableColorScheme />
      <MainContainer direction="column">
        <CustomPaper elevation={3}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack alignItems="center" direction="row" gap={2}>
              <ConnectedTvIcon color="primary" sx={{ fontSize: 48 }} />
              <Typography component="h1" variant="h4" >Nabto Signaling Demo</Typography>
            </Stack>
          </Stack>
        </CustomPaper>
        <CustomPaper>
          {display}
        </CustomPaper>
        <CustomPaper>
          <Settings onModeChanged={setMode} disabled={mode == "client" ? clientDisabled : deviceDisabled} onDisconnectPressed={handleDisconnect} onConnectPressed={handleConnect} />
        </CustomPaper>
      </MainContainer>
    </>
  )
}

export default App
