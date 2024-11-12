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

// Rute za projekte
router.get("/:clientId/:type", authMiddleware, checkPermission('view_clients'), getEquipments);
// router.get("/:id", authMiddleware, checkPermission('view_clients'), getEquipment);
router.post("/:type", authMiddleware, checkPermission('create_clients'), addEquipment);
router.put("/:id/:type", authMiddleware, checkPermission('update_clients'), updateEquipments);
router.delete("/:id/:type", authMiddleware, checkPermission('delete_clients'), deleteEquipments);
router.post("/calibrationexpiry/:equipmentId/:clientId/:currentExpiryDate", authMiddleware, checkPermission('update_clients'), updateCalibrationExpiry);
router.get("/calibrationexpiry/:clientId/:equipmentId", authMiddleware, checkPermission('view_clients'), getCalibrationExpiry);

export default router;