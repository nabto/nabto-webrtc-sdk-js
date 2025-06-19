import { useCallback, useState } from "react";

export type NotificationType = "error" | "info" | "success" | "warning"

export type Notification = {
    type: NotificationType,
    msg: string
};

export function useNotificationState() {
    const [notifications, setNotifications] = useState<(Notification)[]>([]);
    const [_, setNotificationCounter] = useState(1);
    const clearNotification = (index: number) => setNotifications(v => v.filter((_, i) => i != index));
    const pushNotification = useCallback((notification: Notification) => {
        setNotificationCounter(c => {
            setNotifications(notifications => [...notifications, {
                msg: `(${c}) ${notification.msg}`,
                type: notification.type
            }]);
            return c + 1;
        })
    }, []);

    return [notifications, pushNotification, clearNotification] as const;
}
