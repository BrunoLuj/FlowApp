import { comparePassword, createJWT} from "../libs/index.js";
import { findUserByEmail, findUserById } from "../models/authModel.js";
import { normalizeEmail,validEmail } from "../libs/validation.js";
import {recordAuthEvent} from "../models/securityModel.js";

export const signinUser = async(req, res) =>{
    try{

        const email=normalizeEmail(req.body?.email);
        const password = req.body.password;
        if(!validEmail(email)||typeof password!=="string"||password.length<1||password.length>200){
            return res.status(400).json({
                status:"Failed",
                message:"Unesite ispravnu e-mail adresu i lozinku.",
                request_id:req.requestId,
            });
        }
        const user = await findUserByEmail(email);

        if(!user || user.status === false){
            await recordAuthEvent({email,userId:user?.id||null,success:false,reason:"invalid_credentials",req});
            return res.status(401).json({
                status: "Failed",
                message: "Invalid Email or Password!",
                request_id:req.requestId,
            });
        }

        const isMatch = await comparePassword(password, user?.password);

        if(!isMatch){
            await recordAuthEvent({email,userId:user.id,success:false,reason:"invalid_credentials",req});
            return res.status(401).json({
                status: "Failed",
                message: "Invalid Email or Password!",
                request_id:req.requestId,
            });
        }

        const token = createJWT(user.id, user.roles_id, user.permissions, user.client_id,user.loyalty_portal_only);
        await recordAuthEvent({email,userId:user.id,success:true,reason:"authenticated",req});
     
        user.password = undefined;
        user.permissions = undefined;

        res.status(200).json({
            status: "Success",
            message: "Login Succesfully!",
            user,
            token,
            request_id:req.requestId,
        });

    }catch(error){
        console.error("Sign in failed:", error);
        res.status(500).json({
            status: "Failed",
            message: "Sign in failed.",
            request_id:req.requestId,
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
        res.json({ user, token,request_id:req.requestId });
    } catch (error) {
        console.error("Session refresh failed:", error);
        res.status(500).json({ error: "Session refresh failed" });
    }
};
