import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkPermission from "../middleware/permissionsMiddleware.js";
import { getDashboard, getStations } from "../controllers/serviceCenterController.js";

const router = express.Router();

router.get("/dashboard", authMiddleware, checkPermission("view_dashboard"), getDashboard);
router.get("/stations", authMiddleware, checkPermission("view_clients"), getStations);

export default router;
