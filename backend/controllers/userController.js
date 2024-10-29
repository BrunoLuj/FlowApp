import { comparePassword} from "../libs/index.js";
import * as userModel from "../models/userModel.js";

export const getAllUsers = async(req, res) =>{
  try {
    const users = await userModel.getAllUsers();
    res.json(users);
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
        const {userId} = req.body.user;
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
        console.log(error);
        res.status(500).json({
            status: "Failed",
            message: error.message,
        });
    }
};

export const changePassword = async (req, res) => {
    try {
      const { userId } = req.body.user;
      const { currentPassword, newPassword, confirmPassword } = req.body;

      const user = await userModel.getUserById(userId);
  
      if (!user) {
        return res
          .status(404)
          .json({ status: "Failed", message: "User not found." });
      }
  
      if (newPassword !== confirmPassword) {
        return res.status(401).json({
          status: "Failed",
          message: "New Passwords does not match.",
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
      console.log(error);
      res.status(500).json({ status: "failed", message: error.message });
    }
};

export const updateUser = async (req, res) => {
    try {
      const { userId } = req.body.user;
      const userData = req.body;
  
      const user = await userModel.getUserById(userId);
  
      if (!user) {
        return res
          .status(404)
          .json({ status: "Failed", message: "User not found." });
      }
  
      const updatedUser = await userModel.updateUserById(userId, userData);
      updatedUser.password = undefined;
  
      res.status(200).json({
        status: "Success",
        message: "User information updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ status: "Failed", message: error.message });
    }
};
