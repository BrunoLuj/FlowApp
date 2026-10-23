import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pool } from '../libs/database.js';
import { getCase, registerDocument } from '../models/metrologyCaseModel.js';
import { readWorkflow, mutateWorkflow, addEvent } from '../models/metrologyWorkflowStore.js';
import { workflowError, fingerprint, requirePreparation, requireClose } from '../libs/metrologyWorkflowRules.js';
import {buildMetrologyCasePdf} from '../libs/metrologyCasePdf.js';
const buildExactMetrologyForm=(record,type)=>buildMetrologyCasePdf(record,type,1+Math.max(0,...(record.documents||[]).filter(item=>item.document_type===type).map(item=>Number(item.version_no)||0)));
const buildExactMetrologyReport=record=>buildExactMetrologyForm(record,'inspection_report');
import { fieldDocuments, finalDocuments, mergePdfs } from '../libs/metrologyWorkflowPdf.js';
import { isEmailConfigured, sendEmail } from '../libs/mailer.js';
import { uploadsRoot, resolveUploadedFile, removeUploadedFile } from '../middleware/uploadMiddleware.js';
const fail=(res,error)=>{if(!error.status)console.error('Metrology workflow',error);return res.status(error.status||500).json({error:error.status?error.message:'Postupak nije moguće izvršiti.'});};
const recordFor=async req=>{const record=await getCase(req.params.id,req.user.clientId);if(!record)throw Object.assign(new Error('Predmet nije pronađen.'),{status:404});return record;};
const text=(value,max=10000)=>String(value||'').trim().slice(0,max);
async function putAttachment(connection,record,user,file) {
    const attachment=(await connection.query(`INSERT INTO entity_attachments (client_id,station_id,metrology_case_id,title,file_name,storage_key,mime_type,file_size,visible_to_client,uploaded_by,created_at,system_generated) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,$9,NOW(),TRUE) RETURNING *`,[record.client_id,record.station_id,record.id,file.label,file.file_name,file.storage_key,file.mime_type||'application/pdf',file.size,user.userId])).rows[0];
    return {id:attachment.id,kind:file.kind,label:file.label,file_name:file.file_name,at:new Date().toISOString()};
}
export const getWorkflow=async(req,res)=>{try{await recordFor(req);res.json({...await readWorkflow(req.params.id),email_configured:isEmailConfigured()});}catch(error){fail(res,error);}};
export const savePreparation=async(req,res)=>{
    try{await recordFor(req);const state=await mutateWorkflow(req.params.id,req.user,async(workflow,record)=>{
        if(['approved','cancelled'].includes(record.status))throw workflowError('Odobreni ili otkazani predmet nije moguće mijenjati.');
        workflow.preparation={risk:text(req.body.risk),review:text(req.body.review)};addEvent(workflow,req.user,'preparation_saved');
    });res.json(state);}catch(error){fail(res,error);}
};
export const returnRequest=async(req,res)=>{
    try{
        if(!req.file)throw Object.assign(new Error('Priložite vraćeni zahtjev.'),{status:400});
        const record=await recordFor(req);
        const state=await mutateWorkflow(record.id,req.user,async(workflow,current,connection)=>{
            if(['approved','cancelled'].includes(current.status))throw workflowError('Predmet više ne prihvaća izmjene zahtjeva.');
            const file=await putAttachment(connection,record,req.user,{kind:'returned_request',label:'Vraćeni zahtjev klijenta',file_name:req.file.originalname,storage_key:req.file.filename,mime_type:req.file.mimetype,size:req.file.size});
            workflow.files.push(file);workflow.request={...workflow.request,returned_at:new Date().toISOString(),returned_attachment_id:file.id,return_note:text(req.body.note)};
            addEvent(workflow,req.user,'request_returned',text(req.body.note));
        });res.status(201).json(state);
    }catch(error){if(req.file)await removeUploadedFile(req.file.filename);fail(res,error);}
};
export const emailRequest=async(req,res)=>{
    let token;let reserved=false;
    try{
        const record=await recordFor(req);const recipient=text(req.body.recipient,254);const subject=text(req.body.subject,300);const body=text(req.body.body);
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)||!subject||!body)throw Object.assign(new Error('Unesite ispravan e-mail, naslov i tekst poruke.'),{status:400});
        if(!isEmailConfigured())throw workflowError('SMTP nije konfiguriran. Poruka nije poslana; provjerite postavke e-maila.');
        token=crypto.randomUUID();
        await mutateWorkflow(record.id,req.user,async(workflow,current)=>{
            if(['approved','cancelled'].includes(current.status))throw workflowError('Zahtjev se šalje prije odobravanja predmeta.');
            if(workflow.request.email?.status==='sending')throw workflowError('Slanje je u tijeku ili ishod prethodnog slanja treba provjeriti.');
            if(workflow.request.email?.status==='sent'&&!req.body.resend)throw workflowError('Zahtjev je već poslan. Za ponovno slanje odaberite Ponovno pošalji.');
            workflow.request.email={token,status:'sending',recipient,subject,body,at:new Date().toISOString()};addEvent(workflow,req.user,'email_sending',recipient);
        });reserved=true;
        const buffer=await buildExactMetrologyForm(record,'inspection_request');const storageKey=`${Date.now()}-${crypto.randomUUID()}.pdf`;
        await fs.writeFile(path.join(uploadsRoot,storageKey),buffer,{flag:'wx'});
        let attachment;
        try{attachment=await registerDocument(record.id,'inspection_request',{fileName:`${record.case_number}-zahtjev.pdf`,storageKey,fileSize:buffer.length},req.user);}catch(error){await removeUploadedFile(storageKey);throw error;}
        const info=await sendEmail({recipient_email:recipient,subject,text_body:body,attachments:[{filename:attachment.file_name,content:buffer,contentType:'application/pdf'}]});
        const state=await mutateWorkflow(record.id,req.user,async workflow=>{
            workflow.request.email={...workflow.request.email,status:'sent',sent_at:new Date().toISOString(),message_id:info.messageId||null,attachment_id:attachment.id};addEvent(workflow,req.user,'email_sent',recipient);
        });res.json(state);
    }catch(error){
        if(reserved)await mutateWorkflow(req.params.id,req.user,async workflow=>{if(workflow.request.email?.token===token){workflow.request.email.status='failed';workflow.request.email.error='Slanje nije potvrđeno. Provjerite poštanski sustav prije ponovnog slanja.';addEvent(workflow,req.user,'email_failed');}}).catch(()=>{});
        fail(res,error);
    }
};
export const generatePackage=async(req,res)=>{
    const storage=[];
    try{
        const record=await recordFor(req);const workflow=await readWorkflow(record.id);const final=req.params.kind==='final';
        if(!['field','final'].includes(req.params.kind))throw Object.assign(new Error('Nepoznata vrsta paketa.'),{status:400});
        if(workflow.closed_at)throw workflowError('Predmet je zaključen. Preuzmite arhivirani paket.');
        if(final&&record.status!=='approved')throw workflowError('Završni paket zahtijeva odobrene rezultate.');
        if(!final){if(['approved','cancelled'].includes(record.status))throw workflowError('Terenski paket priprema se prije odobravanja.');requirePreparation(record,workflow);}
        const files=final?await finalDocuments(record):await fieldDocuments(record,workflow.preparation);
        files.push({kind:final?'final_package':'field_package',label:final?'Završni paket':'Terenski paket',buffer:await mergePdfs(files.map(file=>file.buffer))});
        for(const file of files){file.storage_key=`${Date.now()}-${crypto.randomUUID()}.pdf`;storage.push(file.storage_key);file.file_name=`${record.case_number}-${file.kind}-${storage.length}.pdf`;file.size=file.buffer.length;await fs.writeFile(path.join(uploadsRoot,file.storage_key),file.buffer,{flag:'wx'});}
        const state=await mutateWorkflow(record.id,req.user,async(current,currentRecord,connection)=>{
            if(String(currentRecord.updated_at)!==String(record.updated_at))throw workflowError('Podaci su promijenjeni tijekom izrade. Ponovite generiranje paketa.');
            if(!final&&JSON.stringify(current.preparation)!==JSON.stringify(workflow.preparation))throw workflowError('Priprema je promijenjena. Ponovite generiranje.');
            const archived=[];for(const file of files)archived.push(await putAttachment(connection,record,req.user,file));
            current.files.push(...archived);current[final?'final_package':'field_package']={at:new Date().toISOString(),source_hash:fingerprint(record),attachment_id:archived.at(-1).id,file_ids:archived.map(file=>file.id)};
            if(!final)await connection.query("UPDATE metrology_cases SET status='work_order',updated_at=NOW() WHERE id=$1",[record.id]);
            addEvent(current,req.user,final?'final_package_generated':'field_package_generated');
        });res.status(201).json(state);
    }catch(error){await Promise.all(storage.map(removeUploadedFile));fail(res,error);}
};
export const closeCase=async(req,res)=>{try{const record=await recordFor(req);const state=await mutateWorkflow(record.id,req.user,async(workflow,current)=>{if(workflow.request.email?.status==='sending')throw workflowError('Pričekajte dovršetak slanja e-maila.');if(String(current.updated_at)!==String(record.updated_at))throw workflowError('Predmet je promijenjen. Ponovno ga otvorite.');requireClose(record,workflow);workflow.closed_at=new Date().toISOString();workflow.closed_by=req.user.userId;addEvent(workflow,req.user,'case_closed',text(req.body.note));});res.json(state);}catch(error){fail(res,error);}};
export const downloadWorkflowFile=async(req,res)=>{
    try{await recordFor(req);const file=(await pool.query('SELECT * FROM entity_attachments WHERE id=$1 AND metrology_case_id=$2',[req.params.fileId,req.params.id])).rows[0];if(!file||req.user.clientId&&!file.visible_to_client)throw Object.assign(new Error('Dokument nije pronađen.'),{status:404});res.download(resolveUploadedFile(file.storage_key),file.file_name);}catch(error){fail(res,error);}
};
