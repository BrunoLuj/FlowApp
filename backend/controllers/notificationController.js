import * as notificationModel from "../models/notificationModel.js";

export const getNotifications = async (req, res) => {
    try {
        const notifications = await notificationModel.getNotifications(req.user);
        res.json({
            unread: notifications.filter((item) => !item.is_read).length,
            notifications,
        });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ error: "Error fetching notifications" });
    }
};

export const markRead = async (req, res) => {
    if (!req.body.notification_key) {
        return res.status(400).json({ error: "Notification key is required" });
    }
    try {
        await notificationModel.markNotificationRead(
            req.user.userId,
            req.body.notification_key
        );
        res.json({ message: "Notification marked as read" });
    } catch (error) {
        console.error("Error marking notification:", error);
        res.status(500).json({ error: "Error marking notification" });
    }
};

export const markAllRead = async (req, res) => {
    try {
        const notifications = await notificationModel.getNotifications(req.user);
        await notificationModel.markAllNotificationsRead(
            req.user.userId,
            notifications.map((item) => item.notification_key)
        );
        res.json({ message: "Notifications marked as read" });
    } catch (error) {
        console.error("Error marking notifications:", error);
        res.status(500).json({ error: "Error marking notifications" });
    }
};
