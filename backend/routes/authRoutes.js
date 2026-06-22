import express from "express";
import { getSession, signinUser } from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import {
    authAccountRateLimiter,authRateLimiter,
} from "../middleware/securityMiddleware.js";

const router = express.Router();

router.post("/sign-in",authRateLimiter,authAccountRateLimiter,signinUser);
router.get("/session", authMiddleware, getSession);

export default router;
