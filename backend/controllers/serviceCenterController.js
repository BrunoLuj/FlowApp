import * as serviceCenterModel from "../models/serviceCenterModel.js";

export const getDashboard = async (req, res) => {
    try {
        const dashboard = await serviceCenterModel.getDashboard(req.user.clientId);
        res.json(dashboard);
    } catch (error) {
        console.error("Error fetching service center dashboard:", error);
        res.status(500).json({ error: "Error fetching service center dashboard" });
    }
};

export const getStations = async (req, res) => {
    try {
        const stations = await serviceCenterModel.getStations(req.user.clientId);
        res.json(stations);
    } catch (error) {
        console.error("Error fetching stations:", error);
        res.status(500).json({ error: "Error fetching stations" });
    }
};

export const getStation = async (req, res) => {
    try {
        const station = await serviceCenterModel.getStationById(req.params.id, req.user.clientId);
        if (!station) return res.status(404).json({ error: "Station not found" });
        res.json(station);
    } catch (error) {
        console.error("Error fetching station:", error);
        res.status(500).json({ error: "Error fetching station" });
    }
};

export const addAsset = async (req, res) => {
    if (!req.body.category?.trim() || !req.body.name?.trim()) {
        return res.status(400).json({ error: "Asset category and name are required" });
    }
    try {
        const asset = await serviceCenterModel.createAsset(
            req.params.id,
            req.body,
            req.user.clientId
        );
        if (!asset) return res.status(404).json({ error: "Station not found" });
        res.status(201).json(asset);
    } catch (error) {
        console.error("Error creating asset:", error);
        res.status(500).json({ error: "Error creating asset" });
    }
};

export const editAsset = async (req, res) => {
    if (!req.body.category?.trim() || !req.body.name?.trim()) {
        return res.status(400).json({ error: "Asset category and name are required" });
    }
    try {
        const asset = await serviceCenterModel.updateAsset(
            req.params.assetId,
            req.body,
            req.user.clientId
        );
        if (!asset) return res.status(404).json({ error: "Asset not found" });
        res.json(asset);
    } catch (error) {
        console.error("Error updating asset:", error);
        res.status(500).json({ error: "Error updating asset" });
    }
};

export const removeAsset = async (req, res) => {
    try {
        const asset = await serviceCenterModel.deleteAsset(req.params.assetId, req.user.clientId);
        if (!asset) return res.status(404).json({ error: "Asset not found" });
        res.json({ message: "Asset deleted" });
    } catch (error) {
        console.error("Error deleting asset:", error);
        res.status(500).json({ error: "Error deleting asset" });
    }
};
