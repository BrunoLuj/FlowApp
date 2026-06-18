import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkPermission from "../middleware/permissionsMiddleware.js";
import {
    addDeadline,
    addDocument,
    addAsset,
    editDeadline,
    editAsset,
    getDashboard,
    downloadDocument,
    getStation,
    getStations,
    removeDeadline,
    removeDocument,
    removeAsset,
    uploadDocument,
} from "../controllers/serviceCenterController.js";
import { uploadSingleFile } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.get("/dashboard", authMiddleware, checkPermission("view_dashboard"), getDashboard);
router.get("/stations", authMiddleware, checkPermission("view_clients"), getStations);
router.get("/stations/:id", authMiddleware, checkPermission("view_clients"), getStation);
router.post("/stations/:id/assets", authMiddleware, checkPermission("update_clients"), addAsset);
router.put("/assets/:assetId", authMiddleware, checkPermission("update_clients"), editAsset);
router.delete("/assets/:assetId", authMiddleware, checkPermission("update_clients"), removeAsset);
router.post("/stations/:id/documents", authMiddleware, checkPermission("manage_documents"), addDocument);
router.post(
    "/stations/:id/documents/upload",
    authMiddleware,
    checkPermission("manage_documents"),
    uploadSingleFile,
    uploadDocument
);
router.get("/documents/:documentId/download", authMiddleware, checkPermission("view_documents"), downloadDocument);
router.delete("/documents/:documentId", authMiddleware, checkPermission("manage_documents"), removeDocument);
router.post("/stations/:id/deadlines", authMiddleware, checkPermission("manage_deadlines"), addDeadline);
router.patch("/deadlines/:deadlineId", authMiddleware, checkPermission("manage_deadlines"), editDeadline);
router.delete("/deadlines/:deadlineId", authMiddleware, checkPermission("manage_deadlines"), removeDeadline);

export default router;
