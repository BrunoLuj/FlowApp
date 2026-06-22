import "dotenv/config";
import cors from "cors";
import express from "express";
import routes from "./routes/index.js";
import {
    apiRateLimiter,requestContext,securityHeaders,
} from "./middleware/securityMiddleware.js";

const allowedOrigins=(process.env.CORS_ORIGIN||"http://localhost:3000")
    .split(",").map(origin=>origin.trim()).filter(Boolean);

const app=express();
if(String(process.env.TRUST_PROXY||"").toLowerCase()==="true")app.set("trust proxy",1);
app.disable("x-powered-by");
app.use(requestContext);
app.use(securityHeaders);
app.use(cors({
    origin:(origin,callback)=>{
        if(!origin||allowedOrigins.includes(origin))return callback(null,true);
        const error=new Error("Origin is not allowed by CORS");
        error.status=403;
        callback(error);
    },
    credentials:true,
    methods:["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
    allowedHeaders:["Authorization","Content-Type","X-Request-Id"],
    exposedHeaders:["X-Request-Id","RateLimit-Limit","RateLimit-Remaining","RateLimit-Reset"],
}));
app.use(express.json({limit:process.env.JSON_BODY_LIMIT||"2mb",strict:true}));
app.use(express.urlencoded({extended:true,limit:process.env.FORM_BODY_LIMIT||"1mb"}));
app.use("/api-v1",apiRateLimiter,routes);
app.use("*",(req,res)=>res.status(404).json({
    status:"not_found",message:"Route does not exist",request_id:req.requestId,
}));
app.use((error,req,res,_next)=>{
    const status=error.status||(
        error.type==="entity.too.large"?413:
        error instanceof SyntaxError&&error.status===400?400:500
    );
    if(status>=500)console.error(`Unhandled request error [${req.requestId}]:`,error);
    res.status(status).json({
        status:status===403?"forbidden":"error",
        message:status===413?"Request body is too large":
            status===400?"Invalid request body":
            status===403?error.message:"Internal server error",
        request_id:req.requestId,
    });
});

export default app;
