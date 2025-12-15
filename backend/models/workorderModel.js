import { pool } from "../libs/database.js";

// Dohvati sve work ordere
export const getAllWorkOrders = async () => {
    const result = await pool.query(`
        SELECT wo.*, p.name AS project_name, c.company_name AS client_name
        FROM work_orders wo
        JOIN projects p ON wo.project_id = p.id
        JOIN clients c ON p.client_id = c.id
        ORDER BY wo.created_at DESC
    `);
    return result.rows;
};

// Dohvati samo active work ordere (status != Completed)
export const getActiveWorkOrders = async () => {
    const result = await pool.query(`
        SELECT wo.*, p.name AS project_name, c.name AS client_name
        FROM work_orders wo
        JOIN projects p ON wo.project_id = p.id
        JOIN clients c ON p.client_id = c.id
        WHERE wo.status != 'Completed'
        ORDER BY wo.planned_date ASC
    `);
    return result.rows;
};

// Kreiranje novog work ordera
export const createWorkOrder = async (project_id, type, title, description, assigned_to, planned_date) => {
    const result = await pool.query(
        `INSERT INTO work_orders 
        (project_id, type, title, description, assigned_to, planned_date) 
        VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [project_id, type, title, description, assigned_to, planned_date]
    );
    return result.rows[0];
};

// Update postojećeg work ordera
export const updateWorkOrder = async (id, project_id, type, title, description, assigned_to, planned_date, status) => {
    const result = await pool.query(
        `UPDATE work_orders
         SET project_id=$1, type=$2, title=$3, description=$4, assigned_to=$5, planned_date=$6, status=$7, updated_at=NOW()
         WHERE id=$8 RETURNING *`,
         [project_id, type, title, description, assigned_to, planned_date, status, id]
    );
    return result.rows[0];
};

// Brisanje work ordera
export const deleteWorkOrder = async (id) => {
    const result = await pool.query(
        `DELETE FROM work_orders WHERE id=$1 RETURNING *`,
        [id]
    );
    return result.rows[0];
};
