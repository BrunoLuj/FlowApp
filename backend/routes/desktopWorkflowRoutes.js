import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkPermission from "../middleware/permissionsMiddleware.js";
import { saveWorkflow, updateStage, validateIdentity } from "../controllers/desktopWorkflowController.js";

const router=express.Router();
router.post("/validate",authMiddleware,checkPermission("view_work_orders"),validateIdentity);
router.post("/",authMiddleware,checkPermission("create_work_orders"),saveWorkflow);
router.patch("/:id/stage",authMiddleware,checkPermission("update_work_orders"),updateStage);
export default router;
