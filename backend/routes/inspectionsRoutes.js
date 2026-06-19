import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkPermission  from "../middleware/permissionsMiddleware.js";
import { addInspections } from "../controllers/inspectionsController.js";

const router = express.Router();

router.post("/", authMiddleware, checkPermission("create_inspections"), addInspections);

export default router;
