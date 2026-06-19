import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import * as metrologyModel from "../models/metrologyModel.js";
import { buildMetrologyCertificatePdf } from "../libs/metrologyCertificatePdf.js";
import { removeUploadedFile, uploadsRoot } from "../middleware/uploadMiddleware.js";

const handleError = (res, error, fallback) => {
    const errors = {
        INVALID_MEASUREMENT: [400, "Provjerite unesene mjerne vrijednosti."],
        INSPECTION_LOCKED: [409, "Zaključani pregled nije moguće mijenjati."],
        MEASUREMENTS_REQUIRED: [409, "Za završetak je potrebno najmanje jedno mjerenje."],
        INSPECTION_NOT_COMPLETED: [409, "Certifikat je moguće generirati tek nakon završetka pregleda."],
        INVALID_WORK_ORDER: [400, "Radni nalog ne pripada odabranoj opremi."],
        ACTIVE_INSPECTION: [409, "Za ovaj radni nalog već postoji mjeriteljski pregled."],
    };
    const known = errors[error.code];
    if (known) return res.status(known[0]).json({ error: known[1] });
    console.error(fallback, error);
    return res.status(500).json({ error: fallback });
};

export const getOverview = async (req, res) => {
    try {
        res.json(await metrologyModel.getOverview(req.user.clientId));
    } catch (error) {
        handleError(res,error,"Mjeriteljski centar nije moguće učitati.");
    }
};

export const getAssets = async (req, res) => {
    try {
        res.json(await metrologyModel.getAssets(req.user.clientId));
    } catch (error) {
        handleError(res,error,"Opremu nije moguće učitati.");
    }
};

export const configureAsset = async (req,res) => {
    try{
        const asset=await metrologyModel.configureAsset(req.params.id,req.body,req.user.clientId);
        if(!asset) return res.status(404).json({error:"Oprema nije pronađena."});
        res.json(asset);
    }catch(error){
        handleError(res,error,"Postavke opreme nije moguće spremiti.");
    }
};

export const addInspection = async (req, res) => {
    if (!req.body.asset_id) return res.status(400).json({ error: "Oprema je obavezna." });
    try {
        const inspection = await metrologyModel.createInspection(req.body,req.user);
        if (!inspection) return res.status(404).json({ error: "Oprema nije pronađena." });
        res.status(201).json(inspection);
    } catch (error) {
        handleError(res,error,"Pregled nije moguće kreirati.");
    }
};

export const getInspection = async (req, res) => {
    try {
        const inspection = await metrologyModel.getInspection(req.params.id,req.user.clientId);
        if (!inspection) return res.status(404).json({ error: "Pregled nije pronađen." });
        res.json(inspection);
    } catch (error) {
        handleError(res,error,"Pregled nije moguće učitati.");
    }
};

export const saveInspection = async (req, res) => {
    try {
        const inspection = await metrologyModel.saveInspection(req.params.id,req.body,req.user);
        if (!inspection) return res.status(404).json({ error: "Pregled nije pronađen." });
        res.json(inspection);
    } catch (error) {
        handleError(res,error,"Pregled nije moguće spremiti.");
    }
};

export const completeInspection = async (req, res) => {
    try {
        const inspection = await metrologyModel.completeInspection(req.params.id,req.body,req.user);
        if (!inspection) return res.status(404).json({ error: "Pregled nije pronađen." });
        res.json(inspection);
    } catch (error) {
        handleError(res,error,"Pregled nije moguće završiti.");
    }
};

export const generateCertificate = async (req, res) => {
    let storageKey;
    try {
        const inspection = await metrologyModel.getInspection(req.params.id,req.user.clientId);
        if (!inspection) return res.status(404).json({ error: "Pregled nije pronađen." });
        if (!["completed","approved"].includes(inspection.status)) {
            return res.status(409).json({ error: "Pregled prvo mora biti završen." });
        }
        const version = await metrologyModel.getNextCertificateVersion(req.params.id);
        const buffer = await buildMetrologyCertificatePdf(inspection,version);
        storageKey=`${Date.now()}-${crypto.randomUUID()}.pdf`;
        const safe=inspection.inspection_number.replace(/[^a-zA-Z0-9_-]/g,"-");
        const fileName=`mjeriteljski-certifikat-${safe}-v${version}.pdf`;
        await fs.writeFile(path.join(uploadsRoot,storageKey),buffer,{flag:"wx"});
        const attachment=await metrologyModel.registerCertificate(req.params.id,{
            fileName,storageKey,fileSize:buffer.length,
        },req.user);
        if(!attachment){
            await removeUploadedFile(storageKey);
            return res.status(404).json({error:"Pregled nije pronađen."});
        }
        res.status(201).json(attachment);
    } catch(error){
        if(storageKey) await removeUploadedFile(storageKey);
        handleError(res,error,"Certifikat nije moguće generirati.");
    }
};
