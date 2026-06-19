import * as emailModel from "../models/emailNotificationModel.js";

export const getEmailCenter = async (_req, res) => {
    try {
        res.json(await emailModel.getEmailCenter());
    } catch (error) {
        console.error("Error fetching email center:", error);
        res.status(500).json({ error: "Error fetching email center" });
    }
};

export const updateEmailSetting = async (req, res) => {
    try {
        const setting = await emailModel.saveEmailSetting(req.params.eventType, req.body, req.user.userId);
        if (!setting) return res.status(404).json({ error: "Unknown email event type" });
        res.json(setting);
    } catch (error) {
        console.error("Error saving email setting:", error);
        res.status(500).json({ error: "Error saving email setting" });
    }
};

export const retryEmail = async (req, res) => {
    try {
        const item = await emailModel.retryEmail(req.params.id);
        if (!item) return res.status(404).json({ error: "Failed email not found" });
        res.json(item);
    } catch (error) {
        console.error("Error retrying email:", error);
        res.status(500).json({ error: "Error retrying email" });
    }
};

export const processEmails = async (_req, res) => {
    try {
        const generated = await emailModel.generateScheduledEmails();
        const result = await emailModel.processEmailQueue(50);
        res.json({ generated, ...result });
    } catch (error) {
        console.error("Error processing email queue:", error);
        res.status(500).json({ error: "Error processing email queue" });
    }
};
