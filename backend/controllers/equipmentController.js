import * as equipmentModel from '../models/equipmentModel.js';

// Kontroler za dohvat svih oprema za određenog klijenta
export const getEquipments = async (req, res) => {
    const { clientId, type } = req.params;

    console.log("Controller console",clientId, type)

    try {
        const equipments = await equipmentModel.getEquipmentByClientId(clientId, type);
        res.json(equipments);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch equipment' });
    }
};

// Kontroler za dodavanje nove opreme
export const addEquipment = async (req, res) => {
    const { type } = req.params;
    const equipmentData = req.body;

    try {
        await equipmentModel.addEquipment(type, equipmentData);
        res.status(201).json({ message: 'Equipment added successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add equipment' });
    }
};

// Kontroler za ažuriranje opreme
export const updateEquipments = async (req, res) => {
    const { id, type } = req.params;
    const equipmentData = req.body;

    try {
        await equipmentModel.updateEquipment(id, type, equipmentData);
        res.json({ message: 'Equipment updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update equipment' });
    }
};

// Kontroler za brisanje opreme
export const deleteEquipments = async (req, res) => {
    const { id, type } = req.params;

    try {
        await equipmentModel.deleteEquipment(id, type);
        res.json({ message: 'Equipment deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete equipment' });
    }
};