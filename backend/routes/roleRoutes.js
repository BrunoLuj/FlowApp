import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkPermission from "../middleware/permissionsMiddleware.js";
import { addRole, getRoles, saveRolePermissions } from "../controllers/roleController.js";

const router = express.Router();

router.get("/", authMiddleware, checkPermission("view_roles"), getRoles);
router.post("/", authMiddleware, checkPermission("manage_roles"), addRole);
router.put("/:id/permissions", authMiddleware, checkPermission("manage_roles"), saveRolePermissions);

export default router;
