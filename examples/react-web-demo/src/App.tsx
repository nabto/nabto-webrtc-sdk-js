import ConnectedTvIcon from '@mui/icons-material/ConnectedTv';
import { Collapse, LinearProgress, CssBaseline, Paper, Stack, Typography, Link } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useState, useEffect, useCallback } from 'react';
import Settings, { SettingsValues } from './components/settings';
import { ClientState, DeviceState, useClientState, useDeviceState } from "@nabto/react-demo-common";
import { ClientInfoTable } from "./components/clientinfo";
import { useNotificationState } from "./components/notifications";
import { NotificationStack } from "./components/notification_stack";
import { VideoAndChat } from "./components/video";
import { DeviceInfoTable } from './components/deviceinfo';
import { ConnectNotification, ConnectNotifications } from './components/connect_notifications';
import { DeviceIdNotFoundError, HttpError, ProductIdNotFoundError } from '@nabto/webrtc-signaling-client';
import { parseUrlParams } from './utils/urlParams';

const CustomPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  gap: theme.spacing(2),
  alignSelf: 'center',
  marginBottom: '12px',
  width: '100%',
  [theme.breakpoints.up('sm')]: { 
    width: '800px',
    padding: theme.spacing(4)
  }
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
    userMediaError,
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

  useEffect(() => pushError(userMediaError), [pushError, userMediaError]);
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

function ConnectErrorToNotification(error: unknown) {
  if (error instanceof ProductIdNotFoundError || error instanceof DeviceIdNotFoundError) {
    return (<Typography>
      {error.message}. <Link color="secondary" target="_blank" href="https://docs.nabto.com/developer/webrtc/guides/demos/console.html">Click this link</Link> to learn how to configure a Nabto webRTC Product
     </Typography>)
  } else if (error instanceof HttpError || error instanceof Error){
    return (<Typography>{error.message}</Typography>)
  } else {
    return (<Typography>{JSON.stringify(error)}</Typography>)
  }
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

  const [connectNotification, setConnectNotification] = useState<(ConnectNotification | undefined)>(undefined);
  const handleConnectError = useCallback((err: unknown | undefined) => {
    if (err) {
      setConnectNotification({
        type: "error",
        element: ConnectErrorToNotification(err)
      });
    } else {
      setConnectNotification(undefined);
    }
  }, [setConnectNotification])

  const clearConnectNotification = useCallback(() => {
    setConnectNotification(undefined);
  }, [setConnectNotification])

  useEffect(() => pushError(createDeviceError), [pushError, createDeviceError]);
  useEffect(() => handleConnectError(deviceConnectError), [handleConnectError, deviceConnectError]);
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
  const urlParams = parseUrlParams();
  const [mode, setMode] = useState<"device" | "client">(urlParams.mode || "client");
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
              <ConnectedTvIcon color="primary" sx={{ fontSize: { xs: 32, sm: 48 } }} />
              <Typography 
                component="h1" 
                variant="h4"
                sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}
              >
                Nabto WebRTC Demo
              </Typography>
            </Stack>
          </Stack>
        </CustomPaper>
        <CustomPaper>
          <Stack direction="column" gap={3}>
            {mode == "client" ? <ClientApp clientState={clientState} /> : <DeviceApp deviceState={deviceState} />}
          </Stack>
        </CustomPaper>
        <CustomPaper>
          <Settings 
            onModeChanged={setMode} 
            disabled={mode == "client" ? clientDisabled : deviceDisabled} 
            onDisconnectPressed={handleDisconnect} 
            onConnectPressed={handleConnect}
            initialValues={urlParams}
          />
        </CustomPaper>
      </MainContainer>
    </>
  )
}

export default App
