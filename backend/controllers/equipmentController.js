import * as equipmentModel from '../models/equipmentModel.js';

// Kontroler za dohvat svih oprema za određenog klijenta
export const getEquipments = async (req, res) => {
    const { clientId, type } = req.params;

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

// Funkcija za ažuriranje datuma isteka
export const updateCalibrationExpiry = async (req, res) => {
    const { equipmentId, clientId, currentExpiryDate } = req.params;

    try {
      // Pozivamo model za ažuriranje datuma isteka
      await equipmentModel.updateCalibrationExpiry(equipmentId, clientId, currentExpiryDate);
  
      // Vraćamo odgovor o uspešnom ažuriranju
      res.status(200).send({ message: 'Calibration expiry date updated successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).send({ message: 'Error updating calibration expiry date' });
    }
};

export const getCalibrationExpiry = async (req, res) => {
    const { clientId, equipmentId } = req.params;

    console.log(clientId, equipmentId);

    try {
        // Pozivamo model za dohvat datuma isteka
        const result = await equipmentModel.getCalibrationExpiry(clientId, equipmentId);
        
        // Vraćamo podatke sa trenutnim i prethodnim datumima isteka
        res.status(200).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Error fetching calibration expiry date' });
    }
};