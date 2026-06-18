import * as attachmentModel from "../models/attachmentModel.js";
import {
    removeUploadedFile,
    resolveUploadedFile,
} from "../middleware/uploadMiddleware.js";

const allowedTypes = new Set(["service-request", "work-order"]);

export const uploadAttachment = async (req, res) => {
    if (!allowedTypes.has(req.params.type)) {
        if (req.file) await removeUploadedFile(req.file.filename);
        return res.status(400).json({ error: "Unsupported attachment type" });
    }
    if (!req.file) return res.status(400).json({ error: "A file is required" });

    try {
        const attachment = await attachmentModel.createAttachment(
            req.params.type,
            req.params.parentId,
            {
                title: req.body.title,
                file_name: req.file.originalname,
                storage_key: req.file.filename,
                mime_type: req.file.mimetype,
                file_size: req.file.size,
                visible_to_client: req.body.visible_to_client !== "false",
            },
            req.user
        );
        if (!attachment) {
            await removeUploadedFile(req.file.filename);
            return res.status(404).json({ error: "Parent record not found" });
        }
        res.status(201).json(attachment);
    } catch (error) {
        await removeUploadedFile(req.file.filename);
        console.error("Error uploading attachment:", error);
        res.status(500).json({ error: "Error uploading attachment" });
    }
};

export const downloadAttachment = async (req, res) => {
    try {
        const attachment = await attachmentModel.getAttachmentById(
            req.params.id,
            req.user.clientId
        );
        if (!attachment) return res.status(404).json({ error: "Attachment not found" });
        res.download(resolveUploadedFile(attachment.storage_key), attachment.file_name);
    } catch (error) {
        if (error.code === "ENOENT") {
            return res.status(404).json({ error: "Attachment file not found" });
        }
        console.error("Error downloading attachment:", error);
        res.status(500).json({ error: "Error downloading attachment" });
    }
};

export const removeAttachment = async (req, res) => {
    const canDelete = req.user.permissions?.some((permission) =>
        ["manage_documents", "update_service_requests", "update_work_orders"].includes(permission)
    );
    if (!canDelete) {
        return res.status(403).json({ error: "You do not have permission to delete attachments" });
    }
    try {
        const attachment = await attachmentModel.deleteAttachment(
            req.params.id,
            req.user.clientId
        );
        if (!attachment) return res.status(404).json({ error: "Attachment not found" });
        await removeUploadedFile(attachment.storage_key);
        res.json({ message: "Attachment deleted" });
    } catch (error) {
        console.error("Error deleting attachment:", error);
        res.status(500).json({ error: "Error deleting attachment" });
    }
};
