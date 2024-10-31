import express from "express";
import {getTranslations} from "../controllers/translationsController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:lang", getTranslations);

export default router;