import axios from 'axios';

const API_URL = 'https://api.example.com/equipment';

// Funkcija za dohvaćanje opreme za određeni tip
export const fetchEquipment = async (type) => {
    try {
        const response = await axios.get(`${API_URL}/${type}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching equipment:", error);
        throw error;
    }
};

// Funkcija za spremanje nove opreme
export const saveEquipment = async (type, equipmentData) => {
    try {
        await axios.post(API_URL, {
            type,
            ...equipmentData,
        });
    } catch (error) {
        console.error("Error saving equipment:", error);
        throw error;
    }
};
