import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkPermission from "../middleware/permissionsMiddleware.js";
import {
    addServiceRequest,
    getServiceRequests,
    updateServiceRequest,
} from "../controllers/serviceRequestController.js";

const router = express.Router();

router.get("/", authMiddleware, checkPermission("view_service_requests"), getServiceRequests);
router.post("/", authMiddleware, checkPermission("create_service_requests"), addServiceRequest);
router.patch("/:id", authMiddleware, checkPermission("update_service_requests"), updateServiceRequest);

export default router;
