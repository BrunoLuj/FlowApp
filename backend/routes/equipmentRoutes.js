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
router.get("/:clientId/:type", authMiddleware, checkPermission('view_clients'), getEquipments); // Prikaz svih projekata
// router.get("/:id", authMiddleware, checkPermission('view_clients'), getEquipment); // Prikaz svih projekata
router.post("/", authMiddleware, checkPermission('create_clients'), addEquipment); // Dodavanje novog projekta
router.put("/:id", authMiddleware, checkPermission('update_clients'), updateEquipments); // Ažuriranje postojećeg projekta
router.delete("/:id", authMiddleware, checkPermission('delete_clients'), deleteEquipments); // Brisanje projekta

export default router;