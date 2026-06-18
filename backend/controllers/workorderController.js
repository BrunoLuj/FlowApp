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
        const material = await workOrdersModel.addWorkOrderMaterial(req.params.id, req.body);
        res.status(201).json(material);
    } catch (error) {
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
        console.error(error);
        res.status(500).json({ error: "Error completing work order" });
    }
};

export const updateSchedule = async (req, res) => {
    try {
        const order = await workOrdersModel.updateWorkOrderSchedule(
            req.params.id,
            req.body,
            req.user.clientId
        );
        if (!order) return res.status(404).json({ error: "Work order not found" });
        res.json(order);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error updating work order schedule" });
    }
};
