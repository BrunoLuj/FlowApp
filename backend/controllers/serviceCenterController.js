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
