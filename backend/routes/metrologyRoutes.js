import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkPermission from "../middleware/permissionsMiddleware.js";
import {
    addInspection, completeInspection, configureAsset, generateCertificate,
    getAssets, getInspection, getOverview, saveInspection,
} from "../controllers/metrologyController.js";

const router=express.Router();
router.get("/overview",authMiddleware,checkPermission("view_metrology_center"),getOverview);
router.get("/assets",authMiddleware,checkPermission("view_metrology_center"),getAssets);
router.put("/assets/:id",authMiddleware,checkPermission("manage_metrology_inspections"),configureAsset);
router.get("/inspections/:id",authMiddleware,checkPermission("view_metrology_center"),getInspection);
router.post("/inspections",authMiddleware,checkPermission("manage_metrology_inspections"),addInspection);
router.put("/inspections/:id",authMiddleware,checkPermission("manage_metrology_inspections"),saveInspection);
router.post("/inspections/:id/complete",authMiddleware,checkPermission("approve_metrology_inspections"),completeInspection);
router.post("/inspections/:id/certificate",authMiddleware,checkPermission("generate_metrology_certificates"),generateCertificate);
export default router;
