import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {getMyLoyalty} from "../controllers/loyaltyPortalController.js";

const router=express.Router();
router.get("/me",authMiddleware,getMyLoyalty);
export default router;
