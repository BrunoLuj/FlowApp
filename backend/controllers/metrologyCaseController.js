import {readWorkflow,mutateWorkflow,addEvent} from '../models/metrologyWorkflowStore.js';
import {requireMeasurements,workflowError} from '../libs/metrologyWorkflowRules.js';
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import * as model from "../models/metrologyCaseModel.js";
import {buildMetrologyCasePdf} from '../libs/metrologyCasePdf.js';
const buildExactMetrologyForm=(record,type)=>buildMetrologyCasePdf(record,type,1+Math.max(0,...(record.documents||[]).filter(item=>item.document_type===type).map(item=>Number(item.version_no)||0)));
const buildExactMetrologyReport=record=>buildExactMetrologyForm(record,'inspection_report');
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
    if(error.status)return res.status(error.status).json({error:error.message});
    const known = knownErrors[error.code];
    if (known) return res.status(known[0]).json({ error: known[1] });
    console.error(fallback, error);
    return res.status(500).json({ error: fallback });
};

export const listCases = async (req,res) => {
    try { const rows=await model.listCases(req.user.clientId);res.json(await Promise.all(rows.map(async record=>({...record,closed_at:(await readWorkflow(record.id)).closed_at||null})))); }
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
        const previous=await model.getCase(req.params.id,req.user.clientId);
        if(!previous)return res.status(404).json({error:'Predmet nije pronađen.'});
        const workflow=await readWorkflow(req.params.id);
        if(workflow.closed_at)throw workflowError('Predmet je zaključen.');
        if(!['request','work_order','measurement','completed'].includes(req.body.status||previous.status))throw workflowError('Promjena statusa nije dopuštena.');
        if(req.body.status==='completed'){
            if(!workflow.request.returned_at||!workflow.field_package)throw workflowError('Prvo evidentirajte vraćeni zahtjev i izradite terenski paket.');
            requireMeasurements({...previous,...req.body,service_type:previous.service_type});
        }
        const record=await model.saveCase(req.params.id,req.body,req.user);
        if(!record) return res.status(404).json({error:"Predmet nije pronađen."});
        await mutateWorkflow(req.params.id,req.user,async workflow=>addEvent(workflow,req.user,record.status==='completed'?'submitted_for_review':'case_saved'));
        res.json(record);
    } catch(error) { fail(res,error,"Predmet nije moguće spremiti."); }
};
export const completeCase = async (req,res) => {
    try {
        const current=await model.getCase(req.params.id,req.user.clientId);
        if(!current)return res.status(404).json({error:'Predmet nije pronađen.'});
        const workflow=await readWorkflow(req.params.id);
        if(workflow.request.email?.status==='sending')throw workflowError('Pričekajte dovršetak slanja e-maila.');
        if(workflow.closed_at||!workflow.request.returned_at||!workflow.field_package)throw workflowError('Provjerite vraćeni zahtjev i terenski paket.');
        requireMeasurements(current);
        const record=await model.completeCase(req.params.id,req.user);
        if(!record) return res.status(404).json({error:"Predmet nije pronađen."});
        await mutateWorkflow(req.params.id,req.user,async workflow=>addEvent(workflow,req.user,'case_approved'));
        res.json(record);
    } catch(error) { fail(res,error,"Predmet nije moguće završiti."); }
};
export const generateDocument = async (req,res) => {
    const storageKeys=[];
    try {
        const record=await model.getCase(req.params.id,req.user.clientId);
        if(!record) return res.status(404).json({error:"Predmet nije pronađen."});
        if((await readWorkflow(req.params.id)).closed_at)throw workflowError('Predmet je zaključen. Preuzmite arhivirane dokumente.');
        const type=req.params.type;
        if(!['inspection_request','inspection_work_order','inspection_report','inspection_certificate','verification_certificate'].includes(type))return res.status(400).json({error:'Nepoznata vrsta dokumenta.'});
        if(type==='verification_certificate'&&(record.result!=='passed'||!['amn','volumeter'].includes(record.service_type)))throw workflowError('Certifikat verifikacije izdaje se za sukladne AMN sonde i volumetre.');
        if(["inspection_report","inspection_certificate","verification_certificate"].includes(type) && record.status!=="approved"){
            return res.status(409).json({error:"Izvještaji i certifikati generiraju se nakon odobravanja predmeta."});
        }
        if(['inspection_certificate','verification_certificate'].includes(type)){
            const attachments=[];
            for(const item of record.items){
                const buffer=await buildExactMetrologyForm({...record,items:[item]},type);
                const storageKey=`${Date.now()}-${crypto.randomUUID()}.pdf`;storageKeys.push(storageKey);
                await fs.writeFile(path.join(uploadsRoot,storageKey),buffer,{flag:'wx'});
                const fileName=`${record.case_number}-${type}-${attachments.length+1}.pdf`;
                attachments.push(await model.registerDocument(record.id,type,{fileName,storageKey,fileSize:buffer.length},req.user));
            }
            return res.status(201).json({multiple:true,attachments});
        }
        const existing=record.documents.filter((item)=>item.document_type===type);
        const version=Math.max(0,...existing.map((item)=>Number(item.version_no)))+1;
        if(type==="inspection_report" && record.service_type==="tank"){
            const attachments=[];
            for(const item of record.items){
                const tankRecord={...record,items:[item]};
                const buffer=await buildExactMetrologyReport(tankRecord);
                const storageKey=`${Date.now()}-${crypto.randomUUID()}.pdf`;
                storageKeys.push(storageKey);
                const tankLabel=(item.serial_number||item.name||item.id).replaceAll(/[^a-zA-Z0-9_-]/g,"-");
                const fileName=`${record.case_number}-inspection-report-rezervoar-${tankLabel}.pdf`;
                await fs.writeFile(path.join(uploadsRoot,storageKey),buffer,{flag:"wx"});
                const attachment=await model.registerDocument(
                    req.params.id,type,{fileName,storageKey,fileSize:buffer.length},req.user
                );
                if(!attachment) throw Object.assign(new Error("Case not found"),{code:"CASE_NOT_FOUND"});
                attachments.push(attachment);
            }
            return res.status(201).json({multiple:true,attachments});
        }
        const buffer=type==="inspection_report"
            ? await buildExactMetrologyReport(record)
            : await buildExactMetrologyForm(record,type);
        const storageKey=`${Date.now()}-${crypto.randomUUID()}.pdf`;
        storageKeys.push(storageKey);
        const fileName=`${record.case_number}-${type}-v${version}.pdf`;
        await fs.writeFile(path.join(uploadsRoot,storageKey),buffer,{flag:"wx"});
        const attachment=await model.registerDocument(
            req.params.id,type,{fileName,storageKey,fileSize:buffer.length},req.user
        );
        if(!attachment) return res.status(404).json({error:"Predmet nije pronađen."});
        res.status(201).json(attachment);
    } catch(error) {
        await Promise.all(storageKeys.map((storageKey)=>removeUploadedFile(storageKey)));
        fail(res,error,"Dokument nije moguće generirati.");
    }
};
