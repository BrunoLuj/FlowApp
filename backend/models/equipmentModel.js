import { pool } from "../libs/database.js";

// Generalna funkcija za dodavanje opreme
export const addEquipment = async (type, equipmentData) => {
    const { name, serialNumber, description, clientId } = equipmentData;
    let query;
    let values;

    // Form the query based on the equipment type
    switch (type) {
        case 'Sonda':
            query = 'INSERT INTO sonda (client_id, name, serial_number, description) VALUES ($1, $2, $3, $4)';
            values = [clientId, name, serialNumber, description];
            break;
        case 'Volumetar':
            query = 'INSERT INTO volumetar (client_id, volume, serial_number, description) VALUES ($1, $2, $3, $4)';
            values = [clientId, equipmentData.volume, serialNumber, description];
            break;
        case 'Rezervoar':
            query = 'INSERT INTO rezervoar (client_id, capacity, serial_number, description) VALUES ($1, $2, $3, $4)';
            values = [clientId, equipmentData.capacity, serialNumber, description];
            break;
        case 'Mjerna Letva':
            query = 'INSERT INTO mjerna_letva (client_id, length, serial_number, description) VALUES ($1, $2, $3, $4)';
            values = [clientId, equipmentData.length, serialNumber, description];
            break;
        default:
            throw new Error('Unknown equipment type');
    }

    try {
        // Using the pool to execute the query
        const result = await pool.query(query, values);
        console.log('Equipment added successfully', result);
    } catch (error) {
        console.error('Error adding equipment:', error);
        throw error;  // Re-throw the error after logging it
    }
};

// Generalna funkcija za ažuriranje opreme
export const updateEquipment = async (id, type, equipmentData) => {
    const { name, serialNumber, description, clientId } = equipmentData;
    let query;
    let values;

    switch (type) {
        case 'Sonda':
            query = 'UPDATE sonda SET name = $1, serial_number = $2, description = $3 WHERE id = $4';
            values = [name, serialNumber, description, id];
            break;
        case 'Volumetar':
            query = 'UPDATE volumetar SET volume = $1, serial_number = $2, description = $3 WHERE id = $4';
            values = [equipmentData.volume, serialNumber, description, id];
            break;
        case 'Rezervoar':
            query = 'UPDATE rezervoar SET capacity = $1, serial_number = $2, description = $3 WHERE id = $4';
            values = [equipmentData.capacity, serialNumber, description, id];
            break;
        case 'Mjerna Letva':
            query = 'UPDATE mjerna_letva SET length = $1, serial_number = $2, description = $3 WHERE id = $4';
            values = [equipmentData.length, serialNumber, description, id];
            break;
        default:
            throw new Error('Unknown equipment type');
    }

    try {
        const result = await pool.query(query, values);
        console.log('Equipment updated successfully', result);
    } catch (error) {
        console.error('Error updating equipment:', error);
        throw error;
    }
};

// Generalna funkcija za brisanje opreme
export const deleteEquipment = async (id, type) => {
    let query;

    switch (type) {
        case 'Sonda':
            query = 'DELETE FROM sonda WHERE id = $1';
            break;
        case 'Volumetar':
            query = 'DELETE FROM volumetar WHERE id = $1';
            break;
        case 'Rezervoar':
            query = 'DELETE FROM rezervoar WHERE id = $1';
            break;
        case 'Mjerna Letva':
            query = 'DELETE FROM mjerna_letva WHERE id = $1';
            break;
        default:
            throw new Error('Unknown equipment type');
    }

    try {
        const result = await pool.query(query, [id]);
        console.log('Equipment deleted successfully', result);
    } catch (error) {
        console.error('Error deleting equipment:', error);
        throw error;
    }
};

// Funkcija za dohvat svih oprema za određenog klijenta
export const getEquipmentByClientId = async (clientId, type) => {
    let query;

    // Odaberite upit prema vrsti opreme
    switch (type) {
        case 'Sonda':
            query = 'SELECT * FROM sonda WHERE client_id = $1';
            break;
        case 'Volumetar':
            query = 'SELECT * FROM volumetar WHERE client_id = $1';
            break;
        case 'Rezervoar':
            query = 'SELECT * FROM rezervoar WHERE client_id = $1';
            break;
        case 'Mjerna Letva':
            query = 'SELECT * FROM mjerna_letva WHERE client_id = $1';
            break;
        default:
            throw new Error('Unknown equipment type');
    }

    try {
        // Pokretanje upita koristeći pool.query
        const result = await pool.query(query, [clientId]);
        return result.rows;  // Vraćamo redove kao rezultat
    } catch (error) {
        console.error('Error fetching equipment:', error);
        throw error;  // Ponovno bacanje greške kako bi se obradila dalje
    }
};