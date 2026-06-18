import * as maintenanceModel from "../models/maintenanceModel.js";

export const getPlans = async (req, res) => {
    try {
        res.json(await maintenanceModel.getPlans(req.user.clientId));
    } catch (error) {
        console.error("Error fetching maintenance plans:", error);
        res.status(500).json({ error: "Error fetching maintenance plans" });
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
    const { asset_id, name, interval_value, interval_unit, next_due_date } = req.body;
    if (!asset_id || !name?.trim() || Number(interval_value) <= 0 || !interval_unit || !next_due_date) {
        return res.status(400).json({ error: "Asset, name, interval and next due date are required" });
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

export const editPlan = async (req, res) => {
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
