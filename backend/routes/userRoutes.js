import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { changePassword, getUser, getAllUsers, updateUser } from "../controllers/userController.js";
import checkPermission  from "../middleware/permissionsMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getUser);
router.get("/all", authMiddleware, checkPermission('create_users'), getAllUsers);
router.put("/change-password", authMiddleware, changePassword);
router.put("/:id", authMiddleware,checkPermission('update_users'), updateUser);
// router.put("/:id", authMiddleware,checkPermission('delete_users'), deleteUser);

export default router;