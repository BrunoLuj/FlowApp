import * as workOrdersModel from '../models/workorderModel.js';

// GET /work-orders
export const getWorkOrders = async (req, res) => {
    try {
        const workOrders = await workOrdersModel.getAllWorkOrders();
        res.json(workOrders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching work orders' });
    }
};

// GET /work-orders/active
export const getActiveWorkOrders = async (req, res) => {
    try {
        const workOrders = await workOrdersModel.getActiveWorkOrders();
        res.json(workOrders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching active work orders' });
    }
};

// POST /work-orders
export const addWorkOrder = async (req, res) => {
    const { project_id, type, title, description, assigned_to, planned_date } = req.body;
    try {
        const newWO = await workOrdersModel.createWorkOrder(project_id, type, title, description, assigned_to, planned_date);
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
