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

export const saveAvailability = async (req, res) => {
    if (!req.body.user_id || !req.body.availability_date) {
        return res.status(400).json({ error: "Technician and date are required" });
    }
    try {
        const item = await managementModel.setTechnicianAvailability(req.body, req.user.userId);
        if (!item) return res.status(404).json({ error: "Availability record not found" });
        res.json(item);
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({ error: "Za servisera već postoji odsutnost s istim početnim vremenom." });
        }
        if (error.code === "23514" || error.code === "22007") {
            return res.status(400).json({ error: "Vrijeme završetka mora biti nakon vremena početka." });
        }
        console.error("Error saving technician availability:", error);
        res.status(500).json({ error: "Error saving technician availability" });
    }
};

export const removeAvailability = async (req, res) => {
    try {
        const item = await managementModel.deleteTechnicianAvailability(req.params.id);
        if (!item) return res.status(404).json({ error: "Availability record not found" });
        res.json({ message: "Availability record removed" });
    } catch (error) {
        console.error("Error deleting technician availability:", error);
        res.status(500).json({ error: "Error deleting technician availability" });
    }
};
