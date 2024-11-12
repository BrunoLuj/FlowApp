import api from '../libs/apiCall.js';

// Dohvati opremu za klijenta prema tipu opreme
export const fetchEquipment = async (clientId, type) => {
    try {
        const response = await api.get(`/equipment/${clientId}/${type}`);
        return response;
    } catch (error) {
        console.error("Error fetching equipment:", error);
        throw new Error('Failed to fetch equipment');
    }
};

// Spremi novu opremu ili ažuriraj postojeću
export const saveEquipment = async (type, equipmentData) => {
    try {
        console.log(equipmentData);
        if (equipmentData.id) {
            return await api.put(`/equipment/${equipmentData.id}/${type}`, equipmentData);
        } else {
            return await api.post(`/equipment/${type}`, equipmentData);
        }
    } catch (error) {
        console.error("Error saving equipment:", error);
        throw new Error('Failed to save or update equipment');
    }
};

// Obrisi opremu
export const deleteEquipment = async (id, type) => {
    try {
        return await api.delete(`/equipment/${id}/${type}`);
    } catch (error) {
        console.error("Error deleting equipment:", error);
        throw new Error('Failed to delete equipment');
    }
};

// Ažuriraj datum isteka umjeravanja
export const updateCalibrationExpiry = async (equipmentId, clientId, currentExpiryDate) => {
    console.log("Front Services:", equipmentId, clientId, currentExpiryDate)
    try {
        return await api.post(`/equipment/calibrationexpiry/${equipmentId}/${clientId}/${currentExpiryDate}`);
    } catch (error) {
        console.error("Error updating calibration expiry:", error);
        throw new Error('Failed to update calibration expiry');
    }
};

export const fetchCalibrationExpiriesHistory = async (clientId, equipmentId) =>{
    console.log("Front Services:", clientId, equipmentId )
    try {
        return await api.get(`/equipment/calibrationexpiry/${clientId}/${equipmentId}`);
    } catch (error) {
        console.error("Error updating calibration expiry:", error);
        throw new Error('Failed to update calibration expiry');
    }
};