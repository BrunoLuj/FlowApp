import * as fleetModel from "../models/fleetModel.js";
import {removeUploadedFile} from "../middleware/uploadMiddleware.js";

const fail = (res,error,message) => {
    if (error.code === "23505") return res.status(409).json({error:"Registracijska oznaka već postoji."});
    console.error(message,error);
    return res.status(500).json({error:message});
};

export const getOverview = async (_req,res) => {
    try { res.json(await fleetModel.getOverview()); }
    catch (error) { fail(res,error,"Vozni park nije moguće učitati."); }
};
export const getOptions = async (_req,res) => {
    try { res.json(await fleetModel.getOptions()); }
    catch (error) { fail(res,error,"Opcije voznog parka nije moguće učitati."); }
};
export const getVehicle = async (req,res) => {
    try {
        const vehicle=await fleetModel.getVehicle(req.params.id);
        if (!vehicle) return res.status(404).json({error:"Vozilo nije pronađeno."});
        res.json(vehicle);
    } catch (error) { fail(res,error,"Vozilo nije moguće učitati."); }
};
export const createVehicle = async (req,res) => {
    if (!req.body.registration_number?.trim() || !req.body.make?.trim() || !req.body.model?.trim()) {
        return res.status(400).json({error:"Registracija, marka i model su obavezni."});
    }
    try { res.status(201).json(await fleetModel.createVehicle(req.body,req.user.userId)); }
    catch (error) { fail(res,error,"Vozilo nije moguće dodati."); }
};
export const updateVehicle = async (req,res) => {
    try {
        const vehicle=await fleetModel.updateVehicle(req.params.id,req.body);
        if (!vehicle) return res.status(404).json({error:"Vozilo nije pronađeno."});
        res.json(vehicle);
    } catch (error) { fail(res,error,"Vozilo nije moguće spremiti."); }
};
export const createRecord = async (req,res) => {
    if (!req.body.record_type || !req.body.title?.trim() || !req.body.notes?.trim()) {
        return res.status(400).json({error:"Vrsta, naziv i opis izvedenih radova su obavezni."});
    }
    try {
        const record=await fleetModel.createRecord(req.params.vehicleId,req.body,req.user.userId,req.file);
        if (!record) {
            if(req.file)await removeUploadedFile(req.file.filename);
            return res.status(404).json({error:"Vozilo nije pronađeno."});
        }
        res.status(201).json(record);
    } catch (error) {
        if(req.file)await removeUploadedFile(req.file.filename);
        fail(res,error,"Evidenciju nije moguće dodati.");
    }
};
export const updateRecord = async (req,res) => {
    try {
        const record=await fleetModel.updateRecord(req.params.id,req.body);
        if (!record) return res.status(404).json({error:"Evidencija nije pronađena."});
        res.json(record);
    } catch (error) { fail(res,error,"Evidenciju nije moguće spremiti."); }
};
export const deleteRecord = async (req,res) => {
    try {
        const record=await fleetModel.deleteRecord(req.params.id);
        if (!record) return res.status(404).json({error:"Evidencija nije pronađena."});
        res.json({message:"Evidencija je obrisana."});
    } catch (error) { fail(res,error,"Evidenciju nije moguće obrisati."); }
};
