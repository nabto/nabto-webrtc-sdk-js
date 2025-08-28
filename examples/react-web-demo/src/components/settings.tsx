import { ExpandMore } from '@mui/icons-material';
import { Button, FormControl, Stack, Typography, Box, FormLabel, TextField, FormControlLabel, Checkbox, FormGroup, Accordion, AccordionSummary, AccordionDetails, ToggleButtonGroup, ToggleButton, Modal } from '@mui/material';
import { FormEvent, MouseEvent, useEffect, useState } from 'react';
import { Help, StylizedHelp } from './help';
import { SettingsValues } from '@nabto/react-demo-common';
import QRCode from 'react-qr-code';
import { UrlParams } from '../utils/urlParams';
export { type SettingsValues } from '@nabto/react-demo-common';

const helpProductId = (
    <StylizedHelp title="Nabto Product ID">
        Identifies the product that the device belongs to.
    </StylizedHelp>
);

const helpDeviceId = (
    <StylizedHelp title="Nabto Device ID">
        The identifier for our device. Each device has an ID and each device belongs to a certain product identified by the product ID.
        This is the ID we will use to identify ourselves to the Nabto service.
    </StylizedHelp>
);

const helpSharedSecret = (
    <StylizedHelp title="Shared Secret">
        A shared secret. Clients must enter this shared secret to be able to connect to this device.
    </StylizedHelp>
);

const helpPrivateKey = (
    <StylizedHelp title="Private Key">
        The private key that will be used to authenticate this device against the Nabto service.
    </StylizedHelp>
);

const helpDeviceIdClient = (
    <StylizedHelp title="Nabto Device ID">
        The identifier for the device that we wish to connect to.
    </StylizedHelp>
);

const helpSharedSecretClient = (
    <StylizedHelp title="Shared Secret">
        A shared secret, specified by the device. We must enter this shared secret to be able to connect to this device.
    </StylizedHelp>
);

const helpClientAccessToken = (
    <StylizedHelp title="Optional access token">
        Access token used by the client for central authorization.
    </StylizedHelp>
);

type SettingsProperties = {
    onConnectPressed?: (values: SettingsValues) => Promise<void>;
    onDisconnectPressed?: () => Promise<void>;
    onModeChanged?: (mode: "client" | "device") => void;
    disabled: boolean;
    initialValues: UrlParams;
}

type SettingsErrorState = {
    error: boolean;
    errorMessage: string;
}

type SettingsErrorStates = {
    endpoint: SettingsErrorState;
    productId: SettingsErrorState;
    deviceId: SettingsErrorState;
    sharedSecret: SettingsErrorState;
    clientAccessToken: SettingsErrorState;
    privateKey: SettingsErrorState;
}

enum ConnectionMode {
    CLIENT = "client",
    DEVICE = "device"
}

function useSingleSetting<T>(key: string, fallback: T, override?: T) {
    const [setting, setSetting] = useState(() => {
        if (override) return override;
        const item = localStorage.getItem(key);
        return (item !== null ? JSON.parse(item) : fallback) as T;
    });

    useEffect(() => {
        localStorage.setItem(key, JSON.stringify(setting));
    }, [setting, key]);

    return [setting, setSetting] as const;
}

function useSetting<T>(mode: ConnectionMode, key: string, defaultValue: T, override?: T) {
    // only override on the chosen mode
    const clientOverride = mode == ConnectionMode.CLIENT ? override : undefined;
    const deviceOverride = mode == ConnectionMode.DEVICE ? override : undefined;
    const [clientSetting, setClientSetting] = useSingleSetting(`${ConnectionMode.CLIENT}-${key}`, defaultValue, clientOverride);
    const [deviceSetting, setDeviceSetting] = useSingleSetting(`${ConnectionMode.DEVICE}-${key}`, defaultValue, deviceOverride);

    if (mode == ConnectionMode.CLIENT) {
        return [clientSetting, setClientSetting] as const;
    } else {
        return [deviceSetting, setDeviceSetting] as const;
    }
}

type GenerateCodeModalProps = {
    show: boolean,
    onClose: () => void,
    productId: string,
    deviceId: string,
    sharedSecret: string
};

function GenerateCodeModal({show, onClose, productId, deviceId, sharedSecret}: GenerateCodeModalProps) {
    const style = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: { xs: '90%', sm: '500px', md: '600px' },
        maxWidth: '90vw',
        bgcolor: 'background.paper',
        border: '1px solid #000',
        boxShadow: 24,
        p: { xs: 2, sm: 4 },
        justifyContent: "center",
        alignItems: "center"
      };


    return (
        <div>
          <Modal
            open={show}
            onClose={onClose}
            aria-labelledby="modal-modal-title"
            aria-describedby="modal-modal-description"
          >
            <Stack sx={style} display="flex">
              <Typography id="modal-modal-title" variant="h6" component="h2" marginBottom={2}>
                Scan this QR code to open the mobile demo app.
              </Typography>
                <QRCode value={`https://applinks.nabto.com/client?productId=${productId}&deviceId=${deviceId}&sharedSecret=${sharedSecret}`}/>
            </Stack>
          </Modal>
        </div>
      );
}

