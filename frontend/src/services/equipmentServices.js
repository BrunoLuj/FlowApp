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

export const deleteEquipment = async (type, equipmentData) => {
    // if (equipmentData.id) {
    //     return await api.put(`/equipment/${equipmentData.id}/${type}`, equipmentData);
    // } else {
    //     return await api.post(`/equipment/${type}`, equipmentData);
    // }
};


// Funkcija za dohvaćanje opreme za određeni tip
// export const fetchEquipment = async (type) => {
//     try {
//         const response = await axios.get(`${API_URL}/${type}`);
//         return response.data;
//     } catch (error) {
//         console.error("Error fetching equipment:", error);
//         throw error;
//     }
// };

// Funkcija za spremanje nove opreme
// export const saveEquipment = async (type, equipmentData) => {
//     try {
//         await axios.post(API_URL, {
//             type,
//             ...equipmentData,
//         });
//     } catch (error) {
//         console.error("Error saving equipment:", error);
//         throw error;
//     }
// };
