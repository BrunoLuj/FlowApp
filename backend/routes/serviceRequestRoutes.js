import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkPermission from "../middleware/permissionsMiddleware.js";
import {
    addMessage,
    addServiceRequest,
    convertToWorkOrder,
    getServiceRequest,
    getServiceRequests,
    updateServiceRequest,
} from "../controllers/serviceRequestController.js";

const router = express.Router();

router.get("/", authMiddleware, checkPermission("view_service_requests"), getServiceRequests);
router.get("/:id", authMiddleware, checkPermission("view_service_requests"), getServiceRequest);
router.post("/", authMiddleware, checkPermission("create_service_requests"), addServiceRequest);
router.patch("/:id", authMiddleware, checkPermission("manage_service_request_sla"), updateServiceRequest);
router.post("/:id/messages", authMiddleware, checkPermission("reply_service_requests"), addMessage);
router.post(
    "/:id/convert-to-work-order",
    authMiddleware,
    checkPermission("create_work_orders"),
    convertToWorkOrder
);

export default router;
