import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkPermission  from "../middleware/permissionsMiddleware.js";
import {
    getEquipments,
    addEquipment,
    updateEquipments,
    deleteEquipments,
    updateCalibrationExpiry,
    getCalibrationExpiry
} from "../controllers/equipmentController.js";

const router = express.Router();

router.get("/:clientId/:type", authMiddleware, checkPermission('view_stations'), getEquipments);
router.post("/:type", authMiddleware, checkPermission('manage_assets'), addEquipment);
router.put("/:id/:type", authMiddleware, checkPermission('manage_assets'), updateEquipments);
router.delete("/:id/:type", authMiddleware, checkPermission('delete_assets'), deleteEquipments);
router.post("/calibrationexpiry/:equipmentId/:clientId/:currentExpiryDate/:activeTab", authMiddleware, checkPermission('manage_assets'), updateCalibrationExpiry);
router.get("/calibrationexpiry/:clientId/:equipmentId/:activeTab", authMiddleware, checkPermission('view_stations'), getCalibrationExpiry);

export default router;
