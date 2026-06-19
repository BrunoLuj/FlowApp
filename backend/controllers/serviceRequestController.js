import * as serviceRequestModel from "../models/serviceRequestModel.js";
import { queueEmailEvent } from "../models/emailNotificationModel.js";

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
        const fullRequest = await serviceRequestModel.getServiceRequestById(request.id, req.user.clientId);
        try {
            await queueEmailEvent({
                eventType: "service_request_created",
                clientId: request.client_id,
                entityType: "service_request",
                entityId: request.id,
                notificationBase: `service-request-created:${request.id}`,
                clientRecipients: [{ email: fullRequest?.client_email, name: fullRequest?.client_name }],
                data: { ...fullRequest, target_url: "/service-center" },
            });
        } catch (emailError) {
            console.error("Unable to queue service request email:", emailError);
        }
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
            req.user
        );
        if (!request) return res.status(404).json({ error: "Service request not found" });
        res.json(request);
    } catch (error) {
        console.error("Error updating service request:", error);
        res.status(500).json({ error: "Error updating service request" });
    }
};

export const getServiceRequest = async (req, res) => {
    try {
        const request = await serviceRequestModel.getServiceRequestById(
            req.params.id,
            req.user.clientId
        );
        if (!request) return res.status(404).json({ error: "Service request not found" });
        res.json(request);
    } catch (error) {
        console.error("Error fetching service request:", error);
        res.status(500).json({ error: "Error fetching service request" });
    }
};

export const addMessage = async (req, res) => {
    if (!req.body.message?.trim()) {
        return res.status(400).json({ error: "Message is required" });
    }
    try {
        const message = await serviceRequestModel.addServiceRequestMessage(
            req.params.id,
            req.body.message.trim(),
            req.body.internal_note,
            req.user
        );
        if (!message) return res.status(404).json({ error: "Service request not found" });
        res.status(201).json(message);
    } catch (error) {
        console.error("Error adding request message:", error);
        res.status(500).json({ error: "Error adding request message" });
    }
};

export const convertToWorkOrder = async (req, res) => {
    try {
        const result = await serviceRequestModel.convertServiceRequestToWorkOrder(
            req.params.id,
            req.body,
            req.user
        );
        if (!result) return res.status(404).json({ error: "Service request not found" });
        if (result.alreadyConverted) {
            return res.status(409).json({
                error: "Service request already has a work order",
                work_order_id: result.workOrderId,
            });
        }
        res.status(201).json(result);
    } catch (error) {
        if (error.code === "STATION_REQUIRED") {
            return res.status(400).json({ error: error.message });
        }
        console.error("Error converting request to work order:", error);
        res.status(500).json({ error: "Error converting request to work order" });
    }
};
