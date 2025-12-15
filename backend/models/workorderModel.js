import { pool } from "../libs/database.js";

export const getAllWorkOrders = async () => {
    try {
        // Dohvati sve work ordere zajedno s projektom i klijentom
        const result = await pool.query(`
            SELECT wo.*, 
                   p.name AS project_name, 
                   c.company_name AS client_name
            FROM work_orders wo
            JOIN projects p ON wo.project_id = p.id
            JOIN clients c ON p.client_id = c.id
            ORDER BY wo.created_at DESC
        `);

        const workOrders = result.rows;

        // Dohvati sve korisnike
        const usersRes = await pool.query(`SELECT id, firstname, lastname FROM users`);
        const users = usersRes.rows;

        // Mapiraj assigned_to ID-jeve u stvarne korisnike
        const workOrdersWithUsers = workOrders.map(wo => {
            // assigned_to je već niz brojeva jer je jsonb
            const assignedIds = wo.assigned_to || [];

            // Filter korisnika po ID-jevima
            const assigned_users = users.filter(u => assignedIds.includes(u.id));

            return { ...wo, assigned_users };
        });

        return workOrdersWithUsers;
    } catch (error) {
        console.error('Error fetching work orders:', error);
        throw error;
    }
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
export const createWorkOrder = async (project_id, type, title, description, assigned_to, planned_date, start_date, end_date, status) => {
    const result = await pool.query(
        `INSERT INTO work_orders 
        (project_id, type, title, description, assigned_to, planned_date, start_date, end_date, status) 
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [project_id, type, title, description,  JSON.stringify(assigned_to), planned_date, start_date, end_date, status]
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
