import { comparePassword, hashPassword} from "../libs/index.js";
import * as userModel from "../models/userModel.js";
import crypto from "crypto";

export const getAllUsers = async (req, res) => {
  try {
    const users = await userModel.getAllUsers();
    // Uklanjamo lozinku iz svakog korisnika
    const sanitizedUsers = users.map(user => {
      user.password = undefined;
      return user;
    });
    res.json(sanitizedUsers);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching users' });
  }
};

export const getUsersRoles = async(req, res) =>{
  try {
    const roles = await userModel.getUsersRoles();
    res.json(roles);
  } catch (error) {
      res.status(500).json({ error: 'Error fetching roles' });
  }
};

export const getUser = async(req, res) =>{
    try{
        const {userId} = req.user;
        const user = await userModel.getUserById(userId);

        if(!user){
            return res.status(404).json({
                status: "Failed",
                message: "User not found!",
            });
        }

        user.password = undefined;

        res.status(201).json({
          status: "success",
          user,
        });

    }catch(error){
        console.error("Error fetching user:", error);
        res.status(500).json({
            status: "Failed",
            message: error.message,
        });
    }
};

export const addUsers= async (req, res) => {
  const { email, firstname, lastname, address, country, currency, contact, roles_id, status, client_id } = req.body;
  try {
      if (!email?.trim() || !firstname?.trim() || !roles_id) {
        return res.status(400).json({ error: "Email, first name and role are required" });
      }
      const role = await userModel.getRoleById(roles_id);
      if (!role) return res.status(400).json({ error: "Selected role does not exist" });
      if (role.name.startsWith("client_") && !client_id) {
        return res.status(400).json({ error: "Client role must be linked to a client" });
      }
      const temporaryPassword = `Fl!${crypto.randomBytes(9).toString("base64url")}`;
      const hashedPassword = await hashPassword(temporaryPassword);
      const newUser = await userModel.createUser(
        email.trim().toLowerCase(), firstname.trim(), lastname?.trim(), address,
        country, currency, contact, roles_id, status, hashedPassword, client_id
      );
      res.status(201).json({ ...newUser, temporary_password: temporaryPassword });
  } catch (error) {
      if (error.code === "23505") return res.status(409).json({ error: "Email already exists" });
      res.status(500).json({ error: 'Error creating User' });
  }
};

export const changePassword = async (req, res) => {
    try {
      const { userId } = req.user;
      const { currentPassword, newPassword, confirmPassword } = req.body;

      const user = await userModel.getUserCredentialsById(userId);
  
      if (!user) {
        return res
          .status(404)
          .json({ status: "Failed", message: "User not found." });
      }
  
      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          status: "Failed",
          message: "New Passwords does not match.",
        });
      }
      if (
        typeof newPassword !== "string" ||
        newPassword.length < 10 ||
        !/[A-Z]/.test(newPassword) ||
        !/[a-z]/.test(newPassword) ||
        !/[0-9]/.test(newPassword) ||
        !/[^A-Za-z0-9]/.test(newPassword)
      ) {
        return res.status(400).json({
          status: "Failed",
          message: "Password must have at least 10 characters, uppercase, lowercase, number and special character.",
        });
      }
  
      const isMatch = await comparePassword(currentPassword, user?.password);
  
      if (!isMatch) {
        return res
          .status(401)
          .json({ status: "Failed", message: "Invalid current password." });
      }
  
      await userModel.changeUserPassword(userId, newPassword);
  
      res.status(200).json({
        status: "Success",
        message: "Password changed successfully",
      });
    } catch (error) {
      console.error("Password change failed:", error);
      res.status(500).json({ status: "failed", message: error.message });
    }
};

export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { firstname, lastname, address, country, currency, contact, roles_id, status, client_id  } = req.body;

  const user = await userModel.getUserById(id);
  
  if (!user) {
    return res
      .status(404)
      .json({ status: "Failed", message: "User not found." });
  }

  try {
      const role = await userModel.getRoleById(roles_id);
      if (!role) return res.status(400).json({ error: "Selected role does not exist" });
      if (role.name.startsWith("client_") && !client_id) {
        return res.status(400).json({ error: "Client role must be linked to a client" });
      }
      const updatedUser = await userModel.updateUserById(id, firstname, lastname, address, country, currency, contact, roles_id, status, client_id);
      updatedUser.password = undefined; 
      if (updatedUser) {
          // res.json(updatedUser);
          res.status(200).json({
            status: "Success",
            message: "User information updated successfully",
            user: updatedUser,
          });
      } else {
          res.status(404).json({ error: 'User not found' });
      }
  } catch (error) {
      res.status(500).json({ status: "Failed", message: error.message });
  }
};

export const updateUserProfile = async (req, res) => {
  const id = req.user.userId;
  const { firstname, lastname, address, country, currency, contact  } = req.body;

  const user = await userModel.getUserById(id);
  
  if (!user) {
    return res
      .status(404)
      .json({ status: "Failed", message: "User not found." });
  }

  try {
      const updatedUserProfile = await userModel.updateUserProfileById(id, firstname, lastname, address, country, currency, contact );
      updatedUserProfile.password = undefined; 
      if (updatedUserProfile) {
          // res.json(updatedUser);
          res.status(200).json({
            status: "Success",
            message: "User information updated successfully",
            user: updatedUserProfile,
          });
      } else {
          res.status(404).json({ error: 'User not found' });
      }
  } catch (error) {
      res.status(500).json({ status: "Failed", message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
      const deleteUser = await userModel.deleteUser(id);
      if (deleteUser) {
          res.json({ message: 'User deleted' });
      } else {
          res.status(404).json({ error: 'User not found' });
      }
  } catch (error) {
      res.status(500).json({ error: 'Error deleting user' });
  }
};
