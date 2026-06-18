import * as managementModel from "../models/managementModel.js";

export const getOverview = async (req, res) => {
    try {
        const overview = await managementModel.getManagementOverview(req.user.clientId);
        res.json(overview);
    } catch (error) {
        console.error("Error fetching management overview:", error);
        res.status(500).json({ error: "Error fetching management overview" });
    }
};

export const getPlanner = async (req, res) => {
    const from = req.query.from;
    const to = req.query.to;
    if (!from || !to) {
        return res.status(400).json({ error: "Planner date range is required" });
    }
    try {
        const planner = await managementModel.getPlanner({
            from,
            to,
            clientId: req.user.clientId,
        });
        res.json(planner);
    } catch (error) {
        console.error("Error fetching planner:", error);
        res.status(500).json({ error: "Error fetching planner" });
    }
};
