import express from "express";
import authRoutes from "./authRoutes.js";
// import accountRoutes from "./accountRoutes.js";
import userRoutes from "./userRoutes.js";
import clientsRoutes from "./clientsRoutes.js";
import transactionRoutes from "./transactionRoutes.js";
import projectsRoutes from "./projectsRoutes.js";
import translationRoutes from "./translationRoutes.js";
import inspectionsRoutes from "./inspectionsRoutes.js";
import equipmentRoutes from "./equipmentRoutes.js";
import workorderRoutes from "./workorderRoutes.js";
import serviceCenterRoutes from "./serviceCenterRoutes.js";
import serviceRequestRoutes from "./serviceRequestRoutes.js";
import attachmentRoutes from "./attachmentRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import managementRoutes from "./managementRoutes.js";
import inventoryRoutes from "./inventoryRoutes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/projects", projectsRoutes);
router.use("/clients", clientsRoutes);
// router.use("/account", accountRoutes);
router.use("/transaction", transactionRoutes);
router.use("/translations", translationRoutes);
router.use("/inspections", inspectionsRoutes);
router.use("/equipment", equipmentRoutes);
router.use("/work-orders", workorderRoutes);
router.use("/service-center", serviceCenterRoutes);
router.use("/service-requests", serviceRequestRoutes);
router.use("/attachments", attachmentRoutes);
router.use("/notifications", notificationRoutes);
router.use("/management", managementRoutes);
router.use("/inventory", inventoryRoutes);

export default router;
