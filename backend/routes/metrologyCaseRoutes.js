import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkPermission from "../middleware/permissionsMiddleware.js";
import {
    completeCase,createCase,generateDocument,getCase,getOptions,listCases,saveCase,
} from "../controllers/metrologyCaseController.js";

const router=express.Router();
router.get("/",authMiddleware,checkPermission("view_metrology_cases"),listCases);
router.get("/options",authMiddleware,checkPermission("view_metrology_cases"),getOptions);
router.get("/:id",authMiddleware,checkPermission("view_metrology_cases"),getCase);
router.post("/",authMiddleware,checkPermission("manage_metrology_cases"),createCase);
router.put("/:id",authMiddleware,checkPermission("manage_metrology_cases"),saveCase);
router.post("/:id/complete",authMiddleware,checkPermission("manage_metrology_cases"),completeCase);
router.post("/:id/documents/:type",authMiddleware,checkPermission("generate_metrology_case_documents"),generateDocument);
export default router;
