import crypto from "crypto";

const positiveNumber=(value,fallback)=>{
    const parsed=Number(value);
    return Number.isFinite(parsed)&&parsed>0?parsed:fallback;
};

export const requestContext=(req,res,next)=>{
    const incoming=String(req.headers["x-request-id"]||"").trim();
    req.requestId=/^[A-Za-z0-9._-]{8,100}$/.test(incoming)?incoming:crypto.randomUUID();
    res.setHeader("X-Request-Id",req.requestId);
    next();
};

export const securityHeaders=(_req,res,next)=>{
    res.setHeader("X-Content-Type-Options","nosniff");
    res.setHeader("X-Frame-Options","DENY");
    res.setHeader("Referrer-Policy","strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy","camera=(), microphone=(), geolocation=()");
    res.setHeader("Cross-Origin-Opener-Policy","same-origin");
    res.setHeader("Cross-Origin-Resource-Policy","same-site");
    res.setHeader("Content-Security-Policy","default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    if(process.env.NODE_ENV==="production"){
        res.setHeader("Strict-Transport-Security","max-age=31536000; includeSubDomains");
    }
    next();
};

export const createRateLimiter=({
    windowMs=60_000,
    max=120,
    keyGenerator=(req)=>req.ip||req.socket?.remoteAddress||"unknown",
    message="Previše zahtjeva. Pokušajte ponovno kasnije.",
}={})=>{
    const safeWindow=positiveNumber(windowMs,60_000);
    const safeMax=positiveNumber(max,120);
    const buckets=new Map();
    let lastCleanup=Date.now();

    const cleanup=(now)=>{
        if(now-lastCleanup<safeWindow)return;
        for(const [key,bucket] of buckets)if(bucket.resetAt<=now)buckets.delete(key);
        lastCleanup=now;
    };

    const middleware=(req,res,next)=>{
        const now=Date.now();
        cleanup(now);
        const key=String(keyGenerator(req)||"unknown");
        let bucket=buckets.get(key);
        if(!bucket||bucket.resetAt<=now){
            bucket={count:0,resetAt:now+safeWindow};
            buckets.set(key,bucket);
        }
        bucket.count+=1;
        const remaining=Math.max(0,safeMax-bucket.count);
        res.setHeader("RateLimit-Limit",String(safeMax));
        res.setHeader("RateLimit-Remaining",String(remaining));
        res.setHeader("RateLimit-Reset",String(Math.ceil(bucket.resetAt/1000)));
        if(bucket.count>safeMax){
            res.setHeader("Retry-After",String(Math.max(1,Math.ceil((bucket.resetAt-now)/1000))));
            return res.status(429).json({
                status:"rate_limited",
                message,
                request_id:req.requestId,
            });
        }
        next();
    };
    middleware.reset=()=>buckets.clear();
    return middleware;
};

export const apiRateLimiter=createRateLimiter({
    windowMs:positiveNumber(process.env.API_RATE_LIMIT_WINDOW_MS,60_000),
    max:positiveNumber(process.env.API_RATE_LIMIT_MAX,300),
});

export const authRateLimiter=createRateLimiter({
    windowMs:positiveNumber(process.env.AUTH_RATE_LIMIT_WINDOW_MS,15*60_000),
    max:positiveNumber(process.env.AUTH_RATE_LIMIT_MAX,30),
    keyGenerator:(req)=>req.ip||req.socket?.remoteAddress||"unknown",
    message:"Previše pokušaja prijave. Pričekajte prije novog pokušaja.",
});

export const authAccountRateLimiter=createRateLimiter({
    windowMs:positiveNumber(process.env.AUTH_RATE_LIMIT_WINDOW_MS,15*60_000),
    max:positiveNumber(process.env.AUTH_ACCOUNT_RATE_LIMIT_MAX,10),
    keyGenerator:(req)=>String(req.body?.email||"unknown").trim().toLowerCase(),
    message:"Previše pokušaja prijave za ovaj račun. Pričekajte prije novog pokušaja.",
});
