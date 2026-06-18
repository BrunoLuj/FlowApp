import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkPermission from "../middleware/permissionsMiddleware.js";
import {
    addPlan,
    editPlan,
    ensureAssetToken,
    generateDue,
    generatePlan,
    getAssets,
    getPlans,
    getPublicAsset,
} from "../controllers/maintenanceController.js";

const router = express.Router();

router.get("/public/assets/:token", getPublicAsset);
router.get("/plans", authMiddleware, checkPermission("view_maintenance_plans"), getPlans);
router.get("/assets", authMiddleware, checkPermission("view_maintenance_plans"), getAssets);
router.post("/plans", authMiddleware, checkPermission("manage_maintenance_plans"), addPlan);
router.put("/plans/:id", authMiddleware, checkPermission("manage_maintenance_plans"), editPlan);
router.post("/plans/:id/generate", authMiddleware, checkPermission("manage_maintenance_plans"), generatePlan);
router.post("/generate-due", authMiddleware, checkPermission("manage_maintenance_plans"), generateDue);
router.post("/assets/:assetId/token", authMiddleware, checkPermission("update_clients"), ensureAssetToken);

export default router;
