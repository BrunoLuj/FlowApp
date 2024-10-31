import express from "express";
import {getTranslations} from "../controllers/transactionController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:lang", authMiddleware, getTranslations);

export default router;