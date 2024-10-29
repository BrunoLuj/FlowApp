import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { changePassword, getUser, getAllUsers, updateUser, getUsersRoles, deleteUser, addUsers, updateUserProfile } from "../controllers/userController.js";
import checkPermission  from "../middleware/permissionsMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getUser);
router.get("/all", authMiddleware, checkPermission('create_users'), getAllUsers);
router.post("/", authMiddleware, checkPermission('create_users'), addUsers);
router.put("/change-password", authMiddleware, changePassword);
router.put("/:id", authMiddleware, checkPermission('update_users'), updateUser);
router.put("/profile/:id", authMiddleware, checkPermission('update_profile'), updateUserProfile);
router.get("/roles/", authMiddleware, checkPermission('create_users'), getUsersRoles);
router.delete("/:id", authMiddleware, checkPermission('delete_users'), deleteUser);

export default router;