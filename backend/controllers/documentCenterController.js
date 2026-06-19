import * as documentCenterModel from "../models/documentCenterModel.js";
import { removeUploadedFile } from "../middleware/uploadMiddleware.js";

export const getDocuments = async (req, res) => {
    try {
        res.json(await documentCenterModel.getDocumentCenter(req.query, req.user.clientId));
    } catch (error) {
        console.error("Error fetching document center:", error);
        res.status(500).json({ error: "Error fetching document center" });
    }
};

export const getVersions = async (req, res) => {
    try {
        const versions = await documentCenterModel.getDocumentVersions(
            req.params.id,
            req.user.clientId
        );
        if (!versions) return res.status(404).json({ error: "Document not found" });
        res.json(versions);
    } catch (error) {
        console.error("Error fetching document versions:", error);
        res.status(500).json({ error: "Error fetching document versions" });
    }
};

export const addVersion = async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "A file is required" });
    try {
        const document = await documentCenterModel.createDocumentVersion(
            req.params.id,
            {
                ...req.body,
                tags: req.body.tags ? req.body.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : undefined,
                visible_to_client: req.body.visible_to_client === ""
                    ? undefined
                    : req.body.visible_to_client !== "false",
                file_name: req.file.originalname,
                storage_key: req.file.filename,
                mime_type: req.file.mimetype,
                file_size: req.file.size,
            },
            req.user
        );
        if (!document) {
            await removeUploadedFile(req.file.filename);
            return res.status(404).json({ error: "Current document not found" });
        }
        res.status(201).json(document);
    } catch (error) {
        await removeUploadedFile(req.file.filename);
        console.error("Error creating document version:", error);
        res.status(500).json({ error: "Error creating document version" });
    }
};
