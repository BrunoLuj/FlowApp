import { pool } from "../libs/database.js";

export const getAllClients = async () => {
    const result = await pool.query('SELECT * FROM clients');
    return result.rows;
};

export const createClient = async (company_name, contact_person, email, phone, address, idbroj, pdvbroj, sttn_broj, status ) => {
   try{
        const result = await pool.query(
            'INSERT INTO clients (company_name, contact_person, email, phone, address, idbroj, pdvbroj, sttn_broj, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
            [company_name, contact_person, email, phone, address, idbroj, pdvbroj, sttn_broj, status ]
        );
        return result.rows[0];
   }catch(error){
    console.error('Error updating client:', error);
    throw error;
   }
    
};

export const updateClient = async (id, company_name, contact_person, email, phone, address, idbroj, pdvbroj, sttn_broj, status ) => {
    try {
        const result = await pool.query('UPDATE clients SET company_name = $1, contact_person = $2, email = $3, phone = $4, address = $5, idbroj = $6, pdvbroj = $7, sttn_broj = $8, status = $9 WHERE id = $10 RETURNING *', [company_name, contact_person, email, phone, address, idbroj, pdvbroj, sttn_broj, status , id]);
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