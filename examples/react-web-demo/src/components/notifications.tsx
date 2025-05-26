import { useCallback, useState } from "react";
import { Notification } from "@nabto/react-demo-common/state";

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
