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
    requireOnline?: boolean;
    enableTwoWay?: boolean;
};

export type ProgressState = 
    | "disconnected"
    | "connecting"
    | "connected";

export type ConnectionDisplayProps = {
    onProgress: (progress: ProgressState) => void,
};

export type DeviceConnectionDisplayProps = ConnectionDisplayProps

export function IsError(err: unknown): err is Error {
    return err instanceof Error || ((err as Error)?.message !== undefined && typeof (err as Error)?.message === "string");
}
