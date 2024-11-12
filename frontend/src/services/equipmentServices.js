import api from '../libs/apiCall.js';

// Dohvati opremu za klijenta prema tipu opreme
export const fetchEquipment = async (clientId, type) => {
    return await api.get(`/equipment/${clientId}/${type}`);
};

// Spremi novu opremu ili ažuriraj postojeću
export const saveEquipment = async (type, equipmentData) => {
    console.log(equipmentData)
    if (equipmentData.id) {
        return await api.put(`/equipment/${equipmentData.id}/${type}`, equipmentData);
    } else {
        return await api.post(`/equipment/${type}`, equipmentData);
    }
};

export const deleteEquipment = async (id, type) => {
    return await api.delete(`/equipment/${id}/${type}`);
};