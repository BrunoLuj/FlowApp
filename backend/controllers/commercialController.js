import * as commercialModel from "../models/commercialModel.js";

export const getOverview = async (req, res) => {
    try {
        res.json(await commercialModel.getCommercialOverview(req.user.clientId));
    } catch (error) {
        console.error("Commercial overview error:", error);
        res.status(500).json({ error: "Error fetching commercial data" });
    }
};

export const getContract = async (req, res) => {
    try {
        const contract = await commercialModel.getContractById(req.params.id, req.user.clientId);
        if (!contract) return res.status(404).json({ error: "Contract not found" });
        res.json(contract);
    } catch (error) {
        res.status(500).json({ error: "Error fetching contract" });
    }
};

export const saveContract = async (req, res) => {
    if (!req.body.contract_number?.trim() || !req.body.title?.trim() || !req.body.start_date) {
        return res.status(400).json({ error: "Contract number, title and start date are required" });
    }
    try {
        const contract = await commercialModel.saveContract(req.params.id || null, req.body, req.user);
        if (!contract) return res.status(404).json({ error: "Contract not found" });
        res.status(req.params.id ? 200 : 201).json(contract);
    } catch (error) {
        if (error.code === "23505") return res.status(409).json({ error: "Contract number already exists" });
        console.error("Contract save error:", error);
        res.status(500).json({ error: "Error saving contract" });
    }
};

export const getQuotation = async (req, res) => {
    try {
        const quote = await commercialModel.getQuotationById(req.params.id, req.user.clientId);
        if (!quote) return res.status(404).json({ error: "Quotation not found" });
        res.json(quote);
    } catch {
        res.status(500).json({ error: "Error fetching quotation" });
    }
};

export const saveQuotation = async (req, res) => {
    if (!req.body.title?.trim() || !req.body.issue_date || !Array.isArray(req.body.items)) {
        return res.status(400).json({ error: "Title, issue date and items are required" });
    }
    try {
        const quote = await commercialModel.saveQuotation(req.params.id || null, req.body, req.user);
        if (!quote) return res.status(404).json({ error: "Quotation not found" });
        res.status(req.params.id ? 200 : 201).json(quote);
    } catch (error) {
        console.error("Quotation save error:", error);
        res.status(500).json({ error: "Error saving quotation" });
    }
};

export const createFromWorkOrder = async (req, res) => {
    try {
        const quote = await commercialModel.createQuotationFromWorkOrder(req.params.workOrderId, req.user);
        if (!quote) return res.status(404).json({ error: "Work order not found" });
        res.status(201).json(quote);
    } catch (error) {
        console.error("Quotation generation error:", error);
        res.status(500).json({ error: "Error generating quotation" });
    }
};

export const getPublicQuotation = async (req, res) => {
    try {
        const quote = await commercialModel.getPublicQuotation(req.params.token);
        if (!quote) return res.status(404).json({ error: "Quotation not found" });
        res.json(quote);
    } catch {
        res.status(500).json({ error: "Error fetching quotation" });
    }
};

export const decideQuotation = async (req, res) => {
    if (!["accept", "reject"].includes(req.body.decision)) {
        return res.status(400).json({ error: "Invalid decision" });
    }
    if (req.body.decision === "accept" && !req.body.name?.trim()) {
        return res.status(400).json({ error: "Name is required for acceptance" });
    }
    try {
        const quote = await commercialModel.decideQuotation(req.params.token, req.body);
        if (!quote) return res.status(409).json({ error: "Quotation is no longer available for decision" });
        res.json(quote);
    } catch {
        res.status(500).json({ error: "Error updating quotation" });
    }
};
