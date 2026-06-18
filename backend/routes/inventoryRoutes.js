import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkPermission from "../middleware/permissionsMiddleware.js";
import {
    addItem,
    addMovement,
    addWarehouse,
    editItem,
    getAvailable,
    getOverview,
} from "../controllers/inventoryController.js";

const router = express.Router();

router.get("/", authMiddleware, checkPermission("view_inventory"), getOverview);
router.get("/available", authMiddleware, checkPermission("view_inventory"), getAvailable);
router.post("/items", authMiddleware, checkPermission("manage_inventory"), addItem);
router.put("/items/:id", authMiddleware, checkPermission("manage_inventory"), editItem);
router.post("/warehouses", authMiddleware, checkPermission("manage_inventory"), addWarehouse);
router.post("/movements", authMiddleware, checkPermission("manage_inventory"), addMovement);

export default router;
