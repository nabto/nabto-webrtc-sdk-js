export type NotificationType = "error" | "info" | "success" | "warning"

export type Notification = {
    type: NotificationType,
    msg: string
};

export type SettingsValues = {
    endpointUrl: string;
    productId: string;
    deviceId: string;
    sharedSecret: string;
    privateKey: string;
    openVideoStream: boolean;
    openAudioStream: boolean;
    clientAccessToken: string;
    requireCentralAuth: boolean;
};

export type ProgressState = 
    | "disconnected"
    | "connecting"
    | "connected";

export type ConnectionDisplayProps = {
    pushNotification?: (notification: Notification) => void,
    onProgress: (progress: ProgressState) => void,
};

export type DeviceConnectionDisplayProps = ConnectionDisplayProps & {
    useVideo: boolean,
    useAudio: boolean
};

export function IsError(err: unknown): err is Error {
    return err instanceof Error || ((err as Error)?.message !== undefined && typeof (err as Error)?.message === "string");
}
