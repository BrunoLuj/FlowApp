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

// Funkcija za ažuriranje datuma isteka
export const updateCalibrationExpiry = async (equipmentId, clientId, currentExpiryDate) => {
    try {
        // Provjerite da li postoji datum isteka
        const result = await pool.query(
            'SELECT current_expiry_date FROM calibration_expiries WHERE equipment_id = $1 AND client_id = $2',
            [equipmentId, clientId]
        );

        if (result.rows.length === 0) {
            console.log('No expiry date found, adding initial date...');
            // Ako nema, dodajte početni datum isteka
            await addInitialCalibrationExpiry(equipmentId, clientId, currentExpiryDate);
        } else {
            console.log('Expiry date found, updating...');
            // Ako postoji, premestite ga u istoriju pre nego što ažurirate trenutni datum
            const currentDate = result.rows[0].current_expiry_date;

            // Premesti stari datum u istoriju
            await addToCalibrationExpiryHistory(equipmentId, clientId, currentDate);

            // Ažurirajte trenutni datum isteka
            await updateCurrentCalibrationExpiry(equipmentId, clientId, currentExpiryDate);
        }

        console.log('Calibration expiry date updated successfully');
    } catch (error) {
        console.error('Error updating calibration expiry date:', error);
        throw error;
    }
};

// Funkcija za dodavanje inicijalnog datuma isteka ako ne postoji
const addInitialCalibrationExpiry = async (equipment_id, client_id, initial_expiry_date) => {
    try {
        const result = await pool.query(
            'INSERT INTO calibration_expiries (equipment_id, client_id, current_expiry_date, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
            [equipment_id, client_id, initial_expiry_date]
        );
        console.log('Initial expiry date added successfully!');
    } catch (error) {
        console.error('Error adding initial expiry date:', error);
        throw error;
    }
};

// Funkcija za premještanje starog datuma u istorijsku tabelu
const addToCalibrationExpiryHistory = async (equipment_id, client_id, expiry_date) => {
    try {
        const result = await pool.query(
            'INSERT INTO calibration_expiry_history (equipment_id, client_id, expiry_date) VALUES ($1, $2, $3)',
            [equipment_id, client_id, expiry_date]
        );
        console.log('Old expiry date moved to history successfully!');
    } catch (error) {
        console.error('Error moving old expiry date to history:', error);
        throw error;
    }
};

// Funkcija za ažuriranje trenutnog datuma isteka
const updateCurrentCalibrationExpiry = async (equipment_id, client_id, current_expiry_date) => {
    try {
        const result = await pool.query(
            'UPDATE calibration_expiries SET current_expiry_date = $1, updated_at = CURRENT_TIMESTAMP WHERE equipment_id = $2 AND client_id = $3',
            [current_expiry_date, equipment_id, client_id]
        );
        console.log('Current expiry date updated successfully!');
    } catch (error) {
        console.error('Error updating current expiry date:', error);
        throw error;
    }
};

// Funkcija za dohvaćanje trenutnog datuma isteka i povijesti
export const getCalibrationExpiry = async (clientId, equipmentId) => {
    console.log("Model", clientId, equipmentId);
    try {
        // Dohvati trenutni datum isteka iz calibration_expiries
        const currentExpiryResult = await pool.query(
            'SELECT current_expiry_date FROM calibration_expiries WHERE client_id = $1 AND equipment_id = $2',
            [clientId, equipmentId]
        );
    
        // Dohvati povjesne datume isteka iz calibration_expiry_history
        const historyResult = await pool.query(
            'SELECT expiry_date FROM calibration_expiry_history WHERE client_id = $1 AND equipment_id = $2 ORDER BY expiry_date DESC',
            [clientId, equipmentId]
        );
    
        const currentExpiryDate = currentExpiryResult.rows.length > 0
            ? currentExpiryResult.rows[0].current_expiry_date
            : null;
    
        const previousExpiryDates = historyResult.rows.map(row => row.expiry_date);
    
        // Vratite podatke kao objekat
        return {
            current_expiry_date: currentExpiryDate,
            previous_expiry_dates: previousExpiryDates
        };
    } catch (error) {
        console.error('Error fetching calibration expiries:', error);
        throw new Error('Error fetching calibration expiries');
    }
};

