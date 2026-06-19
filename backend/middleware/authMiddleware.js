import JWT from "jsonwebtoken";

const authMiddleware = async(req, res, next)=>{
    const authHeader = req?.headers?.authorization;

    if(!authHeader || !authHeader?.startsWith("Bearer")){
        return res.status(401).json({
            status: "auth_failed",
            message: "Authentication failed",
        });
    }

    const token = authHeader?.split(" ")[1];

    try {
        const userToken = JWT.verify(token, process.env.JWT_SECRET);

        req.user = {
            userId: userToken.userId,
            rolesId: userToken.roles_id,
            clientId: userToken.client_id ?? null,
            permissions: userToken.permissions ?? [],
        };
        next();
        
    } catch (error) {
        return res.status(401).json({
            status: "auth_failed",
            message: "Authentication failed",
        });    
    }
};

export default authMiddleware;
