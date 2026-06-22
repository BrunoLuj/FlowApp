import {getPortalIdentity} from "../models/loyaltyPortalModel.js";

const externalRequest=async(identity)=>{
    const base=process.env.LOYALTY_EXTERNAL_API_URL?.trim();
    if(!base)return {configured:false,data:null};
    const url=new URL(base);
    url.searchParams.set("external_id",identity.loyalty_external_id||"");
    url.searchParams.set("email",identity.email);
    url.searchParams.set("client_id",String(identity.client_id));
    const headers={Accept:"application/json"};
    if(process.env.LOYALTY_EXTERNAL_API_KEY){
        headers.Authorization=`Bearer ${process.env.LOYALTY_EXTERNAL_API_KEY}`;
    }
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),Number(process.env.LOYALTY_EXTERNAL_API_TIMEOUT_MS)||10000);
    try{
        const response=await fetch(url,{headers,signal:controller.signal});
        if(!response.ok){
            const error=new Error(`External loyalty API returned ${response.status}`);
            error.status=response.status;
            throw error;
        }
        return {configured:true,data:await response.json()};
    }finally{clearTimeout(timeout);}
};

export const getMyLoyalty=async(req,res)=>{
    try{
        const identity=await getPortalIdentity(req.user.userId);
        if(!identity?.loyalty_portal_only){
            return res.status(403).json({error:"Korisnik nema pristup loyalty portalu."});
        }
        const external=await externalRequest(identity);
        res.json({
            configured:external.configured,
            customer:{
                external_id:identity.loyalty_external_id,
                email:identity.email,
                first_name:identity.firstname,
                last_name:identity.lastname,
                company_name:identity.company_name,
            },
            data:external.data,
        });
    }catch(error){
        console.error("External loyalty portal failed:",error);
        res.status(502).json({error:"Loyalty podatke trenutno nije moguće učitati iz vanjskog sustava."});
    }
};
