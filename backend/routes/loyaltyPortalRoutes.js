import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {getMyLoyalty,redeemReward} from "../controllers/loyaltyPortalController.js";

const router=express.Router();
router.get("/me",authMiddleware,getMyLoyalty);
router.post("/redeem",authMiddleware,redeemReward);
export default router;
