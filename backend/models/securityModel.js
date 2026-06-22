import crypto from "crypto";
import {pool} from "../libs/database.js";

export const recordAuthEvent=async({
    userId=null,email="",success=false,reason=null,req,
})=>{
    try{
        const emailHash=email
            ?crypto.createHash("sha256").update(email).digest("hex")
            :null;
        await pool.query(
            `INSERT INTO auth_security_events
                (user_id,email_hash,event_type,success,reason,ip_address,user_agent,request_id)
             VALUES($1,$2,'sign_in',$3,$4,$5,$6,$7)`,
            [userId,emailHash,Boolean(success),reason,
                String(req.ip||req.socket?.remoteAddress||"").slice(0,80),
                String(req.headers["user-agent"]||"").slice(0,500),
                req.requestId||null]
        );
    }catch(error){
        console.error(`Auth security audit failed [${req.requestId||"no-request-id"}]:`,error);
    }
};
