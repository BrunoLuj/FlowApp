import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkPermission from "../middleware/permissionsMiddleware.js";
import {
    getEmailCenter,
    processEmails,
    retryEmail,
    updateEmailSetting,
} from "../controllers/emailNotificationController.js";

const router = express.Router();

router.get("/", authMiddleware, checkPermission("view_email_center"), getEmailCenter);
router.put("/settings/:eventType", authMiddleware, checkPermission("manage_email_center"), updateEmailSetting);
router.post("/retry/:id", authMiddleware, checkPermission("manage_email_center"), retryEmail);
router.post("/process", authMiddleware, checkPermission("manage_email_center"), processEmails);

export default router;
