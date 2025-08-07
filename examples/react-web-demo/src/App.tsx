import ConnectedTvIcon from '@mui/icons-material/ConnectedTv';
import { Collapse, LinearProgress, CssBaseline, Paper, Stack, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useState, useEffect, useCallback } from 'react';
import Settings, { SettingsValues } from './components/settings';
import { ClientState, DeviceState, useClientState, useDeviceState } from "@nabto/react-demo-common";
import { ClientInfoTable } from "./components/clientinfo";
import { Notification, useNotificationState } from "./components/notifications";
import { NotificationStack } from "./components/notification_stack";
import { VideoAndChat } from "./components/video";
import { DeviceInfoTable } from './components/deviceinfo';
import { ConnectNotifications } from './components/connect_notifications';
import { DeviceIdNotFoundError, HttpError, ProductIdNotFoundError } from '@nabto/webrtc-signaling-client';

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

function ClientApp({ clientState }: { clientState: ClientState }) {
  const {
    mediaStream,
    chatSend,
    chatMessages,
    progressState,

    // Connection states
    signalingConnectionState,
    signalingPeerState,
    rtcConnectionState,
    rtcSignalingState,

    // Error states
    createClientError,
    createPeerConnectionError,
    peerConnectionError,
    signalingError
  } = clientState;

  const [notifications, pushNotification, clearNotification] = useNotificationState();
  const pushError = useCallback((err: Error | undefined) => {
    if (err) {
      pushNotification({ msg: err.message, type: "error" });
    }
  }, [pushNotification]);

  useEffect(() => pushError(createClientError), [pushError, createClientError]);
  useEffect(() => pushError(createPeerConnectionError), [pushError, createPeerConnectionError]);
  useEffect(() => pushError(peerConnectionError), [pushError, peerConnectionError]);
  useEffect(() => pushError(signalingError), [pushError, signalingError]);

  return (
    <>
      <NotificationStack clearNotification={clearNotification} notifications={notifications}></NotificationStack>
      <VideoAndChat mediaStream={mediaStream} onSendChat={chatSend} chatMessages={chatMessages} />
      <Collapse unmountOnExit in={progressState == "connecting"}>
        <LinearProgress />
      </Collapse>
      <ClientInfoTable
        signalingServiceState={signalingConnectionState}
        signalingPeerState={signalingPeerState}
        rtcConnectionState={rtcConnectionState}
        rtcSignalingState={rtcSignalingState} />
    </>
  );
}

function DeviceApp({ deviceState }: { deviceState: DeviceState }) {
  const {
    mediaStream,
    chatSend,
    chatMessages,
    progressState,

    // Connection states
    signalingServiceState,
    peerConnectionStates,

    // Error states
    createDeviceError,
    deviceConnectError,
    userMediaError,
    deviceError
  } = deviceState;

  const [notifications, pushNotification, clearNotification] = useNotificationState();
  const pushError = useCallback((err: Error | undefined) => {
    if (err) {
      pushNotification({ msg: err.message, type: "error" });
    }
  }, [pushNotification]);

  const [connectNotification, setConnectNotification] = useState<(Notification | undefined)>(undefined);

  const handleConnectError = useCallback((err: unknown | undefined) => {
    if (err) {
      if (err instanceof ProductIdNotFoundError) {
        setConnectNotification({ msg: err.message, type: "error" });
      } else if (err instanceof DeviceIdNotFoundError) {
        setConnectNotification({ msg: err.message, type: "error" });
      } else if (err instanceof HttpError) {
        setConnectNotification({ msg: err.message, type: "error" });
      } else if (err instanceof Error) {
        setConnectNotification({ msg: err.message, type: "error" });
      } else {
        setConnectNotification({ msg: JSON.stringify(err), type: "error" });
      }
    } else {
      setConnectNotification(undefined);
    }
  }, [connectNotification])

  const clearConnectNotification = useCallback(() => {
    setConnectNotification(undefined);
  }, [connectNotification])

  useEffect(() => pushError(createDeviceError), [pushError, createDeviceError]);
  useEffect(() => handleConnectError(deviceConnectError), [pushError, deviceConnectError]);
  useEffect(() => pushError(userMediaError), [pushError, userMediaError]);
  useEffect(() => pushError(deviceError), [pushError, deviceError]);

  useEffect(() => {
    if (signalingServiceState == "CONNECTED") {
      setConnectNotification(undefined);
    }
  }, [signalingServiceState, setConnectNotification]);

  return (
    <>
      <NotificationStack clearNotification={clearNotification} notifications={notifications}></NotificationStack>
      <ConnectNotifications clearNotification={clearConnectNotification} notification={connectNotification}></ConnectNotifications>
      <VideoAndChat mediaStream={mediaStream} onSendChat={chatSend} chatMessages={chatMessages} />
      <Collapse unmountOnExit in={progressState == "connecting"}>
        <LinearProgress />
      </Collapse>
      <DeviceInfoTable
        signalingServiceState={signalingServiceState}
        peerConnectionStates={peerConnectionStates.filter(v => v.state != "failed" && v.state != "disconnected")} />
    </>
  )
}

function App() {
  const [mode, setMode] = useState<"device" | "client">("client");
  const [clientDisabled, setClientDisabled] = useState(false);
  const [deviceDisabled, setDeviceDisabled] = useState(false);

  const clientState = useClientState({
    onProgress: (progress) => setClientDisabled(progress != "disconnected")
  });

  const deviceState = useDeviceState({
    onProgress: (progress) => setDeviceDisabled(progress != "disconnected"),
  });

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
              <Typography component="h1" variant="h4" >Nabto WebRTC Demo</Typography>
            </Stack>
          </Stack>
        </CustomPaper>
        <CustomPaper>
          <Stack direction="column" gap={3}>
            {mode == "client" ? <ClientApp clientState={clientState} /> : <DeviceApp deviceState={deviceState} />}
          </Stack>
        </CustomPaper>
        <CustomPaper>
          <Settings onModeChanged={setMode} disabled={mode == "client" ? clientDisabled : deviceDisabled} onDisconnectPressed={handleDisconnect} onConnectPressed={handleConnect} />
        </CustomPaper>
      </MainContainer>
    </>
  )
}

export default App
