import * as model from "../models/loyaltyModel.js";
import {
    cleanText,finiteNumber,isPlainObject,positiveId,validEmail,normalizeEmail,
} from "../libs/validation.js";
const bad=(res,message)=>res.status(400).json({error:message});
const validDate=value=>!value||!Number.isNaN(Date.parse(value));
const text=(value,max)=>cleanText(value,max);
const fail=(res,error,message)=>{
    if(error.code==="INSUFFICIENT_POINTS")return res.status(409).json({error:"Član nema dovoljno bodova."});
    if(error.code==="23505")return res.status(409).json({error:"Broj člana ili program već postoji."});
    console.error(message,error);return res.status(500).json({error:message});
};
export const overview=async(req,res)=>{try{res.json(await model.getOverview(req.user,req.query.client_id));}catch(e){fail(res,e,"Loyalty centar nije moguće učitati.");}};
export const saveProgram=async(req,res)=>{
    if(!isPlainObject(req.body)||!text(req.body.name,150)
        ||!finiteNumber(req.body.points_per_currency)||Number(req.body.points_per_currency)<=0
        ||!finiteNumber(req.body.currency_per_point)||Number(req.body.currency_per_point)<=0){
        return bad(res,"Provjerite naziv i vrijednosti Loyalty programa.");
    }
    try{const x=await model.saveProgram({...req.body,name:text(req.body.name,150),description:text(req.body.description,2000),terms:text(req.body.terms,10000)},req.user);if(!x)return bad(res,"Klijent je obavezan.");res.status(201).json(x);}catch(e){fail(res,e,"Program nije moguće spremiti.");}
};
export const createMember=async(req,res)=>{
    const email=normalizeEmail(req.body?.email);
    if(!isPlainObject(req.body)||!positiveId(req.body.program_id)||!text(req.body.full_name,255)
        ||(email&&!validEmail(email)))return bad(res,"Provjerite program, ime i e-mail člana.");
    try{const x=await model.createMember({...req.body,full_name:text(req.body.full_name,255),email:email||null,phone:text(req.body.phone,80),tier:text(req.body.tier,40)||"standard"},req.user);if(!x)return res.status(404).json({error:"Program nije pronađen."});res.status(201).json(x);}catch(e){fail(res,e,"Člana nije moguće dodati.");}
};
export const addTransaction=async(req,res)=>{
    const types=["earn","redeem","adjustment","expire"];
    if(!isPlainObject(req.body)||!positiveId(req.body.member_id)||!types.includes(req.body.transaction_type)
        ||!finiteNumber(req.body.points)||Number(req.body.points)===0
        ||(req.body.amount!==""&&req.body.amount!=null&&(!finiteNumber(req.body.amount)||Number(req.body.amount)<0))){
        return bad(res,"Provjerite člana, vrstu, bodove i iznos transakcije.");
    }
    try{const x=await model.addTransaction({...req.body,reference:text(req.body.reference,120),description:text(req.body.description,2000),receipt_number:text(req.body.receipt_number,120),merchant_name:text(req.body.merchant_name,200)},req.user);if(!x)return res.status(404).json({error:"Član nije pronađen."});res.status(201).json(x);}catch(e){fail(res,e,"Transakciju nije moguće spremiti.");}
};
export const createReward=async(req,res)=>{
    if(!isPlainObject(req.body)||!positiveId(req.body.program_id)||!text(req.body.name,200)
        ||!finiteNumber(req.body.points_cost)||Number(req.body.points_cost)<=0
        ||!validDate(req.body.valid_from)||!validDate(req.body.valid_until)){
        return bad(res,"Provjerite program, naziv, bodove i datume nagrade.");
    }
    try{const x=await model.createReward({...req.body,name:text(req.body.name,200),description:text(req.body.description,2000)},req.user);if(!x)return res.status(404).json({error:"Program nije pronađen."});res.status(201).json(x);}catch(e){fail(res,e,"Nagradu nije moguće dodati.");}
};
export const createCampaign=async(req,res)=>{
    const channels=["in_app","email","both"],statuses=["draft","scheduled","active","completed","cancelled"];
    if(!isPlainObject(req.body)||!positiveId(req.body.program_id)||!text(req.body.title,200)
        ||!text(req.body.message,5000)||!channels.includes(req.body.channel)
        ||!statuses.includes(req.body.status)||!validDate(req.body.starts_at)||!validDate(req.body.ends_at)){
        return bad(res,"Provjerite podatke, kanal, status i datume promocije.");
    }
    try{const x=await model.createCampaign({...req.body,title:text(req.body.title,200),message:text(req.body.message,5000),audience_tier:text(req.body.audience_tier,40)},req.user);if(!x)return res.status(404).json({error:"Program nije pronađen."});res.status(201).json(x);}catch(e){fail(res,e,"Kampanju nije moguće dodati.");}
};
export const createTier=async(req,res)=>{
    if(!isPlainObject(req.body)||!positiveId(req.body.program_id)||!text(req.body.name,60)
        ||!finiteNumber(req.body.min_lifetime_points)||Number(req.body.min_lifetime_points)<0){
        return bad(res,"Provjerite program, naziv i prag razine.");
    }
    try{const x=await model.createTier({...req.body,name:text(req.body.name,60),benefits:text(req.body.benefits,2000)},req.user);if(!x)return res.status(404).json({error:"Program nije pronađen."});res.status(201).json(x);}catch(e){fail(res,e,"Razinu članstva nije moguće spremiti.");}
};
