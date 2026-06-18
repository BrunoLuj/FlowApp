import { pool } from "../libs/database.js";

export const getServiceRequests = async ({ clientId, status, priority, stationId }) => {
    const conditions = [];
    const values = [];

    const addCondition = (sql, value) => {
        values.push(value);
        conditions.push(sql.replace("?", `$${values.length}`));
    };

    if (clientId) addCondition("sr.client_id = ?", clientId);
    if (status) addCondition("sr.status = ?", status);
    if (priority) addCondition("sr.priority = ?", priority);
    if (stationId) addCondition("sr.station_id = ?", stationId);

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await pool.query(
        `SELECT sr.*, c.company_name AS client_name, p.name AS station_name,
                CONCAT(u.firstname, ' ', u.lastname) AS assigned_to_name
         FROM service_requests sr
         JOIN clients c ON c.id = sr.client_id
         LEFT JOIN projects p ON p.id = sr.station_id
         LEFT JOIN users u ON u.id = sr.assigned_to
         ${where}
         ORDER BY
            CASE sr.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
            sr.created_at DESC`,
        values
    );
    return result.rows;
};

export const createServiceRequest = async (data, user) => {
    const clientId = user.clientId ?? data.client_id;
    const result = await pool.query(
        `INSERT INTO service_requests
            (client_id, station_id, asset_id, requested_by, category, priority, subject, description, desired_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
            clientId,
            data.station_id || null,
            data.asset_id || null,
            user.userId,
            data.category || "service",
            data.priority || "normal",
            data.subject,
            data.description,
            data.desired_date || null,
        ]
    );

    const request = result.rows[0];
    await pool.query(
        `INSERT INTO audit_logs(user_id, client_id, entity_type, entity_id, action, summary)
         VALUES ($1, $2, 'service_request', $3, 'created', $4)`,
        [user.userId, clientId, String(request.id), `Created ${request.request_number}: ${request.subject}`]
    );
    return request;
};

export const updateServiceRequest = async (id, data, clientId = null) => {
    const values = [
        data.status,
        data.priority,
        data.assigned_to || null,
        data.scheduled_at || null,
        data.status === "resolved" ? new Date() : null,
        id,
    ];
    let clientCondition = "";

    if (clientId) {
        values.push(clientId);
        clientCondition = `AND client_id = $${values.length}`;
    }

    const result = await pool.query(
        `UPDATE service_requests
         SET status = COALESCE($1, status),
             priority = COALESCE($2, priority),
             assigned_to = COALESCE($3, assigned_to),
             scheduled_at = COALESCE($4, scheduled_at),
             resolved_at = COALESCE($5, resolved_at),
             updated_at = NOW()
         WHERE id = $6 ${clientCondition}
         RETURNING *`,
        values
    );
    return result.rows[0];
};
