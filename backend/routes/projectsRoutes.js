import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { checkPermission } from "../middleware/permissionsMiddleware.js";
import {
    getProjects,
    addProjects,
    updateProjects,
    deleteProjects,
} from "../controllers/projectController.js";

const router = express.Router();

// Rute za projekte
router.get("/", authMiddleware, checkPermission('view_project'), getProjects); // Prikaz svih projekata
router.post("/", authMiddleware, checkPermission('create_project'), addProjects); // Dodavanje novog projekta
router.put("/:id", authMiddleware, checkPermission('update_project'), updateProjects); // Ažuriranje postojećeg projekta
router.delete("/:id", authMiddleware, checkPermission('delete_project'), deleteProjects); // Brisanje projekta

export default router;