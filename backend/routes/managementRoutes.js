import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkPermission from "../middleware/permissionsMiddleware.js";
import {
    getOverview,
    getPlanner,
    removeAvailability,
    saveAvailability,
} from "../controllers/managementController.js";

const router = express.Router();

router.get("/overview", authMiddleware, checkPermission("view_management"), getOverview);
router.get("/planner", authMiddleware, checkPermission("view_dispatch"), getPlanner);
router.post("/availability", authMiddleware, checkPermission("manage_technician_availability"), saveAvailability);
router.delete("/availability/:id", authMiddleware, checkPermission("manage_technician_availability"), removeAvailability);

export default router;
