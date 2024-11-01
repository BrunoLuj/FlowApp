import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkPermission  from "../middleware/permissionsMiddleware.js";
import { addInspections } from "../controllers/inspectionsController.js";

const router = express.Router();

// Rute za projekte
// router.get("/", authMiddleware, checkPermission('view_projects'), getProjects); // Prikaz svih projekata
router.post("/", authMiddleware, addInspections); // Dodavanje novog projekta
// router.put("/:id", authMiddleware, checkPermission('update_projects'), updateProjects); // Ažuriranje postojećeg projekta
// router.delete("/:id", authMiddleware, checkPermission('delete_projects'), deleteProjects); // Brisanje projekta

export default router;