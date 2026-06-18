import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkPermission from "../middleware/permissionsMiddleware.js";
import {
    addAsset,
    editAsset,
    getDashboard,
    getStation,
    getStations,
    removeAsset,
} from "../controllers/serviceCenterController.js";

const router = express.Router();

router.get("/dashboard", authMiddleware, checkPermission("view_dashboard"), getDashboard);
router.get("/stations", authMiddleware, checkPermission("view_clients"), getStations);
router.get("/stations/:id", authMiddleware, checkPermission("view_clients"), getStation);
router.post("/stations/:id/assets", authMiddleware, checkPermission("update_clients"), addAsset);
router.put("/assets/:assetId", authMiddleware, checkPermission("update_clients"), editAsset);
router.delete("/assets/:assetId", authMiddleware, checkPermission("update_clients"), removeAsset);

export default router;
