import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkPermission from "../middleware/permissionsMiddleware.js";
import {
    createFromWorkOrder,
    decideQuotation,
    getContract,
    getOverview,
    getPublicQuotation,
    getQuotation,
    saveContract,
    saveQuotation,
} from "../controllers/commercialController.js";

const router = express.Router();

router.get("/public/quotations/:token", getPublicQuotation);
router.post("/public/quotations/:token/decision", decideQuotation);

router.get("/", authMiddleware, checkPermission("view_commercial"), getOverview);
router.get("/contracts/:id", authMiddleware, checkPermission("view_commercial"), getContract);
router.post("/contracts", authMiddleware, checkPermission("manage_commercial"), saveContract);
router.put("/contracts/:id", authMiddleware, checkPermission("manage_commercial"), saveContract);
router.get("/quotations/:id", authMiddleware, checkPermission("view_commercial"), getQuotation);
router.post("/quotations", authMiddleware, checkPermission("manage_commercial"), saveQuotation);
router.put("/quotations/:id", authMiddleware, checkPermission("manage_commercial"), saveQuotation);
router.post(
    "/quotations/from-work-order/:workOrderId",
    authMiddleware,
    checkPermission("manage_commercial"),
    createFromWorkOrder
);

export default router;
