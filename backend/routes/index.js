import express from "express";
import authRoutes from "./authRoutes.js";
import accountRoutes from "./accountRoutes.js";
import userRoutes from "./userRoutes.js";
import clientsRoutes from "./clientsRoutes.js";
import transactionRoutes from "./transactionRoutes.js";
import projectsRoutes from "./projectsRoutes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/projects", projectsRoutes);
router.use("/clients", clientsRoutes);
router.use("/account", accountRoutes);
router.use("/transaction", transactionRoutes);

export default router;
