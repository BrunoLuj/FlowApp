import { comparePassword, hashPassword} from "../libs/index.js";
import * as userModel from "../models/userModel.js";

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

export const addUsers= async (req, res) => {
  const { email, firstname, lastname, address, country, currency, contact, roles_id, status } = req.body;
  const defaultPassword = 'FlowApp2024@';

  const hashedPassword = await hashPassword(defaultPassword);

  try {
      const newUser = await userModel.createUser(email, firstname, lastname, address, country, currency, contact, roles_id, status, hashedPassword);
      console.log(newUser);
      res.status(201).json(newUser);
  } catch (error) {
      res.status(500).json({ error: 'Error creating User' });
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
  const { id } = req.params;
  const { firstname, lastname, address, country, currency, contact, roles_id, status  } = req.body;

  const user = await userModel.getUserById(id);
  
  if (!user) {
    return res
      .status(404)
      .json({ status: "Failed", message: "User not found." });
  }

  console.log(req.params);
  console.log(req.body);

  try {
      const updatedUser = await userModel.updateUserById(id, firstname, lastname, address, country, currency, contact, roles_id, status );
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
  const { id } = req.params;
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

// export const updateUser = async (req, res) => {
//     try {
//       const { userId } = req.body.user;
//       const userData = req.body;

//       console.log(req.body)
  
//       const user = await userModel.getUserById(userId);
  
//       if (!user) {
//         return res
//           .status(404)
//           .json({ status: "Failed", message: "User not found." });
//       }
  
//       const updatedUser = await userModel.updateUserById(userId, userData);
//       updatedUser.password = undefined;
  
//       res.status(200).json({
//         status: "Success",
//         message: "User information updated successfully",
//         user: updatedUser,
//       });
//     } catch (error) {
//       console.log(error);
//       res.status(500).json({ status: "Failed", message: error.message });
//     }
// };


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