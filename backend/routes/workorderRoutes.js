import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkPermission from "../middleware/permissionsMiddleware.js";
import {
    getWorkOrders,
    getWorkOrder,
    getWorkOrderHistory,
    getActiveWorkOrders,
    getMyMobileWorkOrders,
    addMobileEvent,
    addWorkOrder,
    addActivity,
    addMaterial,
    addChecklist,
    updateChecklist,
    completeWorkOrder,
    updateFieldData,
    updateSchedule,
    updateWorkOrder,
    deleteWorkOrder
} from "../controllers/workorderController.js";

const router = express.Router();

router.get("/", authMiddleware, checkPermission('view_work_orders'), getWorkOrders);
router.get("/active", authMiddleware, checkPermission('view_work_orders'), getActiveWorkOrders);
router.get("/mobile/mine", authMiddleware, checkPermission('use_mobile_work_orders'), getMyMobileWorkOrders);
router.post("/:id/mobile-events", authMiddleware, checkPermission('use_mobile_work_orders'), addMobileEvent);
router.get("/:id/history", authMiddleware, checkPermission('view_work_order_history'), getWorkOrderHistory);
router.get("/:id", authMiddleware, checkPermission('view_work_orders'), getWorkOrder);
router.post("/", authMiddleware, checkPermission('create_work_orders'), addWorkOrder);
router.post("/:id/activities", authMiddleware, checkPermission('record_work_order_activity'), addActivity);
router.post("/:id/materials", authMiddleware, checkPermission('record_work_order_material'), addMaterial);
router.post("/:id/checklist", authMiddleware, checkPermission('manage_work_order_checklist'), addChecklist);
router.patch("/:id/checklist/:itemId", authMiddleware, checkPermission('manage_work_order_checklist'), updateChecklist);
router.patch("/:id/field-data", authMiddleware, checkPermission('edit_work_order_field_report'), updateFieldData);
router.post("/:id/complete", authMiddleware, checkPermission('complete_work_orders'), completeWorkOrder);
router.patch("/:id/schedule", authMiddleware, checkPermission('schedule_work_orders'), updateSchedule);
router.put("/:id", authMiddleware, checkPermission('update_work_orders'), updateWorkOrder);
router.delete("/:id", authMiddleware, checkPermission('delete_work_orders'), deleteWorkOrder);

export default router;
