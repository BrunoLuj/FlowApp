import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkPermission from "../middleware/permissionsMiddleware.js";
import { getOverview, getPlanner } from "../controllers/managementController.js";

const router = express.Router();

router.get("/overview", authMiddleware, checkPermission("view_dashboard"), getOverview);
router.get("/planner", authMiddleware, checkPermission("view_work_orders"), getPlanner);

export default router;
