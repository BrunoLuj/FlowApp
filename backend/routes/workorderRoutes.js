import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkPermission  from "../middleware/permissionsMiddleware.js";
import {

} from "../controllers/workorderController.js";

const router = express.Router();

// Rute za projekte
router.get("/", authMiddleware, checkPermission('view_projects'), getProjects); 
router.post("/", authMiddleware, checkPermission('create_projects'), addProjects);
router.put("/:id", authMiddleware, checkPermission('update_projects'), updateProjects);
router.delete("/:id", authMiddleware, checkPermission('delete_projects'), deleteProjects);
router.get("/active", authMiddleware, checkPermission('view_projects'), getActiveProjects);

export default router;