import JWT from "jsonwebtoken";

const authMiddleware = async(req, res, next)=>{
    const authHeader = req?.headers?.authorization;

    console.log(authHeader);

    if(!authHeader || !authHeader?.startsWith("Bearer")){
        return res.status(401).json({
            status: "auth_failed",
            message: "Authentication failed",
        });
    }

    const token = authHeader?.split(" ")[1];

    console.log(token);

    try {
        const userToken = JWT.verify(token, process.env.JWT_SECRET);

        req.body.user = {
            userId: userToken.userId,
        };

        next();
        
    } catch (error) {
        console.log(error);
        return res.status(401).json({
            status: "auth_failed",
            message: "Authentication failed",
        });    
    }
};

export default authMiddleware;