import { Alert } from "@mui/material";
import { PropsWithChildren, useEffect } from "react";
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
        <Alert severity={type} onClose={onClose}>
            {children}
        </Alert>
    )
}

const maxNotifications = 2;

export function NotificationStack({ notifications, clearNotification }: NotificationStackProps) {

    useEffect(() => {
        if (notifications.length > maxNotifications) {
            for (let i = 0; i < notifications.length - maxNotifications; i++) {
                clearNotification(i);
            }
        }
    }, [notifications, clearNotification]);

    return (
        <>
            {
                notifications.map((n, i) => i < maxNotifications ? (
                    <NotificationAlert key={i} type={n.type} onClose={() => clearNotification(i)}>{n.msg}</NotificationAlert>
                ) : null)
            }
        </>
    )
}
