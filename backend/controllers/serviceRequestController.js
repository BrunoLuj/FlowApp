import * as serviceRequestModel from "../models/serviceRequestModel.js";

export const getServiceRequests = async (req, res) => {
    try {
        const requests = await serviceRequestModel.getServiceRequests({
            clientId: req.user.clientId,
            status: req.query.status,
            priority: req.query.priority,
            stationId: req.query.station_id,
        });
        res.json(requests);
    } catch (error) {
        console.error("Error fetching service requests:", error);
        res.status(500).json({ error: "Error fetching service requests" });
    }
};

export const addServiceRequest = async (req, res) => {
    const { subject, description, client_id } = req.body;
    if (!subject?.trim() || !description?.trim() || (!req.user.clientId && !client_id)) {
        return res.status(400).json({
            error: "Client, subject and description are required",
        });
    }

    try {
        const request = await serviceRequestModel.createServiceRequest(req.body, req.user);
        res.status(201).json(request);
    } catch (error) {
        console.error("Error creating service request:", error);
        res.status(500).json({ error: "Error creating service request" });
    }
};

export const updateServiceRequest = async (req, res) => {
    try {
        const request = await serviceRequestModel.updateServiceRequest(
            req.params.id,
            req.body,
            req.user.clientId
        );
        if (!request) return res.status(404).json({ error: "Service request not found" });
        res.json(request);
    } catch (error) {
        console.error("Error updating service request:", error);
        res.status(500).json({ error: "Error updating service request" });
    }
};
