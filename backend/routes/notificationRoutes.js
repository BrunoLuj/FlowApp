import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
    getNotifications,
    markAllRead,
    markRead,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", authMiddleware, getNotifications);
router.post("/read", authMiddleware, markRead);
router.post("/read-all", authMiddleware, markAllRead);

export default router;
