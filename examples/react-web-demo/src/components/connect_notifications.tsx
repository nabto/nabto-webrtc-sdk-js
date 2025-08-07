import { Close } from "@mui/icons-material";
import { Alert, IconButton } from "@mui/material";
import { PropsWithChildren } from "react";
import { Notification, NotificationType } from "./notifications";

type NotificationProps = PropsWithChildren<{
    onClose: () => void,
    type: NotificationType
}>;

type ConnectNotificationsProps = {
    notification: Notification | undefined,
    clearNotification: () => void
};

function NotificationAlert({ children, onClose, type }: NotificationProps) {
    return (
        <Alert severity={type} action={<IconButton color="inherit" size="small" onClick={onClose}><Close fontSize="inherit" /></IconButton>}>
            {children}
        </Alert>
    )
}

export function ConnectNotifications({ notification, clearNotification }: ConnectNotificationsProps) {
    if (notification) {
        return (
            <>
                {
                    <NotificationAlert type="error" onClose={() => clearNotification()}>{notification ? notification.msg : ""}</NotificationAlert>
                }
            </>
        )
    } else {
        return (
            <></>
        )
    }
}
