import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkPermission from "../middleware/permissionsMiddleware.js";
import {getMyLoyalty,redeemReward,updateBranding} from "../controllers/loyaltyPortalController.js";

const router=express.Router();
router.get("/me",authMiddleware,getMyLoyalty);
router.post("/redeem",authMiddleware,redeemReward);
router.put("/branding",authMiddleware,checkPermission("manage_loyalty_branding"),updateBranding);
export default router;
