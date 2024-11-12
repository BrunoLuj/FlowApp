import { pool } from "../libs/database.js";

// Generalna funkcija za dodavanje opreme
export const addEquipment = async (type, equipmentData) => {
    const { name, serialNumber, description, clientId } = equipmentData;
    let query;
    let values;

    // Form the query based on the equipment type
    switch (type) {
        case 'Sonda':
            query = 'INSERT INTO sonda (client_id, name, serial_number, description, serial_number_controller, sondatype, manufacturer, officialmark, tank, fuel, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)';
            values = [clientId, name, serialNumber, description, equipmentData.serialNumberController, equipmentData.sondatype, equipmentData.manufacturer, equipmentData.officialmark, equipmentData.tank, equipmentData.fuel, equipmentData.status];
            break;
        case 'Volumetar':
            query = 'INSERT INTO volumeters (client_id, name, volume, serial_number, description, manufacturer, volumetype, officialmark, serial_number_device, status ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)';
            values = [clientId, name, equipmentData.volume, serialNumber, description, equipmentData.manufacturer, equipmentData.volumetype, equipmentData.officialmark, equipmentData.serialNumberDevice, equipmentData.status];
            break;
        case 'Rezervoar':
            query = 'INSERT INTO rezervoar (client_id, name, capacity, serial_number, description, manufacturer, officialmark, tanktype, fuel, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)';
            values = [clientId, name, equipmentData.capacity, serialNumber, description, equipmentData.manufacturer, equipmentData.officialmark, equipmentData.tanktype, equipmentData.fuel, equipmentData.status];
            break;
        case 'Mjerna Letva':
            query = 'INSERT INTO mjerna_letva (client_id, name, length, serial_number, description, manufacturer, status) VALUES ($1, $2, $3, $4, $5, $6, $7)';
            values = [clientId, name, equipmentData.length, serialNumber, description, equipmentData.manufacturer, equipmentData.status];
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
            query = 'UPDATE sonda SET name = $1, serial_number = $2, description = $3, serial_number_controller = $4, sondatype = $5, manufacturer = $6, officialmark = $7, tank = $8, fuel = $9, status = $10 WHERE id = $11';
            values = [name, serialNumber, description, equipmentData.serialNumberController, equipmentData.sondatype, equipmentData.manufacturer, equipmentData.officialmark, equipmentData.tank, equipmentData.fuel, equipmentData.status, id];
            break;
        case 'Volumetar':
            query = 'UPDATE volumeters SET name = $1, volume = $2, serial_number = $3, description = $4, manufacturer = $5, volumetype = $6, officialmark = $7, serial_number_device = $8, status = $9  WHERE id = $10';
            values = [name, equipmentData.volume, serialNumber, description, equipmentData.manufacturer, equipmentData.volumetype, equipmentData.officialmark, equipmentData.serialNumberDevice, equipmentData.status, id];
            break;
        case 'Rezervoar':
            query = 'UPDATE rezervoar SET name = $1, capacity = $2, serial_number = $3, description = $4, manufacturer = $5, officialmark = $6, tanktype = $7, fuel = $8, status = $9 WHERE id = $10';
            values = [name, equipmentData.capacity, serialNumber, description, equipmentData.manufacturer, equipmentData.officialmark, equipmentData.tanktype, equipmentData.fuel, equipmentData.status, id];
            break;
        case 'Mjerna Letva':
            query = 'UPDATE mjerna_letva SET name = $1, length = $2, serial_number = $3, description = $4, manufacturer = $5, status = $6 WHERE id = $7';
            values = [name, equipmentData.length, serialNumber, description, equipmentData.manufacturer, equipmentData.status, id];
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
            query = 'DELETE FROM volumeters WHERE id = $1';
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
            query = 'SELECT * FROM volumeters WHERE client_id = $1';
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