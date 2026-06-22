import JWT from "jsonwebtoken";
import bcrypt from "bcryptjs";

export const hashPassword = async (userValue) =>{
    const salt = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(userValue, salt);

    return hashedPassword;
};

export const comparePassword = async(userPassword, password) =>{
    try {
        const isMatch = await bcrypt.compare(userPassword, password);

        return isMatch;
    } catch {
        return false;
    }
};

export const createJWT = (user_id, roles_id, user_permissions, client_id = null, loyalty_portal_only = false) =>{
    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not configured");
    return JWT.sign(
        {
            userId: user_id,
            roles_id: roles_id,
            permissions: user_permissions,
            client_id,
            loyalty_portal_only: Boolean(loyalty_portal_only)
        },
        
        process.env.JWT_SECRET,
        {
            expiresIn: "1h",
            algorithm:"HS256",
        }
    )
};
