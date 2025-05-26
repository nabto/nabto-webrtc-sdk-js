import { ExpandMore } from '@mui/icons-material';
import { Button, FormControl, Stack, Typography, Box, FormLabel, TextField, FormControlLabel, Checkbox, FormGroup, Accordion, AccordionSummary, AccordionDetails, ToggleButtonGroup, ToggleButton, Modal } from '@mui/material';
import { FormEvent, MouseEvent, useEffect, useRef, useState } from 'react';
import { Help, StylizedHelp } from './help';
import { SettingsValues } from '@nabto/react-demo-common/state';
import QRCode from 'react-qr-code';
export { type SettingsValues } from '@nabto/react-demo-common/state';

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

function useSettings(storageKey: string) {
    const defaultSettings: SettingsValues = {
        endpointUrl: "https://eu.webrtc.dev.nabto.net",
        productId: "",
        deviceId: "",
        sharedSecret: "",
        privateKey: "",
        openAudioStream: false,
        openVideoStream: true,
        clientAccessToken: "",
        requireCentralAuth: false
    };

    const [settings, setSettings] = useState<SettingsValues>(() => {
        const item = localStorage.getItem(storageKey);
        return item !== null ? { ...defaultSettings, ...JSON.parse(item) } : defaultSettings;
    });

    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(settings));
    }, [settings, storageKey]);

    return [settings, setSettings] as const;
}

function setInputValue(input: HTMLInputElement | null, value: string) {
    if (input != null) {
        input.value = value;
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
        width: 600,
        bgcolor: 'background.paper',
        border: '1px solid #000',
        boxShadow: 24,
        p: 4,
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

    const productIdRef = useRef<HTMLInputElement>(null);
    const deviceIdRef = useRef<HTMLInputElement>(null);
    const sharedSecretRef = useRef<HTMLInputElement>(null);
    const privateKeyRef = useRef<HTMLInputElement>(null);
    const endpointRef = useRef<HTMLInputElement>(null);
    const clientAccessTokenRef = useRef<HTMLInputElement>(null);

    const [clientSettings, setClientSettings] = useSettings("client-settings");
    const [deviceSettings, setDeviceSettings] = useSettings("device-settings");

    const [showQrCode, setShowQrCode] = useState(false);
    const [productId, setProductId] = useState<string>();
    const [deviceId, setDeviceId] = useState<string>();
    const [sharedSecret, setSharedSecret] = useState<string>();

    const [connectionMode, setConnectionMode] = useState<"client" | "device">("client");
    const [errs] = useState<SettingsErrorStates>({
        endpoint: { error: false, errorMessage: "" },
        productId: { error: false, errorMessage: "" },
        deviceId: { error: false, errorMessage: "" },
        sharedSecret: { error: false, errorMessage: "" },
        clientAccessToken: { error: false, errorMessage: "" },
        privateKey: { error: false, errorMessage: "" }
    });

    useEffect(() => {
        props.onModeChanged?.(connectionMode);

        if (connectionMode == "client") {
            setInputValue(productIdRef.current, clientSettings.productId);
            setInputValue(deviceIdRef.current, clientSettings.deviceId);
            setInputValue(sharedSecretRef.current, clientSettings.sharedSecret);
            setInputValue(endpointRef.current, clientSettings.endpointUrl);
            setInputValue(clientAccessTokenRef.current, clientSettings.clientAccessToken);
        } else {
            setInputValue(productIdRef.current, deviceSettings.productId);
            setInputValue(deviceIdRef.current, deviceSettings.deviceId);
            setInputValue(sharedSecretRef.current, deviceSettings.sharedSecret);
            setInputValue(endpointRef.current, deviceSettings.endpointUrl);
            setInputValue(privateKeyRef.current, deviceSettings.privateKey);
        }

        setProductId(productIdRef.current?.value);
        setDeviceId(deviceIdRef.current?.value);
        setSharedSecret(sharedSecretRef.current?.value);
    }, [connectionMode, clientSettings, deviceSettings, props]);

    const handleChangeConnectionMode = (_: MouseEvent, newMode: string) => {
        if (newMode == "client" || newMode == "device") {
            setConnectionMode(newMode);
        }
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const result: SettingsValues = {
            endpointUrl: data.get("serviceEndpoint")?.toString() ?? "",
            productId: data.get("productId")?.toString() ?? "",
            deviceId: data.get("deviceId")?.toString() ?? "",
            sharedSecret: data.get("sharedSecret")?.toString() ?? "",
            privateKey: data.get("privateKey")?.toString() ?? "",
            clientAccessToken: data.get("clientAccessToken")?.toString() ?? "",
            openVideoStream: data.get("openVideoStream") != undefined,
            openAudioStream: data.get("openAudioStream") != undefined,
            requireCentralAuth: data.get("requireCentralAuth") != undefined
        };

        if (connectionMode == "client") {
            setClientSettings(result);
        } else {
            setDeviceSettings(result);
        }
        props.onConnectPressed?.(result);
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
            <Stack direction="row" gap={2} marginBottom="16px">
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
                                inputRef={productIdRef}
                                onChange={(e) => setProductId(e.target.value)}
                                defaultValue={clientSettings.productId}
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
                                inputRef={deviceIdRef}
                                defaultValue={clientSettings.deviceId}
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
                                inputRef={sharedSecretRef}
                                defaultValue={clientSettings.sharedSecret}
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
                                        inputRef={privateKeyRef}
                                        error={errs.privateKey.error}
                                        helperText={errs.privateKey.errorMessage}
                                        color={errs.privateKey.error ? "error" : "primary"}
                                        rows={5}
                                        multiline />
                                </FormControl>

                                <FormGroup>
                                    <Stack direction="row">
                                        <FormControlLabel
                                            disabled={disabled}
                                            name="openVideoStream"
                                            id="openVideoStream"
                                            defaultChecked={true}
                                            control={<Checkbox defaultChecked={true} value="openVideoStream" color="primary" />}
                                            label="Open video stream" />

                                        <FormControlLabel
                                            disabled={disabled}
                                            name="openAudioStream"
                                            id="openAudioStream"
                                            control={<Checkbox defaultChecked={true} value="openAudioStream" color="primary" />}
                                            label="Open audio stream" />
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
                                        inputRef={clientAccessTokenRef}
                                        error={errs.clientAccessToken.error}
                                        helperText={errs.clientAccessToken.errorMessage}
                                        color={errs.clientAccessToken.error ? "error" : "primary"} />
                                </FormControl>
                            </>
                        )
                        }
                        <FormGroup>
                            <FormControlLabel
                                disabled={disabled}
                                name="requireCentralAuth"
                                id="requireCentralAuth"
                                defaultChecked={false}
                                control={<Checkbox defaultChecked={false} value="requireCentralAuth" color="primary" />}
                                label="Central Authorization" />
                        </FormGroup>
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
                                required
                                name="serviceEndpoint"
                                id="serviceEndpoint"
                                disabled={disabled}
                                inputRef={endpointRef}
                                defaultValue={clientSettings.endpointUrl}
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
