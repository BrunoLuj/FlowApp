import * as model from "../models/desktopWorkflowModel.js";

const fail=(res,error)=>{
  if(["STATION_NOT_FOUND","PROJECT_CONFLICT"].includes(error.code))return res.status(error.code==="PROJECT_CONFLICT"?409:404).json({message:error.message});
  console.error("Desktop workflow error:",error);
  return res.status(500).json({message:"Spremanje desktop projekta nije uspjelo."});
};
export const saveWorkflow=async(req,res)=>{
  const required=["station_id","certificate","folder","module","customer","location"];
  if(required.some(key=>req.body[key]===undefined||req.body[key]===null||String(req.body[key]).trim()===""))return res.status(400).json({message:"Nedostaju obavezni podaci projekta."});
  try{return res.status(201).json(await model.saveWorkflow(req.body,req.user));}catch(error){return fail(res,error);}
};
export const updateStage=async(req,res)=>{
  if(!req.body.stage)return res.status(400).json({message:"Status projekta je obavezan."});
  try{return await model.updateStage(req.params.id,req.body.stage,req.user)?res.json({id:Number(req.params.id),workflow_stage:req.body.stage}):res.status(404).json({message:"Projekt nije pronađen."});}catch(error){return fail(res,error);}
};
export const validateIdentity=async(req,res)=>{
  try{const result=await model.validateIdentity(req.body.certificate,req.body.folder,req.body.station_id,req.user);return result.valid?res.json(result):res.status(409).json({message:result.message});}catch(error){return fail(res,error);}
};
