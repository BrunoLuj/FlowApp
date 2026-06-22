import { comparePassword, createJWT} from "../libs/index.js";
import { findUserByEmail, findUserById } from "../models/authModel.js";

export const signinUser = async(req, res) =>{
    try{

        const email = req.body.email?.trim().toLowerCase();
        const password = req.body.password;
        if (!email || !password) {
            return res.status(400).json({ status: "Failed", message: "Email and password are required." });
        }
        const user = await findUserByEmail(email);

        if(!user || user.status === false){
            return res.status(401).json({
                status: "Failed",
                message: "Invalid Email or Password!",
            });
        }

        const isMatch = await comparePassword(password, user?.password);

        if(!isMatch){
            return res.status(401).json({
                status: "Failed",
                message: "Invalid Email or Password!",
            });
        }

        const token = createJWT(user.id, user.roles_id, user.permissions, user.client_id,user.loyalty_portal_only);
     
        user.password = undefined;
        user.permissions = undefined;

        res.status(200).json({
            status: "Success",
            message: "Login Succesfully!",
            user,
            token,
        });

    }catch(error){
        console.error("Sign in failed:", error);
        res.status(500).json({
            status: "Failed",
            message: "Sign in failed.",
        });
    }
};

export const getSession = async (req, res) => {
    try {
        const user = await findUserById(req.user.userId);
        if (!user || user.status === false) {
            return res.status(401).json({ status: "auth_failed", message: "Authentication failed" });
        }
        const token = createJWT(user.id, user.roles_id, user.permissions, user.client_id,user.loyalty_portal_only);
        delete user.permissions;
        res.json({ user, token });
    } catch (error) {
        console.error("Session refresh failed:", error);
        res.status(500).json({ error: "Session refresh failed" });
    }
};
