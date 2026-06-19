import * as workOrdersModel from '../models/workorderModel.js';
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { uploadsRoot, removeUploadedFile } from "../middleware/uploadMiddleware.js";
import { buildServiceReportPdf } from "../libs/serviceReportPdf.js";
import { queueEmailEvent } from "../models/emailNotificationModel.js";

// GET /work-orders
export const getWorkOrders = async (req, res) => {
    try {
        const workOrders = await workOrdersModel.getAllWorkOrders(req.user.clientId);
        res.json(workOrders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching work orders' });
    }
};

// GET /work-orders/active
export const getActiveWorkOrders = async (req, res) => {
    try {
        const workOrders = await workOrdersModel.getActiveWorkOrders(req.user.clientId);
        res.json(workOrders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching active work orders' });
    }
};

export const getMyMobileWorkOrders = async (req, res) => {
    try {
        res.json(await workOrdersModel.getMyMobileWorkOrders(req.user.userId));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error fetching mobile work orders" });
    }
};

export const addMobileEvent = async (req, res) => {
    if (!req.body.event_key || !["arrive", "start", "stop", "field_update"].includes(req.body.event_type)) {
        return res.status(400).json({ error: "Event key and valid event type are required" });
    }
    try {
        const result = await workOrdersModel.applyMobileWorkOrderEvent(
            req.params.id,
            req.body,
            req.user.userId
        );
        if (!result) return res.status(404).json({ error: "Assigned work order not found" });
        res.status(result.duplicate ? 200 : 201).json(result);
    } catch (error) {
        if (error.code === "INVALID_EVENT_TIME" || error.code === "22P02") {
            return res.status(400).json({ error: "Invalid mobile event data" });
        }
        if (error.code === "EVENT_KEY_CONFLICT") {
            return res.status(409).json({ error: "Mobile event key is already in use" });
        }
        console.error(error);
        res.status(500).json({ error: "Error saving mobile work event" });
    }
};

// POST /work-orders
export const addWorkOrder = async (req, res) => {
    const { project_id, type, title, description, assigned_to, planned_date, start_date, end_date, status } = req.body;
    try {
        const newWO = await workOrdersModel.createWorkOrder(project_id, type, title, description, assigned_to, planned_date, start_date, end_date, status);
        res.status(201).json(newWO);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creating work order' });
    }
};

// PUT /work-orders/:id
export const updateWorkOrder = async (req, res) => {
    const { id } = req.params;
    const { project_id, type, title, description, assigned_to, planned_date, status } = req.body;
    try {
        const updatedWO = await workOrdersModel.updateWorkOrder(id, project_id, type, title, description, assigned_to, planned_date, status);
        if (updatedWO) {
            res.json(updatedWO);
        } else {
            res.status(404).json({ error: 'Work order not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error updating work order' });
    }
};

// DELETE /work-orders/:id
export const deleteWorkOrder = async (req, res) => {
    const { id } = req.params;
    try {
        const deletedWO = await workOrdersModel.deleteWorkOrder(id);
        if (deletedWO) {
            res.json({ message: 'Work order deleted' });
        } else {
            res.status(404).json({ error: 'Work order not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error deleting work order' });
    }
};

export const getWorkOrder = async (req, res) => {
    try {
        const workOrder = await workOrdersModel.getWorkOrderById(req.params.id, req.user.clientId);
        if (!workOrder) return res.status(404).json({ error: "Work order not found" });
        res.json(workOrder);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error fetching work order" });
    }
};

export const getWorkOrderHistory = async (req, res) => {
    try {
        const order = await workOrdersModel.getWorkOrderById(req.params.id, req.user.clientId);
        if (!order) return res.status(404).json({ error: "Work order not found" });
        res.json(await workOrdersModel.getWorkOrderHistory(req.params.id));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error fetching work order history" });
    }
};

export const generateServiceReport = async (req, res) => {
    let storageKey;
    try {
        const order = await workOrdersModel.getWorkOrderById(req.params.id, req.user.clientId);
        if (!order) return res.status(404).json({ error: "Work order not found" });
        const version = await workOrdersModel.getNextServiceReportVersion(req.params.id);
        const buffer = await buildServiceReportPdf(order, version);
        const safeNumber = (order.work_order_number || `WO-${order.id}`)
            .replace(/[^a-zA-Z0-9_-]/g, "-");
        storageKey = `${Date.now()}-${crypto.randomUUID()}.pdf`;
        const fileName = `servisni-zapisnik-${safeNumber}-v${version}.pdf`;
        await fs.writeFile(path.join(uploadsRoot, storageKey), buffer, { flag: "wx" });
        const attachment = await workOrdersModel.registerGeneratedServiceReport(
            req.params.id,
            {
                version,
                fileName,
                storageKey,
                fileSize: buffer.length,
            },
            req.user.userId,
            req.user.clientId
        );
        if (!attachment) {
            await removeUploadedFile(storageKey);
            return res.status(404).json({ error: "Work order not found" });
        }
        try {
            await queueEmailEvent({
                eventType: "service_report_generated",
                clientId: order.client_id,
                entityType: "work_order",
                entityId: order.id,
                notificationBase: `service-report:${order.id}:v${attachment.version_no}`,
                clientRecipients: [{ email: order.client_email, name: order.client_name }],
                attachments: [{
                    filename: attachment.file_name,
                    storage_key: attachment.storage_key,
                    content_type: attachment.mime_type,
                }],
                data: {
                    work_order_number: order.work_order_number || `WO-${order.id}`,
                    station_name: order.station_name,
                    version: attachment.version_no,
                    target_url: `/work-orders/${order.id}`,
                },
            });
        } catch (emailError) {
            console.error("Unable to queue service report email:", emailError);
        }
        res.status(201).json(attachment);
    } catch (error) {
        if (storageKey) await removeUploadedFile(storageKey);
        if (error.code === "REPORT_VERSION_CONFLICT") {
            return res.status(409).json({ error: "Report version changed. Please retry." });
        }
        console.error("Error generating service report:", error);
        res.status(500).json({ error: "Error generating service report" });
    }
};

export const addActivity = async (req, res) => {
    if (!req.body.description?.trim()) return res.status(400).json({ error: "Description is required" });
    try {
        const order = await workOrdersModel.getWorkOrderById(req.params.id, req.user.clientId);
        if (!order) return res.status(404).json({ error: "Work order not found" });
        const activity = await workOrdersModel.addWorkOrderActivity(req.params.id, req.body, req.user.userId);
        res.status(201).json(activity);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error adding activity" });
    }
};

export const addMaterial = async (req, res) => {
    if (!req.body.item_name?.trim()) return res.status(400).json({ error: "Item name is required" });
    try {
        const order = await workOrdersModel.getWorkOrderById(req.params.id, req.user.clientId);
        if (!order) return res.status(404).json({ error: "Work order not found" });
        const material = await workOrdersModel.addWorkOrderMaterial(
            req.params.id,
            { ...req.body, user_id: req.user.userId }
        );
        res.status(201).json(material);
    } catch (error) {
        if (error.code === "INSUFFICIENT_STOCK") {
            return res.status(409).json({ error: "Insufficient stock" });
        }
        if (error.code === "ITEM_NOT_FOUND") {
            return res.status(404).json({ error: "Inventory item not found" });
        }
        console.error(error);
        res.status(500).json({ error: "Error adding material" });
    }
};

export const addChecklist = async (req, res) => {
    if (!req.body.label?.trim()) return res.status(400).json({ error: "Checklist label is required" });
    try {
        const order = await workOrdersModel.getWorkOrderById(req.params.id, req.user.clientId);
        if (!order) return res.status(404).json({ error: "Work order not found" });
        const item = await workOrdersModel.addChecklistItem(req.params.id, req.body);
        res.status(201).json(item);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error adding checklist item" });
    }
};

export const updateChecklist = async (req, res) => {
    try {
        const order = await workOrdersModel.getWorkOrderById(req.params.id, req.user.clientId);
        if (!order) return res.status(404).json({ error: "Work order not found" });
        const item = await workOrdersModel.updateChecklistItem(req.params.id, req.params.itemId, req.body, req.user.userId);
        if (!item) return res.status(404).json({ error: "Checklist item not found" });
        res.json(item);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error updating checklist item" });
    }
};

export const completeWorkOrder = async (req, res) => {
    try {
        const existingOrder = await workOrdersModel.getWorkOrderById(req.params.id, req.user.clientId);
        if (!existingOrder) return res.status(404).json({ error: "Work order not found" });
        const order = await workOrdersModel.completeWorkOrder(req.params.id, req.body, req.user.userId);
        if (!order) return res.status(404).json({ error: "Work order not found" });
        res.json(order);
    } catch (error) {
        if (error.code === "CHECKLIST_INCOMPLETE") {
            return res.status(409).json({ error: "Complete all required checklist items first" });
        }
        if (error.code === "METER_DECREASE") {
            return res.status(409).json({ error: "Očitanje opreme ne može biti manje od prethodnog." });
        }
        if (error.code === "INVALID_READING") {
            return res.status(400).json({ error: "Očitanje opreme mora biti pozitivan broj." });
        }
        console.error(error);
        res.status(500).json({ error: "Error completing work order" });
    }
};

export const updateFieldData = async (req, res) => {
    const signature = req.body.customer_signature_data;
    if (signature && !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(signature)) {
        return res.status(400).json({ error: "Invalid signature format" });
    }
    if (signature && signature.length > 1_500_000) {
        return res.status(400).json({ error: "Signature is too large" });
    }
    if (
        req.body.odometer_start !== "" &&
        req.body.odometer_end !== "" &&
        Number(req.body.odometer_end) < Number(req.body.odometer_start)
    ) {
        return res.status(400).json({ error: "Ending mileage cannot be lower than starting mileage" });
    }
    try {
        const order = await workOrdersModel.updateWorkOrderFieldData(
            req.params.id,
            req.body,
            req.user.userId,
            req.user.clientId
        );
        if (!order) return res.status(404).json({ error: "Work order not found" });
        res.json(order);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error updating field service report" });
    }
};

export const updateSchedule = async (req, res) => {
    if (
        req.body.scheduled_start_at &&
        req.body.scheduled_end_at &&
        new Date(req.body.scheduled_end_at) <= new Date(req.body.scheduled_start_at)
    ) {
        return res.status(400).json({ error: "Schedule end must be after start" });
    }
    try {
        const order = await workOrdersModel.updateWorkOrderSchedule(
            req.params.id,
            req.body,
            req.user.clientId,
            req.user.userId
        );
        if (!order) return res.status(404).json({ error: "Work order not found" });
        const fullOrder = await workOrdersModel.getWorkOrderById(req.params.id, req.user.clientId);
        try {
            await queueEmailEvent({
                eventType: "work_order_assigned",
                clientId: fullOrder.client_id,
                entityType: "work_order",
                entityId: fullOrder.id,
                notificationBase: `work-order-assigned:${fullOrder.id}:${(fullOrder.assigned_to || []).join("-")}:${fullOrder.updated_at}`,
                assigneeRecipients: (fullOrder.assigned_users || []).map((user) => ({
                    email: user.email,
                    name: `${user.firstname} ${user.lastname}`,
                })),
                data: {
                    work_order_number: fullOrder.work_order_number || `WO-${fullOrder.id}`,
                    title: fullOrder.title,
                    client_name: fullOrder.client_name,
                    station_name: fullOrder.station_name,
                    scheduled_at: fullOrder.scheduled_start_at
                        ? new Intl.DateTimeFormat("hr-HR", { dateStyle: "short", timeStyle: "short" }).format(new Date(fullOrder.scheduled_start_at))
                        : fullOrder.planned_date || "-",
                    target_url: `/work-orders/${fullOrder.id}`,
                },
            });
        } catch (emailError) {
            console.error("Unable to queue work order assignment email:", emailError);
        }
        res.json(order);
    } catch (error) {
        if (error.code === "SCHEDULE_CONFLICT") {
            return res.status(409).json({
                error: `Serviser već ima nalog "${error.conflict.title}" u tom terminu.`,
                conflict: error.conflict,
            });
        }
        if (error.code === "TECHNICIAN_UNAVAILABLE") {
            return res.status(409).json({
                error: `${error.conflict.technician_name} nije raspoloživ u odabranom terminu.`,
                conflict: error.conflict,
            });
        }
        console.error(error);
        res.status(500).json({ error: "Error updating work order schedule" });
    }
};
