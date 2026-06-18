import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { uploadSingleFile } from "../middleware/uploadMiddleware.js";
import {
    downloadAttachment,
    removeAttachment,
    uploadAttachment,
} from "../controllers/attachmentController.js";

const router = express.Router();

router.post(
    "/:type/:parentId",
    authMiddleware,
    uploadSingleFile,
    uploadAttachment
);
router.get("/:id/download", authMiddleware, downloadAttachment);
router.delete("/:id", authMiddleware, removeAttachment);

export default router;
