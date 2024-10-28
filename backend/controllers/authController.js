import { comparePassword, createJWT} from "../libs/index.js";
import { createUser, findUserByEmail, userExist } from "../models/authModel.js";

export const signupUser = async(req, res) =>{
    try{
        const {firstName, email, password} = req.body;

        if(!(firstName || email || password)){
            return res.status(404).json({
                status: "Failed",
                message: "Provide Required Fields!",
            });
        }

        const existingUser = await userExist(email);

        if(existingUser.userExist){
            return res.status(409).json({
                status: "Failed",
                message: "Email Adress already exist. Try Login!",
            });
        }

        const user = await createUser(firstName, email, password)
        user.password = undefined;

        res.status(201).json({
            status: "Success",
            message: "User account created succesfully!",
            user: user,
        });
        
    }catch(error){
        console.log(error);
        res.status(500).json({
            status: "Failed",
            message: error.message,
        });
    }
};

export const signinUser = async(req, res) =>{
    try{

        const {email, password} = req.body;
        const user = await findUserByEmail(email);

        console.log(user);

        if(!user){
            return res.status(404).json({
                status: "Failed",
                message: "Invalid Email or Password!",
            });
        }

        const isMatch = await comparePassword(password, user?.password);

        if(!isMatch){
            return res.status(404).json({
                status: "Failed",
                message: "Invalid Email or Password!",
            });
        }

        console.log(user);

        const token = createJWT(user.id, user.roles_id, user.permissions);
     
        user.password = undefined;
        user.permissions = undefined;

        res.status(200).json({
            status: "Success",
            message: "Login Succesfully!",
            user,
            token,
        });

    }catch(error){
        console.log(error);
        res.status(500).json({
            status: "Failed",
            message: error.message,
        });
    }
};
