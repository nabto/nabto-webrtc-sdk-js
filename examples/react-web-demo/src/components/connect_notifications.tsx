import { Close } from "@mui/icons-material";
import { Alert, IconButton } from "@mui/material";
import { NotificationType } from "./notifications";

export type ConnectNotification = {
    type: NotificationType
    element: JSX.Element
};

type ConnectNotificationsProps = {
    notification: ConnectNotification | undefined
    clearNotification: () => void
};

export function ConnectNotifications({ notification, clearNotification }: ConnectNotificationsProps) {
    if (notification) {
        return (<>
            <Alert severity={notification.type} action={<IconButton color="inherit" size="small" onClick={() => clearNotification()}><Close fontSize="inherit" /></IconButton>}>
                {notification.element}
            </Alert>
        </>)
    } else {
        return (
            <></>
        )
    }
}
