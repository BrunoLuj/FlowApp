import * as model from "../models/loyaltyModel.js";
const fail=(res,error,message)=>{
    if(error.code==="INSUFFICIENT_POINTS")return res.status(409).json({error:"Član nema dovoljno bodova."});
    if(error.code==="23505")return res.status(409).json({error:"Broj člana ili program već postoji."});
    console.error(message,error);return res.status(500).json({error:message});
};
export const overview=async(req,res)=>{try{res.json(await model.getOverview(req.user,req.query.client_id));}catch(e){fail(res,e,"Loyalty centar nije moguće učitati.");}};
export const saveProgram=async(req,res)=>{try{const x=await model.saveProgram(req.body,req.user);if(!x)return res.status(400).json({error:"Klijent je obavezan."});res.status(201).json(x);}catch(e){fail(res,e,"Program nije moguće spremiti.");}};
export const createMember=async(req,res)=>{try{const x=await model.createMember(req.body,req.user);if(!x)return res.status(404).json({error:"Program nije pronađen."});res.status(201).json(x);}catch(e){fail(res,e,"Člana nije moguće dodati.");}};
export const addTransaction=async(req,res)=>{try{const x=await model.addTransaction(req.body,req.user);if(!x)return res.status(404).json({error:"Član nije pronađen."});res.status(201).json(x);}catch(e){fail(res,e,"Transakciju nije moguće spremiti.");}};
export const createReward=async(req,res)=>{try{const x=await model.createReward(req.body,req.user);if(!x)return res.status(404).json({error:"Program nije pronađen."});res.status(201).json(x);}catch(e){fail(res,e,"Nagradu nije moguće dodati.");}};
export const createCampaign=async(req,res)=>{try{const x=await model.createCampaign(req.body,req.user);if(!x)return res.status(404).json({error:"Program nije pronađen."});res.status(201).json(x);}catch(e){fail(res,e,"Kampanju nije moguće dodati.");}};
