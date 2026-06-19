import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import * as model from "../models/metrologyCaseModel.js";
import { buildMetrologyCasePdf } from "../libs/metrologyCasePdf.js";
import { removeUploadedFile, uploadsRoot } from "../middleware/uploadMiddleware.js";

const knownErrors = {
    INVALID_SERVICE_TYPE: [400, "Nepoznata vrsta mjeriteljske usluge."],
    INVALID_STATION: [400, "Odabrana stanica ne pripada klijentu."],
    AMN_TANK_REQUIRED: [400, "Svaka AMN sonda mora biti vezana uz konkretan rezervoar."],
    DISPENSER_REQUIRED: [400, "Svaki volumetar mora biti vezan uz serijski broj aparata."],
    DISPENSER_SEAL_CONFLICT: [409, "Jedan aparat može imati samo jednu markicu i plombu po inspekciji."],
    CASE_LOCKED: [409, "Odobreni predmet nije moguće mijenjati."],
    CASE_ITEMS_REQUIRED: [409, "Predmet mora sadržavati najmanje jedno mjerilo."],
    CASE_MEASUREMENTS_REQUIRED: [409, "Svako mjerilo mora sadržavati najmanje jedno mjerenje."],
    AMN_THREE_MEASUREMENTS_REQUIRED: [409, "Svaka AMN sonda mora imati točno tri mjerenja."],
};
const fail = (res, error, fallback) => {
    const known = knownErrors[error.code];
    if (known) return res.status(known[0]).json({ error: known[1] });
    console.error(fallback, error);
    return res.status(500).json({ error: fallback });
};

export const listCases = async (req,res) => {
    try { res.json(await model.listCases(req.user.clientId)); }
    catch(error) { fail(res,error,"Predmete inspekcije nije moguće učitati."); }
};
export const getOptions = async (req,res) => {
    try { res.json(await model.getOptions(req.user.clientId)); }
    catch(error) { fail(res,error,"Opcije mjeriteljstva nije moguće učitati."); }
};
export const getCase = async (req,res) => {
    try {
        const record=await model.getCase(req.params.id,req.user.clientId);
        if(!record) return res.status(404).json({error:"Predmet nije pronađen."});
        res.json(record);
    } catch(error) { fail(res,error,"Predmet nije moguće učitati."); }
};
export const createCase = async (req,res) => {
    try {
        const record=await model.createCase(req.body,req.user);
        if(!record) return res.status(400).json({error:"Klijent je obavezan."});
        res.status(201).json(record);
    } catch(error) { fail(res,error,"Predmet nije moguće kreirati."); }
};
export const saveCase = async (req,res) => {
    try {
        const record=await model.saveCase(req.params.id,req.body,req.user);
        if(!record) return res.status(404).json({error:"Predmet nije pronađen."});
        res.json(record);
    } catch(error) { fail(res,error,"Predmet nije moguće spremiti."); }
};
export const completeCase = async (req,res) => {
    try {
        const record=await model.completeCase(req.params.id,req.user);
        if(!record) return res.status(404).json({error:"Predmet nije pronađen."});
        res.json(record);
    } catch(error) { fail(res,error,"Predmet nije moguće završiti."); }
};
export const generateDocument = async (req,res) => {
    let storageKey;
    try {
        const record=await model.getCase(req.params.id,req.user.clientId);
        if(!record) return res.status(404).json({error:"Predmet nije pronađen."});
        const type=req.params.type;
        if(["inspection_report","inspection_certificate","verification_certificate"].includes(type) && record.status!=="approved"){
            return res.status(409).json({error:"Izvještaji i certifikati generiraju se nakon odobravanja predmeta."});
        }
        const existing=record.documents.filter((item)=>item.document_type===type);
        const version=Math.max(0,...existing.map((item)=>Number(item.version_no)))+1;
        const buffer=await buildMetrologyCasePdf(record,type,version);
        storageKey=`${Date.now()}-${crypto.randomUUID()}.pdf`;
        const fileName=`${record.case_number}-${type}-v${version}.pdf`;
        await fs.writeFile(path.join(uploadsRoot,storageKey),buffer,{flag:"wx"});
        const attachment=await model.registerDocument(req.params.id,type,{fileName,storageKey,fileSize:buffer.length},req.user);
        if(!attachment){
            await removeUploadedFile(storageKey);
            return res.status(404).json({error:"Predmet nije pronađen."});
        }
        res.status(201).json(attachment);
    } catch(error) {
        if(storageKey) await removeUploadedFile(storageKey);
        fail(res,error,"Dokument nije moguće generirati.");
    }
};
