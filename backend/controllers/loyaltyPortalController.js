import {getLocalPortalData,getPortalIdentity} from "../models/loyaltyPortalModel.js";

const demoEnabled=()=>String(process.env.LOYALTY_DEMO_MODE||"").toLowerCase()==="true";
const portalSource=()=>{
    if(demoEnabled())return "demo";
    const configured=String(process.env.LOYALTY_PORTAL_SOURCE||"").trim().toLowerCase();
    if(configured)return configured;
    return process.env.LOYALTY_EXTERNAL_API_URL?.trim()?"external":"local";
};
const demoData=(identity)=>{
    const now=new Date();
    const daysAgo=(days)=>new Date(now.getTime()-days*86400000).toISOString();
    return {
        member:{
            external_id:identity.loyalty_external_id||`DEMO-${identity.id}`,
            full_name:`${identity.firstname||""} ${identity.lastname||""}`.trim(),
            points_balance:2840,
            lifetime_points:7350,
            tier:"Gold",
            next_tier:"Platinum",
        },
        transactions:[
            {id:"demo-1",description:"Kupnja goriva",points:185,created_at:daysAgo(1)},
            {id:"demo-2",description:"Bonus za vikend",points:250,created_at:daysAgo(4)},
            {id:"demo-3",description:"Iskorišten popust na autopraonicu",points:-500,created_at:daysAgo(9)},
            {id:"demo-4",description:"Kupnja u trgovini",points:90,created_at:daysAgo(14)},
        ],
        rewards:[
            {id:"reward-1",name:"Besplatna kava",description:"Jedna kava po izboru na prodajnom mjestu.",points_cost:350},
            {id:"reward-2",name:"10% popusta na gorivo",description:"Popust na jednu kupnju do 60 litara.",points_cost:1800},
            {id:"reward-3",name:"Premium pranje vozila",description:"Kompletno vanjsko pranje vozila.",points_cost:950},
        ],
        promotions:[
            {id:"promo-1",badge:"Vikend akcija",title:"Dvostruki bodovi",message:"Ovaj vikend ostvarujete dvostruke bodove na svaku kupnju goriva.",bonus_points:200},
            {id:"promo-2",badge:"Samo za Gold članove",title:"Kava dobrodošlice",message:"Preuzmite besplatnu kavu uz sljedeću kupnju u trgovini."},
            {id:"promo-3",badge:"Nova pogodnost",title:"Bonus za autopraonicu",message:"Osvojite dodatnih 150 bodova korištenjem autopraonice.",bonus_points:150},
        ],
    };
};

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
    let source="local";
    try{
        const identity=await getPortalIdentity(req.user.userId);
        if(!identity?.loyalty_portal_only){
            return res.status(403).json({error:"Korisnik nema pristup loyalty portalu."});
        }
        source=portalSource();
        let result;
        if(source==="demo"){
            result={configured:true,data:demoData(identity),memberFound:true};
        }else if(source==="local"){
            const data=await getLocalPortalData(identity);
            result={configured:true,data,memberFound:Boolean(data)};
        }else if(source==="external"){
            const external=await externalRequest(identity);
            result={...external,memberFound:Boolean(external.data)};
        }else{
            return res.status(500).json({error:"LOYALTY_PORTAL_SOURCE mora biti local, external ili demo."});
        }
        res.json({
            configured:result.configured,
            source,
            demo:source==="demo",
            member_found:result.memberFound,
            customer:{
                external_id:identity.loyalty_external_id,
                email:identity.email,
                first_name:identity.firstname,
                last_name:identity.lastname,
                company_name:identity.company_name,
            },
            data:result.data,
        });
    }catch(error){
        console.error(`Loyalty portal (${source}) failed:`,error);
        const external=source==="external";
        res.status(external?502:500).json({
            error:external
                ?"Loyalty podatke trenutno nije moguće učitati iz vanjskog sustava."
                :"Loyalty podatke trenutno nije moguće učitati.",
        });
    }
};
