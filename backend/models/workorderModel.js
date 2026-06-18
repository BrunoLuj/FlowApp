import { pool } from "../libs/database.js";

export const getAllWorkOrders = async (clientId = null) => {
    try {
        // Dohvati sve work ordere zajedno s projektom i klijentom
        const result = await pool.query(`
            SELECT wo.*, 
                   p.name AS project_name, 
                   c.company_name AS client_name
            FROM work_orders wo
            JOIN projects p ON COALESCE(wo.station_id, wo.project_id) = p.id
            JOIN clients c ON p.client_id = c.id
            ${clientId ? "WHERE p.client_id = $1" : ""}
            ORDER BY wo.created_at DESC
        `, clientId ? [clientId] : []);

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
export const getActiveWorkOrders = async (clientId = null) => {
    const result = await pool.query(`
        SELECT wo.*, p.name AS project_name, c.company_name AS client_name
        FROM work_orders wo
        JOIN projects p ON COALESCE(wo.station_id, wo.project_id) = p.id
        JOIN clients c ON p.client_id = c.id
        WHERE wo.status != 'Completed'
        ${clientId ? "AND p.client_id = $1" : ""}
        ORDER BY wo.planned_date ASC
    `, clientId ? [clientId] : []);
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

export const getWorkOrderById = async (id, clientId = null) => {
    const values = [id];
    let clientCondition = "";
    if (clientId) {
        values.push(clientId);
        clientCondition = `AND p.client_id = $${values.length}`;
    }

    const orderResult = await pool.query(
        `SELECT wo.*, p.name AS station_name, p.address, p.city,
                c.company_name AS client_name, ea.name AS asset_name,
                sr.request_number
         FROM work_orders wo
         JOIN projects p ON p.id = COALESCE(wo.station_id, wo.project_id)
         JOIN clients c ON c.id = p.client_id
         LEFT JOIN equipment_assets ea ON ea.id = wo.asset_id
         LEFT JOIN service_requests sr ON sr.id = wo.service_request_id
         WHERE wo.id = $1 ${clientCondition}`,
        values
    );
    if (!orderResult.rows[0]) return null;

    const [activities, materials, checklist, users] = await Promise.all([
        pool.query(
            `SELECT a.*, CONCAT(u.firstname, ' ', u.lastname) AS user_name
             FROM work_order_activities a
             LEFT JOIN users u ON u.id = a.user_id
             WHERE a.work_order_id = $1 ORDER BY a.created_at DESC`,
            [id]
        ),
        pool.query(
            `SELECT * FROM work_order_materials
             WHERE work_order_id = $1 ORDER BY created_at DESC`,
            [id]
        ),
        pool.query(
            `SELECT * FROM work_order_checklist_items
             WHERE work_order_id = $1 ORDER BY sort_order, id`,
            [id]
        ),
        pool.query("SELECT id, firstname, lastname FROM users"),
    ]);

    const order = orderResult.rows[0];
    const assignedIds = Array.isArray(order.assigned_to) ? order.assigned_to : [];
    return {
        ...order,
        assigned_users: users.rows.filter((user) => assignedIds.includes(user.id)),
        activities: activities.rows,
        materials: materials.rows,
        checklist: checklist.rows,
    };
};

export const addWorkOrderActivity = async (workOrderId, data, userId) => {
    const result = await pool.query(
        `INSERT INTO work_order_activities (
            work_order_id, user_id, activity_type, description,
            started_at, ended_at, duration_minutes
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
            workOrderId,
            userId,
            data.activity_type || "work",
            data.description,
            data.started_at || null,
            data.ended_at || null,
            data.duration_minutes || null,
        ]
    );
    return result.rows[0];
};

export const addWorkOrderMaterial = async (workOrderId, data) => {
    const result = await pool.query(
        `INSERT INTO work_order_materials (
            work_order_id, item_name, quantity, unit, unit_cost, serial_number
         ) VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
            workOrderId,
            data.item_name,
            Number(data.quantity) || 1,
            data.unit || "kom",
            data.unit_cost || null,
            data.serial_number || null,
        ]
    );
    return result.rows[0];
};

export const addChecklistItem = async (workOrderId, data) => {
    const result = await pool.query(
        `INSERT INTO work_order_checklist_items (
            work_order_id, label, required, sort_order
         ) VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [workOrderId, data.label, Boolean(data.required), data.sort_order || 0]
    );
    return result.rows[0];
};

export const updateChecklistItem = async (workOrderId, itemId, data, userId) => {
    const result = await pool.query(
        `UPDATE work_order_checklist_items SET
            completed = $1,
            completed_by = CASE WHEN $1 THEN $2 ELSE NULL END,
            completed_at = CASE WHEN $1 THEN NOW() ELSE NULL END,
            notes = COALESCE($3, notes)
         WHERE id = $4 AND work_order_id = $5 RETURNING *`,
        [Boolean(data.completed), userId, data.notes || null, itemId, workOrderId]
    );
    return result.rows[0];
};

export const completeWorkOrder = async (id, data, userId) => {
    const result = await pool.query(
        `UPDATE work_orders SET
            status = 'Completed',
            end_date = COALESCE(end_date, CURRENT_DATE),
            completed_by = $1,
            completion_notes = $2,
            customer_signature_name = $3,
            customer_signed_at = CASE WHEN $3 IS NOT NULL THEN NOW() ELSE customer_signed_at END,
            updated_at = NOW()
         WHERE id = $4 RETURNING *`,
        [
            userId,
            data.completion_notes || null,
            data.customer_signature_name || null,
            id,
        ]
    );
    if (result.rows[0]?.service_request_id) {
        await pool.query(
            `UPDATE service_requests
             SET status = 'resolved', resolved_at = NOW(), updated_at = NOW()
             WHERE id = $1`,
            [result.rows[0].service_request_id]
        );
    }
    return result.rows[0];
};
