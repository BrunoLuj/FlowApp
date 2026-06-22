import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { checkAnyPermission } from "../middleware/permissionsMiddleware.js";
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
    checkAnyPermission(["create_documents", "edit_work_order_field_report", "reply_service_requests","manage_fleet_records"]),
    uploadSingleFile,
    uploadAttachment
);
router.get("/:id/download", authMiddleware, checkAnyPermission(["view_documents", "view_work_orders", "view_service_requests","view_fleet"]), downloadAttachment);
router.delete("/:id", authMiddleware, checkAnyPermission(["delete_documents", "update_service_requests", "edit_work_order_field_report","delete_fleet_records"]), removeAttachment);

export default router;