export default function Settings(props: SettingsProperties) {
    const disabled = props.disabled;
    const initialValues = props.initialValues;

    const [connectionMode, setConnectionMode] = useState<ConnectionMode>(
        initialValues?.mode ? (initialValues.mode as ConnectionMode) : ConnectionMode.CLIENT
    );
    const [showQrCode, setShowQrCode] = useState(false);

    const [productId, setProductId]                   = useSetting(connectionMode, "product-id",           "",    initialValues.productId);
    const [deviceId, setDeviceId]                     = useSetting(connectionMode, "device-id",            "",    initialValues.deviceId);
    const [sharedSecret, setSharedSecret]             = useSetting(connectionMode, "shared-secret",        "",    initialValues.sharedSecret);
    const [clientAccessToken, setClientAccessToken]   = useSetting(connectionMode, "access-token",         "",    initialValues.clientAccessToken);
    const [privateKey, setPrivateKey]                 = useSetting(connectionMode, "private-key",          "",    initialValues.privateKey);
    const [openVideoStream, setOpenVideoStream]       = useSetting(connectionMode, "open-video-stream",    true,  initialValues.openVideoStream);
    const [openAudioStream, setOpenAudioStream]       = useSetting(connectionMode, "open-audio-stream",    false, initialValues.openAudioStream);
    const [requireCentralAuth, setRequireCentralAuth] = useSetting(connectionMode, "require-central-auth", false, initialValues.requireCentralAuth);

    const [endpoint, setEndpoint] = useSingleSetting("endpoint-url", initialValues?.endpoint || "");

    const [errs] = useState<SettingsErrorStates>({
        endpoint: { error: false, errorMessage: "" },
        productId: { error: false, errorMessage: "" },
        deviceId: { error: false, errorMessage: "" },
        sharedSecret: { error: false, errorMessage: "" },
        clientAccessToken: { error: false, errorMessage: "" },
        privateKey: { error: false, errorMessage: "" }
    });

    const handleChangeConnectionMode = (_: MouseEvent, newMode: string) => {
        if (newMode == "client" || newMode == "device") {
            setConnectionMode(newMode as ConnectionMode);
        }
    };

    useEffect(() => {
        props.onModeChanged?.(connectionMode);
    }, [props, connectionMode]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        props.onConnectPressed?.({
            productId,
            deviceId,
            sharedSecret,
            privateKey,
            clientAccessToken,
            endpointUrl: endpoint ? endpoint : `https://${productId}.webrtc.nabto.net`,
            openVideoStream,
            openAudioStream,
            requireCentralAuth
        });
    };

    const handleDisconnect = () => {
        props.onDisconnectPressed?.();
    };

    const validateInputs = () => {
        // @TODO
        return true;
    };

    return (<>
        <GenerateCodeModal
            show={showQrCode}
            onClose={() => setShowQrCode(false)}
            productId={productId ?? ""}
            deviceId={deviceId ?? ""}
            sharedSecret={sharedSecret ?? ""}/>

        <Box component="form" onSubmit={handleSubmit}>
            <Stack 
                direction={{ xs: "column", sm: "row" }} 
                gap={2} 
                marginBottom="16px"
            >
                <Button
                    disabled={disabled}
                    type="submit"
                    fullWidth
                    variant="contained"
                    onClick={validateInputs}>
                    Connect
                </Button>
                <Button
                    disabled={!disabled}
                    fullWidth
                    variant="contained"
                    onClick={handleDisconnect}>
                    Disconnect
                </Button>
            </Stack>
            <Box marginBottom="16px">
                <Button
                    disabled={!productId || !deviceId || !sharedSecret || connectionMode == "client"}
                    variant="contained"
                    onClick={() => setShowQrCode(true)}>
                    Generate QR code
                </Button>
            </Box>
            <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography>Settings</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <ToggleButtonGroup
                            color="primary"
                            value={connectionMode}
                            onChange={handleChangeConnectionMode}
                            exclusive
                            disabled={disabled}
                            aria-label="Connection mode">
                            <ToggleButton value="client">Client</ToggleButton>
                            <ToggleButton value="device">Device</ToggleButton>
                        </ToggleButtonGroup>
                        <FormControl>
                            <Help text={helpProductId} reverse={true}>
                                <FormLabel htmlFor="productId">Product Id</FormLabel>
                            </Help>
                            <TextField
                                required
                                fullWidth
                                name="productId"
                                id="productId"
                                disabled={disabled}
                                onChange={(e) => setProductId(e.target.value.toLowerCase())}
                                value={productId}
                                error={errs.productId.error}
                                helperText={errs.productId.errorMessage}
                                color={errs.productId.error ? "error" : "primary"} />
                        </FormControl>

                        <FormControl>
                            <Help text={connectionMode == "device" ? helpDeviceId : helpDeviceIdClient} reverse={true}>
                                <FormLabel htmlFor="deviceId">Device Id</FormLabel>
                            </Help>
                            <TextField
                                required
                                fullWidth
                                name="deviceId"
                                id="deviceId"
                                disabled={disabled}
                                onChange={(e) => setDeviceId(e.target.value.toLowerCase())}
                                value={deviceId}
                                error={errs.deviceId.error}
                                helperText={errs.deviceId.errorMessage}
                                color={errs.deviceId.error ? "error" : "primary"} />
                        </FormControl>

                        <FormControl>
                            <Help text={connectionMode == "device" ? helpSharedSecret : helpSharedSecretClient} reverse={true}>
                                <FormLabel htmlFor="sharedSecret">Shared Secret</FormLabel>
                            </Help>
                            <TextField
                                required={false}
                                fullWidth
                                name="sharedSecret"
                                id="sharedSecret"
                                disabled={disabled}
                                onChange={(e) => setSharedSecret(e.target.value)}
                                value={sharedSecret}
                                error={errs.sharedSecret.error}
                                helperText={errs.sharedSecret.errorMessage}
                                color={errs.sharedSecret.error ? "error" : "primary"} />
                        </FormControl>
                        {connectionMode == "device" ? (
                            <>
                                <FormControl>
                                    <Help text={helpPrivateKey} reverse={true}>
                                        <FormLabel htmlFor="privateKey">Private Key</FormLabel>
                                    </Help>
                                    <TextField
                                        required={connectionMode == "device"}
                                        name="privateKey"
                                        id="privateKey"
                                        disabled={disabled}
                                        onChange={(e) => setPrivateKey(e.target.value)}
                                        value={privateKey}
                                        error={errs.privateKey.error}
                                        helperText={errs.privateKey.errorMessage}
                                        color={errs.privateKey.error ? "error" : "primary"}
                                        rows={5}
                                        multiline />
                                </FormControl>

                                <FormGroup>
                                    <Stack direction="column">
                                        <FormControlLabel
                                            disabled={disabled}
                                            name="openVideoStream"
                                            id="openVideoStream"
                                            defaultChecked={true}
                                            control={<Checkbox checked={openVideoStream} onChange={e => setOpenVideoStream(e.target.checked)} color="primary" />}
                                            label="Open video stream" />

                                        <FormControlLabel
                                            disabled={disabled}
                                            name="openAudioStream"
                                            id="openAudioStream"
                                            control={<Checkbox checked={openAudioStream} onChange={e => setOpenAudioStream(e.target.checked)} color="primary" />}
                                            label="Open audio stream" />
                                        <FormControlLabel
                                            disabled={disabled}
                                            name="requireCentralAuth"
                                            id="requireCentralAuth"
                                            defaultChecked={false}
                                            control={<Checkbox checked={requireCentralAuth} onChange={e => setRequireCentralAuth(e.target.checked)} color="primary" />}
                                            label="Central Authorization" />
                                    </Stack>
                                </FormGroup>

                            </>
                        ) : (
                            <>
                                <FormControl>
                                    <Help text={helpClientAccessToken} reverse={true}>
                                        <FormLabel htmlFor="clientAccessToken">Optional Access Token</FormLabel>
                                    </Help>
                                    <TextField
                                        required={false}
                                        name="clientAccessToken"
                                        id="clientAccessToken"
                                        disabled={disabled}
                                        onChange={(e) => setClientAccessToken(e.target.value)}
                                        value={clientAccessToken}
                                        error={errs.clientAccessToken.error}
                                        helperText={errs.clientAccessToken.errorMessage}
                                        color={errs.clientAccessToken.error ? "error" : "primary"} />
                                </FormControl>
                            </>
                        )
                        }
                    </Box>
                </AccordionDetails>
            </Accordion>

            <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography>Advanced Settings</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <FormControl>
                            <FormLabel htmlFor="serviceEndpoint">Service Endpoint</FormLabel>
                            <TextField
                                name="serviceEndpoint"
                                id="serviceEndpoint"
                                disabled={disabled}
                                onChange={(e) => setEndpoint(e.target.value)}
                                value={endpoint}
                                error={errs.endpoint.error}
                                helperText={errs.endpoint.errorMessage}
                                color={errs.endpoint.error ? "error" : "primary"} />
                        </FormControl>
                    </Box>
                </AccordionDetails>
            </Accordion>
        </Box>
    </>)
}
