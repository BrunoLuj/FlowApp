import * as inventoryModel from "../models/inventoryModel.js";

export const getOverview = async (_req, res) => {
    try {
        res.json(await inventoryModel.getInventoryOverview());
    } catch (error) {
        console.error("Error fetching inventory:", error);
        res.status(500).json({ error: "Error fetching inventory" });
    }
};

export const getAvailable = async (_req, res) => {
    try {
        res.json(await inventoryModel.getAvailableItems());
    } catch (error) {
        console.error("Error fetching available inventory:", error);
        res.status(500).json({ error: "Error fetching available inventory" });
    }
};

export const addItem = async (req, res) => {
    if (!req.body.sku?.trim() || !req.body.name?.trim()) {
        return res.status(400).json({ error: "SKU and item name are required" });
    }
    try {
        res.status(201).json(await inventoryModel.createItem(req.body));
    } catch (error) {
        if (error.code === "23505") return res.status(409).json({ error: "SKU already exists" });
        console.error("Error creating inventory item:", error);
        res.status(500).json({ error: "Error creating inventory item" });
    }
};

export const editItem = async (req, res) => {
    try {
        const item = await inventoryModel.updateItem(req.params.id, req.body);
        if (!item) return res.status(404).json({ error: "Inventory item not found" });
        res.json(item);
    } catch (error) {
        if (error.code === "23505") return res.status(409).json({ error: "SKU already exists" });
        console.error("Error updating inventory item:", error);
        res.status(500).json({ error: "Error updating inventory item" });
    }
};

export const addWarehouse = async (req, res) => {
    if (!req.body.code?.trim() || !req.body.name?.trim()) {
        return res.status(400).json({ error: "Warehouse code and name are required" });
    }
    try {
        res.status(201).json(await inventoryModel.createWarehouse(req.body));
    } catch (error) {
        if (error.code === "23505") return res.status(409).json({ error: "Warehouse code already exists" });
        console.error("Error creating warehouse:", error);
        res.status(500).json({ error: "Error creating warehouse" });
    }
};

export const addMovement = async (req, res) => {
    if (!req.body.item_id || !req.body.warehouse_id || Number(req.body.quantity) <= 0) {
        return res.status(400).json({ error: "Item, warehouse and positive quantity are required" });
    }
    try {
        res.status(201).json(await inventoryModel.recordMovement(req.body, req.user.userId));
    } catch (error) {
        if (error.code === "INSUFFICIENT_STOCK") {
            return res.status(409).json({ error: "Insufficient stock" });
        }
        console.error("Error recording inventory movement:", error);
        res.status(500).json({ error: "Error recording inventory movement" });
    }
};
