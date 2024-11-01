import express from "express";
import authRoutes from "./authRoutes.js";
// import accountRoutes from "./accountRoutes.js";
import userRoutes from "./userRoutes.js";
import clientsRoutes from "./clientsRoutes.js";
import transactionRoutes from "./transactionRoutes.js";
import projectsRoutes from "./projectsRoutes.js";
import translationRoutes from "./translationRoutes.js";
import inspectionsRoutes from "./inspectionsRoutes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/projects", projectsRoutes);
router.use("/clients", clientsRoutes);
// router.use("/account", accountRoutes);
router.use("/transaction", transactionRoutes);
router.use("/translations", translationRoutes);
router.use("/inspections", inspectionsRoutes);

export default router;
