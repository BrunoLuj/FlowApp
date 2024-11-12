import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkPermission  from "../middleware/permissionsMiddleware.js";
import {
    getEquipments,
    addEquipment,
    updateEquipments,
    deleteEquipments,
} from "../controllers/equipmentController.js";

const router = express.Router();

// Rute za projekte
router.get("/:clientId/:type", authMiddleware, checkPermission('view_clients'), getEquipments);
// router.get("/:id", authMiddleware, checkPermission('view_clients'), getEquipment);
router.post("/:type", authMiddleware, checkPermission('create_clients'), addEquipment);
router.put("/:id/:type", authMiddleware, checkPermission('update_clients'), updateEquipments);
router.delete("/:id/:type", authMiddleware, checkPermission('delete_clients'), deleteEquipments);

export default router;