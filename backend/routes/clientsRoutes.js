import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkPermission  from "../middleware/permissionsMiddleware.js";
import {
    getClients,
    addClients,
    updateClients,
    deleteClients,
} from "../controllers/clientsController.js";

const router = express.Router();

// Rute za projekte
router.get("/", authMiddleware, checkPermission('view_clients'), getClients); // Prikaz svih projekata
router.post("/", authMiddleware, checkPermission('create_clients'), addClients); // Dodavanje novog projekta
router.put("/:id", authMiddleware, checkPermission('update_clients'), updateClients); // Ažuriranje postojećeg projekta
router.delete("/:id", authMiddleware, checkPermission('delete_clients'), deleteClients); // Brisanje projekta

export default router;