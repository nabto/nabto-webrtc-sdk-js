import { Close } from "@mui/icons-material";
import { Alert, IconButton } from "@mui/material";
import { PropsWithChildren } from "react";
import { Notification, NotificationType } from "./notifications";

type NotificationProps = PropsWithChildren<{
    onClose: () => void,
    type: NotificationType
}>;

type NotificationStackProps = {
    notifications: Notification[],
    clearNotification: (i: number) => void
};

function NotificationAlert({ children, onClose, type }: NotificationProps) {
    return (
        <Alert severity={type} action={<IconButton color="inherit" size="small" onClick={onClose}><Close fontSize="inherit" /></IconButton>}>
            {children}
        </Alert>
    )
}

export function NotificationStack({ notifications, clearNotification }: NotificationStackProps) {
    return(
        <>
        {
            notifications.map((n, i) => i < 4 ? (
                <NotificationAlert key={i} type={n.type} onClose={() => clearNotification(i)}>{n.msg}</NotificationAlert>
            ) : null)
        }
        </>
    )
}
