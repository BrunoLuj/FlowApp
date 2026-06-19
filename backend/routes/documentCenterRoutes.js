import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkPermission from "../middleware/permissionsMiddleware.js";
import { uploadSingleFile } from "../middleware/uploadMiddleware.js";
import { addVersion, getDocuments, getVersions } from "../controllers/documentCenterController.js";

const router = express.Router();

router.get("/", authMiddleware, checkPermission("view_document_center"), getDocuments);
router.get("/:id/versions", authMiddleware, checkPermission("view_document_center"), getVersions);
router.post(
    "/:id/versions",
    authMiddleware,
    checkPermission("manage_document_versions"),
    uploadSingleFile,
    addVersion
);

export default router;
