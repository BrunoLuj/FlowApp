import * as maintenanceModel from "../models/maintenanceModel.js";

const validatePlan = (data, requireAsset = true) => {
    const triggerType = data.trigger_type || "calendar";
    if (!["calendar", "meter", "hybrid"].includes(triggerType)) return false;
    const needsCalendar = triggerType !== "meter";
    const needsMeter = triggerType !== "calendar";
    return Boolean(
        (!requireAsset || data.asset_id) && data.name?.trim()
        && (!needsCalendar || (Number(data.interval_value) > 0 && data.interval_unit && data.next_due_date))
        && (!needsMeter || (
            Number(data.meter_interval) > 0
            && data.next_due_meter !== ""
            && data.next_due_meter !== null
            && data.next_due_meter !== undefined
            && Number(data.next_due_meter) >= 0
        ))
    );
};

export const getPlans = async (req, res) => {
    try {
        res.json(await maintenanceModel.getPlans(req.user.clientId));
    } catch (error) {
        console.error("Error fetching maintenance plans:", error);
        res.status(500).json({ error: "Error fetching maintenance plans" });
    }
};

export const getOverview = async (req, res) => {
    try {
        res.json(await maintenanceModel.getMaintenanceOverview(req.user.clientId));
    } catch (error) {
        console.error("Error fetching maintenance overview:", error);
        res.status(500).json({ error: "Error fetching maintenance overview" });
    }
};

export const getAssets = async (req, res) => {
    try {
        res.json(await maintenanceModel.getMaintenanceAssets(req.user.clientId));
    } catch (error) {
        console.error("Error fetching maintenance assets:", error);
        res.status(500).json({ error: "Error fetching maintenance assets" });
    }
};

export const addPlan = async (req, res) => {
    if (!validatePlan(req.body)) {
        return res.status(400).json({ error: "Provjerite opremu, naziv i intervale plana." });
    }
    try {
        const plan = await maintenanceModel.createPlan(req.body, req.user);
        if (!plan) return res.status(404).json({ error: "Asset not found" });
        res.status(201).json(plan);
    } catch (error) {
        console.error("Error creating maintenance plan:", error);
        res.status(500).json({ error: "Error creating maintenance plan" });
    }
};

export const recordMeter = async (req, res) => {
    try {
        const reading = await maintenanceModel.recordAssetMeter(req.params.assetId, req.body, req.user);
        if (!reading) return res.status(404).json({ error: "Asset not found" });
        res.status(201).json(reading);
    } catch (error) {
        if (error.code === "INVALID_READING") {
            return res.status(400).json({ error: "Očitanje mora biti pozitivan broj." });
        }
        if (error.code === "METER_DECREASE") {
            return res.status(409).json({ error: "Novo očitanje ne može biti manje od prethodnog." });
        }
        console.error("Error recording asset meter:", error);
        res.status(500).json({ error: "Error recording asset meter" });
    }
};

export const editPlan = async (req, res) => {
    if (!validatePlan(req.body, false)) {
        return res.status(400).json({ error: "Provjerite naziv i intervale plana." });
    }
    try {
        const plan = await maintenanceModel.updatePlan(req.params.id, req.body, req.user.clientId);
        if (!plan) return res.status(404).json({ error: "Maintenance plan not found" });
        res.json(plan);
    } catch (error) {
        console.error("Error updating maintenance plan:", error);
        res.status(500).json({ error: "Error updating maintenance plan" });
    }
};

export const generatePlan = async (req, res) => {
    try {
        const generated = await maintenanceModel.generatePlan(req.params.id, req.user);
        if (!generated) return res.status(404).json({ error: "Maintenance plan not found" });
        res.status(generated.skipped ? 200 : 201).json(generated);
    } catch (error) {
        console.error("Error generating preventive work order:", error);
        res.status(500).json({ error: "Error generating preventive work order" });
    }
};

export const generateDue = async (req, res) => {
    try {
        const results = await maintenanceModel.generateDuePlans(req.user);
        res.json({
            generated: results.filter((item) => item && !item.skipped).length,
            skipped: results.filter((item) => item?.skipped).length,
            results,
        });
    } catch (error) {
        console.error("Error generating due work orders:", error);
        res.status(500).json({ error: "Error generating due work orders" });
    }
};

export const ensureAssetToken = async (req, res) => {
    try {
        const asset = await maintenanceModel.ensureAssetToken(req.params.assetId, req.user.clientId);
        if (!asset) return res.status(404).json({ error: "Asset not found" });
        res.json(asset);
    } catch (error) {
        console.error("Error creating asset token:", error);
        res.status(500).json({ error: "Error creating asset token" });
    }
};

export const getPublicAsset = async (req, res) => {
    try {
        const asset = await maintenanceModel.getPublicAsset(req.params.token);
        if (!asset) return res.status(404).json({ error: "Asset not found" });
        res.json(asset);
    } catch (error) {
        console.error("Error fetching public asset:", error);
        res.status(500).json({ error: "Error fetching asset" });
    }
};
