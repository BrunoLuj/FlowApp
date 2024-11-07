import { pool } from "../libs/database.js";

export const getAllClients = async () => {
    const result = await pool.query('SELECT * FROM clients');
    return result.rows;
};

export const getClientById = async (id) => {
    const result = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);
    return result.rows[0]; // Vraća prvi red (klijenta) ili undefined ako ne postoji
};

export const createClient = async (company_name, contact_person, email, phone, address, idbroj, pdvbroj, sttn_broj, status, description, logo) => {
    try {
        const result = await pool.query(
            'INSERT INTO clients (company_name, contact_person, email, phone, address, idbroj, pdvbroj, sttn_broj, status, description, logo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
            [company_name, contact_person, email, phone, address, idbroj, pdvbroj, sttn_broj, status, description, logo]
        );
        return result.rows[0];
    } catch (error) {
        console.error('Error updating client:', error);
        throw error;
    }
};

export const updateClient = async (id, company_name, contact_person, email, phone, address, idbroj, pdvbroj, sttn_broj, status, description, logo ) => {
    try {
        const result = await pool.query('UPDATE clients SET company_name = $1, contact_person = $2, email = $3, phone = $4, address = $5, idbroj = $6, pdvbroj = $7, sttn_broj = $8, status = $9, description = $10, logo = $11 WHERE id = $12 RETURNING *', [company_name, contact_person, email, phone, address, idbroj, pdvbroj, sttn_broj, status, description, logo, id]);
        return result.rows[0];
    } catch (error) {
        console.error('Error updating client:', error);
        throw error;
    }
};

export const deleteClient = async (id) => {
    const result = await pool.query('DELETE FROM clients WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
};