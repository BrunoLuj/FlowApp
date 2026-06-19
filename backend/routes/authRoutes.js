import express from "express";
import { getSession, signinUser } from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/sign-in", signinUser);
router.get("/session", authMiddleware, getSession);

export default router;
