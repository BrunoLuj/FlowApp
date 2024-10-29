import express from "express";
import {
  createAccount,
  deleteAccount,
  getAccounts,
  updateAccount,
} from "../controllers/accountController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, checkPermission('view_accounts'), getAccounts); // Prikaz svih projekata
router.post("/", authMiddleware, checkPermission('create_accounts'), createAccount); // Dodavanje novog projekta
router.put("/:id", authMiddleware, checkPermission('update_accounts'), updateAccount); // Ažuriranje postojećeg projekta
router.delete("/:id", authMiddleware, checkPermission('delete_accounts'), deleteAccount); // Brisanje projekta

export default router;