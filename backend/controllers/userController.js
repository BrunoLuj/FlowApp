import {pool} from "../libs/database.js"
import { comparePassword, hashPassword } from "../libs/index.js";

export const getUser = async(req, res) =>{
    try{

        const {userId} = req.body.user;

        const userExist = await pool.query({
            text:`SELECT * FROM users WHERE id = $1`,
            values: [userId],
        });

        const user = userExist.rows[0];

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

      console.log(req.body.user);
      console.log(req.body);

  
      const userExist = await pool.query({
        text: `SELECT * FROM users WHERE id = $1`,
        values: [userId],
      });
  
      const user = userExist.rows[0];
  
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
  
      const hashedPassword = await hashPassword(newPassword);
  
      await pool.query({
        text: `UPDATE users SET password = $1 WHERE id = $2`,
        values: [hashedPassword, userId],
      });
  
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
      const { firstname, lastname, country, currency, contact } = req.body;
  
      const userExist = await pool.query({
        text: `SELECT * FROM users WHERE id = $1`,
        values: [userId],
      });
  
      const user = userExist.rows[0];
  
      if (!user) {
        return res
          .status(404)
          .json({ status: "Failed", message: "User not found." });
      }
  
      const updatedUser = await pool.query({
        text: `UPDATE users SET firstname = $1, lastname = $2, country = $3, currency = $4, contact = $5, updatedat = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *`,
        values: [firstname, lastname, country, currency, contact, userId],
      });
  
      updatedUser.rows[0].password = undefined;
  
      res.status(200).json({
        status: "Success",
        message: "User information updated successfully",
        user: updatedUser.rows[0],
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ status: "Failed", message: error.message });
    }
  };


// export const signinUser = async(req, res) =>{
//     try{

//     }catch(error){
//         console.log(error);
//         res.status(500).json({
//             status: "Failed",
//             message: error.message,
//         });
//     }
// };