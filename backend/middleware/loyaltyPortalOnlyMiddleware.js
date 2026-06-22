import JWT from "jsonwebtoken";

const loyaltyPortalOnlyMiddleware=(req,res,next)=>{
    const authHeader=req.headers.authorization;
    if(!authHeader?.startsWith("Bearer "))return next();
    try{
        const token=JWT.verify(authHeader.split(" ")[1],process.env.JWT_SECRET);
        if(token.loyalty_portal_only){
            return res.status(403).json({
                status:"loyalty_portal_only",
                message:"Ovaj korisnički račun ima pristup samo Loyalty portalu.",
            });
        }
    }catch{
        // Autentikaciju i istek tokena obrađuje auth middleware ciljane rute.
    }
    next();
};
export default loyaltyPortalOnlyMiddleware;
