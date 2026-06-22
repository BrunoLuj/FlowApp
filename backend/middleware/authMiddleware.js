import JWT from "jsonwebtoken";

const authMiddleware = async(req, res, next)=>{
    const authHeader = req?.headers?.authorization;

    if(typeof authHeader!=="string"||!/^Bearer [A-Za-z0-9\-._~+/]+=*$/.test(authHeader)){
        return res.status(401).json({
            status: "auth_failed",
            message: "Authentication failed",
            request_id:req.requestId,
        });
    }

    const token = authHeader?.split(" ")[1];

    try {
        const userToken=JWT.verify(token,process.env.JWT_SECRET,{algorithms:["HS256"]});

        req.user = {
            userId: userToken.userId,
            rolesId: userToken.roles_id,
            clientId: userToken.client_id ?? null,
            permissions: userToken.permissions ?? [],
            loyaltyPortalOnly: Boolean(userToken.loyalty_portal_only),
        };
        next();
        
    } catch (error) {
        return res.status(401).json({
            status: "auth_failed",
            message: "Authentication failed",
            request_id:req.requestId,
        });    
    }
};

export default authMiddleware;
