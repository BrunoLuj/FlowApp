import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkPermission from "../middleware/permissionsMiddleware.js";
import {
    completeCase,createCase,generateDocument,getCase,getOptions,listCases,saveCase,
} from "../controllers/metrologyCaseController.js";

import { uploadSingleFile } from '../middleware/uploadMiddleware.js';
import {getWorkflow,savePreparation,returnRequest,emailRequest,generatePackage,closeCase,downloadWorkflowFile} from '../controllers/metrologyWorkflowController.js';
const router=express.Router();
router.get('/:id/workflow',authMiddleware,checkPermission('view_metrology_cases'),getWorkflow);
router.get('/:id/files/:fileId',authMiddleware,checkPermission('view_metrology_cases'),downloadWorkflowFile);
router.put('/:id/preparation',authMiddleware,checkPermission('manage_metrology_cases'),savePreparation);
router.post('/:id/returned-request',authMiddleware,checkPermission('manage_metrology_cases'),uploadSingleFile,returnRequest);
router.post('/:id/email-request',authMiddleware,checkPermission('manage_metrology_cases'),checkPermission('generate_metrology_case_documents'),emailRequest);
router.post('/:id/packages/:kind',authMiddleware,checkPermission('manage_metrology_cases'),checkPermission('generate_metrology_case_documents'),generatePackage);
router.post('/:id/close',authMiddleware,checkPermission('manage_metrology_cases'),checkPermission('approve_metrology_inspections'),closeCase);
router.get("/",authMiddleware,checkPermission("view_metrology_cases"),listCases);
router.get("/options",authMiddleware,checkPermission("view_metrology_cases"),getOptions);
router.get("/:id",authMiddleware,checkPermission("view_metrology_cases"),getCase);
router.post("/",authMiddleware,checkPermission("manage_metrology_cases"),createCase);
router.put("/:id",authMiddleware,checkPermission("manage_metrology_cases"),saveCase);
router.post("/:id/complete",authMiddleware,checkPermission("manage_metrology_cases"),checkPermission("approve_metrology_inspections"),completeCase);
router.post("/:id/documents/:type",authMiddleware,checkPermission("generate_metrology_case_documents"),generateDocument);
export default router;
