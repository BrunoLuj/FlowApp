import api from "../libs/apiCall.js";

export const getNotifications = () => api.get("/notifications");
export const markNotificationRead = (notificationKey) =>
    api.post("/notifications/read", { notification_key: notificationKey });
export const markAllNotificationsRead = () =>
    api.post("/notifications/read-all");
