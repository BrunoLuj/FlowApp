import * as serviceCenterModel from "../models/serviceCenterModel.js";
import {
    removeUploadedFile,
    resolveUploadedFile,
} from "../middleware/uploadMiddleware.js";

export const getDashboard = async (req, res) => {
    try {
        const dashboard = await serviceCenterModel.getDashboard(req.user.clientId);
        res.json(dashboard);
    } catch (error) {
        console.error("Error fetching service center dashboard:", error);
        res.status(500).json({ error: "Error fetching service center dashboard" });
    }
};

export const getStations = async (req, res) => {
    try {
        const stations = await serviceCenterModel.getStations(req.user.clientId);
        res.json(stations);
    } catch (error) {
        console.error("Error fetching stations:", error);
        res.status(500).json({ error: "Error fetching stations" });
    }
};

export const getStation = async (req, res) => {
    try {
        const station = await serviceCenterModel.getStationById(req.params.id, req.user.clientId);
        if (!station) return res.status(404).json({ error: "Station not found" });
        res.json(station);
    } catch (error) {
        console.error("Error fetching station:", error);
        res.status(500).json({ error: "Error fetching station" });
    }
};

export const addAsset = async (req, res) => {
    if (!req.body.category?.trim() || !req.body.name?.trim()) {
        return res.status(400).json({ error: "Asset category and name are required" });
    }
    try {
        const asset = await serviceCenterModel.createAsset(
            req.params.id,
            req.body,
            req.user.clientId
        );
        if (!asset) return res.status(404).json({ error: "Station not found" });
        res.status(201).json(asset);
    } catch (error) {
        if (error.code === "INVALID_METROLOGY_PARENT") {
            return res.status(400).json({ error: "Volumetar mora pripadati aparatu, a AMN sonda rezervoaru iste stanice." });
        }
        console.error("Error creating asset:", error);
        res.status(500).json({ error: "Error creating asset" });
    }
};

export const editAsset = async (req, res) => {
    if (!req.body.category?.trim() || !req.body.name?.trim()) {
        return res.status(400).json({ error: "Asset category and name are required" });
    }
    try {
        const asset = await serviceCenterModel.updateAsset(
            req.params.assetId,
            req.body,
            req.user.clientId
        );
        if (!asset) return res.status(404).json({ error: "Asset not found" });
        res.json(asset);
    } catch (error) {
        if (error.code === "INVALID_METROLOGY_PARENT") {
            return res.status(400).json({ error: "Volumetar mora pripadati aparatu, a AMN sonda rezervoaru iste stanice." });
        }
        console.error("Error updating asset:", error);
        res.status(500).json({ error: "Error updating asset" });
    }
};

export const removeAsset = async (req, res) => {
    try {
        const asset = await serviceCenterModel.deleteAsset(req.params.assetId, req.user.clientId);
        if (!asset) return res.status(404).json({ error: "Asset not found" });
        res.json({ message: "Asset deleted" });
    } catch (error) {
        if (error.code === "23503") {
            return res.status(409).json({ error: "Oprema ima povezane volumetre ili AMN sonde. Prvo uklonite ili premjestite povezanu opremu." });
        }
        console.error("Error deleting asset:", error);
        res.status(500).json({ error: "Error deleting asset" });
    }
};

export const addDocument = async (req, res) => {
    const { document_type, title, file_name } = req.body;
    if (!document_type?.trim() || !title?.trim() || !file_name?.trim()) {
        return res.status(400).json({
            error: "Document type, title and file name are required",
        });
    }
    try {
        const document = await serviceCenterModel.createDocument(
            req.params.id,
            req.body,
            req.user
        );
        if (!document) return res.status(404).json({ error: "Station not found" });
        res.status(201).json(document);
    } catch (error) {
        console.error("Error creating document:", error);
        res.status(500).json({ error: "Error creating document" });
    }
};

export const uploadDocument = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "A file is required" });
    }

    const documentData = {
        ...req.body,
        tags: req.body.tags
            ? req.body.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
            : [],
        file_name: req.file.originalname,
        storage_key: req.file.filename,
        mime_type: req.file.mimetype,
        file_size: req.file.size,
        visible_to_client: req.body.visible_to_client !== "false",
    };

    if (!documentData.document_type?.trim() || !documentData.title?.trim()) {
        await removeUploadedFile(req.file.filename);
        return res.status(400).json({ error: "Document type and title are required" });
    }

    try {
        const document = await serviceCenterModel.createDocument(
            req.params.id,
            documentData,
            req.user
        );
        if (!document) {
            await removeUploadedFile(req.file.filename);
            return res.status(404).json({ error: "Station not found" });
        }
        res.status(201).json(document);
    } catch (error) {
        await removeUploadedFile(req.file.filename);
        console.error("Error uploading document:", error);
        res.status(500).json({ error: "Error uploading document" });
    }
};

export const downloadDocument = async (req, res) => {
    try {
        const document = await serviceCenterModel.getDocumentById(
            req.params.documentId,
            req.user.clientId
        );
        if (!document) return res.status(404).json({ error: "Document not found" });

        const filePath = resolveUploadedFile(document.storage_key);
        res.download(filePath, document.file_name);
    } catch (error) {
        if (error.code === "ENOENT") {
            return res.status(404).json({ error: "Document file not found" });
        }
        console.error("Error downloading document:", error);
        res.status(500).json({ error: "Error downloading document" });
    }
};

export const removeDocument = async (req, res) => {
    try {
        const document = await serviceCenterModel.deleteDocument(
            req.params.documentId,
            req.user.clientId
        );
        if (!document) return res.status(404).json({ error: "Document not found" });
        await removeUploadedFile(document.storage_key);
        res.json({ message: "Document deleted" });
    } catch (error) {
        console.error("Error deleting document:", error);
        res.status(500).json({ error: "Error deleting document" });
    }
};

export const addDeadline = async (req, res) => {
    const { deadline_type, title, due_date } = req.body;
    if (!deadline_type?.trim() || !title?.trim() || !due_date) {
        return res.status(400).json({
            error: "Deadline type, title and due date are required",
        });
    }
    try {
        const deadline = await serviceCenterModel.createDeadline(
            req.params.id,
            req.body,
            req.user
        );
        if (!deadline) return res.status(404).json({ error: "Station not found" });
        res.status(201).json(deadline);
    } catch (error) {
        console.error("Error creating deadline:", error);
        res.status(500).json({ error: "Error creating deadline" });
    }
};

export const editDeadline = async (req, res) => {
    try {
        const deadline = await serviceCenterModel.updateDeadline(
            req.params.deadlineId,
            req.body,
            req.user
        );
        if (!deadline) return res.status(404).json({ error: "Deadline not found" });
        res.json(deadline);
    } catch (error) {
        console.error("Error updating deadline:", error);
        res.status(500).json({ error: "Error updating deadline" });
    }
};

export const removeDeadline = async (req, res) => {
    try {
        const deadline = await serviceCenterModel.deleteDeadline(
            req.params.deadlineId,
            req.user.clientId
        );
        if (!deadline) return res.status(404).json({ error: "Deadline not found" });
        res.json({ message: "Deadline deleted" });
    } catch (error) {
        console.error("Error deleting deadline:", error);
        res.status(500).json({ error: "Error deleting deadline" });
    }
};
