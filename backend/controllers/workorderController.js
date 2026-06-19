import * as workOrdersModel from '../models/workorderModel.js';

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
