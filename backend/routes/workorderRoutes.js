import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkPermission from "../middleware/permissionsMiddleware.js";
import {
    getWorkOrders,
    getActiveWorkOrders,
    addWorkOrder,
    updateWorkOrder,
    deleteWorkOrder
} from "../controllers/workorderController.js";

const router = express.Router();

router.get("/", authMiddleware, checkPermission('view_work_orders'), getWorkOrders);
router.get("/active", authMiddleware, checkPermission('view_work_orders'), getActiveWorkOrders);
router.post("/", authMiddleware, checkPermission('create_work_orders'), addWorkOrder);
router.put("/:id", authMiddleware, checkPermission('update_work_orders'), updateWorkOrder);
router.delete("/:id", authMiddleware, checkPermission('delete_work_orders'), deleteWorkOrder);

export default router;
