import { pool } from "../libs/database.js";

const getParent = async (type, id, clientId = null) => {
    const values = [id];
    let clientCondition = "";
    if (clientId) {
        values.push(clientId);
        clientCondition = `AND client_id = $${values.length}`;
    }

    if (type === "service-request") {
        const result = await pool.query(
            `SELECT id, client_id, station_id
             FROM service_requests
             WHERE id = $1 ${clientCondition}`,
            values
        );
        return result.rows[0];
    }

    if (type === "work-order") {
        const result = await pool.query(
            `SELECT wo.id, p.client_id, COALESCE(wo.station_id, wo.project_id) AS station_id
             FROM work_orders wo
             JOIN projects p ON p.id = COALESCE(wo.station_id, wo.project_id)
             WHERE wo.id = $1
             ${clientId ? `AND p.client_id = $${values.length}` : ""}`,
            values
        );
        return result.rows[0];
    }

    return null;
};

export const createAttachment = async (type, parentId, data, user) => {
    const parent = await getParent(type, parentId, user.clientId);
    if (!parent) return null;

    const result = await pool.query(
        `INSERT INTO entity_attachments (
            client_id, station_id, service_request_id, work_order_id,
            title, file_name, storage_key, mime_type, file_size,
            visible_to_client, uploaded_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
            parent.client_id,
            parent.station_id,
            type === "service-request" ? parent.id : null,
            type === "work-order" ? parent.id : null,
            data.title || data.file_name,
            data.file_name,
            data.storage_key,
            data.mime_type,
            data.file_size,
            user.clientId ? true : data.visible_to_client !== false,
            user.userId,
        ]
    );
    return result.rows[0];
};

export const getAttachmentById = async (id, clientId = null) => {
    const values = [id];
    let clientCondition = "";
    if (clientId) {
        values.push(clientId);
        clientCondition = `AND client_id = $${values.length} AND visible_to_client = TRUE`;
    }
    const result = await pool.query(
        `SELECT * FROM entity_attachments WHERE id = $1 ${clientCondition}`,
        values
    );
    return result.rows[0];
};

export const deleteAttachment = async (id, clientId = null) => {
    const values = [id];
    let clientCondition = "";
    if (clientId) {
        values.push(clientId);
        clientCondition = `AND client_id = $${values.length}`;
    }
    const result = await pool.query(
        `DELETE FROM entity_attachments WHERE id = $1 ${clientCondition}
         RETURNING id, storage_key`,
        values
    );
    return result.rows[0];
};
