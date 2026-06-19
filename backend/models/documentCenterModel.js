import { pool } from "../libs/database.js";

const buildFilters = (filters, clientId) => {
    const values = [];
    const conditions = ["d.is_current = TRUE"];
    const add = (value) => {
        values.push(value);
        return `$${values.length}`;
    };

    if (clientId) conditions.push(`d.client_id = ${add(clientId)}`);
    if (filters.client_id) conditions.push(`d.client_id = ${add(filters.client_id)}`);
    if (filters.station_id) conditions.push(`d.station_id = ${add(filters.station_id)}`);
    if (filters.document_type) conditions.push(`d.document_type = ${add(filters.document_type)}`);
    if (filters.visibility === "client") conditions.push("d.visible_to_client = TRUE");
    if (filters.visibility === "internal") conditions.push("d.visible_to_client = FALSE");
    if (filters.status === "expired") conditions.push("d.valid_until < CURRENT_DATE");
    if (filters.status === "expiring") {
        conditions.push("d.valid_until BETWEEN CURRENT_DATE AND CURRENT_DATE + 60");
    }
    if (filters.status === "valid") {
        conditions.push("(d.valid_until IS NULL OR d.valid_until > CURRENT_DATE + 60)");
    }
    if (filters.search?.trim()) {
        const search = add(`%${filters.search.trim()}%`);
        conditions.push(`(
            d.title ILIKE ${search} OR d.document_number ILIKE ${search}
            OR d.file_name ILIKE ${search} OR c.company_name ILIKE ${search}
            OR p.name ILIKE ${search}
        )`);
    }
    return { values, where: `WHERE ${conditions.join(" AND ")}` };
};

export const getDocumentCenter = async (filters = {}, clientId = null) => {
    const { values, where } = buildFilters(filters, clientId);
    const [documents, summary, types, clients, stations] = await Promise.all([
        pool.query(
            `SELECT d.id, d.client_id, d.station_id, d.asset_id, d.document_type,
                    d.title, d.document_number, d.file_name, d.mime_type, d.file_size,
                    d.issued_at, d.valid_until, d.visible_to_client, d.version_number,
                    d.parent_document_id, d.tags, d.created_at,
                    c.company_name AS client_name, p.name AS station_name,
                    ea.name AS asset_name,
                    CASE
                        WHEN d.valid_until < CURRENT_DATE THEN 'expired'
                        WHEN d.valid_until <= CURRENT_DATE + 60 THEN 'expiring'
                        ELSE 'valid'
                    END AS validity_status,
                    CASE WHEN d.valid_until IS NULL THEN NULL
                         ELSE (d.valid_until - CURRENT_DATE)::integer END AS days_remaining
             FROM documents d
             JOIN clients c ON c.id = d.client_id
             LEFT JOIN projects p ON p.id = d.station_id
             LEFT JOIN equipment_assets ea ON ea.id = d.asset_id
             ${where}
             ORDER BY d.valid_until NULLS LAST, d.created_at DESC
             LIMIT 500`,
            values
        ),
        pool.query(
            `SELECT
                COUNT(*) FILTER (WHERE is_current = TRUE)::integer AS total,
                COUNT(*) FILTER (WHERE is_current = TRUE AND valid_until < CURRENT_DATE)::integer AS expired,
                COUNT(*) FILTER (WHERE is_current = TRUE AND valid_until BETWEEN CURRENT_DATE AND CURRENT_DATE + 60)::integer AS expiring,
                COUNT(*) FILTER (WHERE is_current = TRUE AND visible_to_client = TRUE)::integer AS client_visible
             FROM documents
             ${clientId ? "WHERE client_id = $1" : ""}`,
            clientId ? [clientId] : []
        ),
        pool.query(
            `SELECT DISTINCT document_type FROM documents
             WHERE is_current = TRUE ${clientId ? "AND client_id = $1" : ""}
             ORDER BY document_type`,
            clientId ? [clientId] : []
        ),
        clientId
            ? pool.query("SELECT id, company_name FROM clients WHERE id = $1", [clientId])
            : pool.query("SELECT id, company_name FROM clients ORDER BY company_name"),
        pool.query(
            `SELECT id, name, client_id FROM projects
             ${clientId ? "WHERE client_id = $1" : ""}
             ORDER BY name`,
            clientId ? [clientId] : []
        ),
    ]);

    return {
        documents: documents.rows,
        summary: summary.rows[0],
        filters: {
            types: types.rows.map((row) => row.document_type),
            clients: clients.rows,
            stations: stations.rows,
        },
    };
};

export const getDocumentVersions = async (documentId, clientId = null) => {
    const rootResult = await pool.query(
        `SELECT COALESCE(parent_document_id, id) AS root_id
         FROM documents
         WHERE id = $1 ${clientId ? "AND client_id = $2" : ""}`,
        clientId ? [documentId, clientId] : [documentId]
    );
    if (!rootResult.rows[0]) return null;
    const rootId = rootResult.rows[0].root_id;
    const result = await pool.query(
        `SELECT d.id, d.title, d.file_name, d.mime_type, d.file_size,
                d.version_number, d.is_current, d.created_at, d.archived_at,
                CONCAT(u.firstname, ' ', u.lastname) AS uploaded_by_name
         FROM documents d
         LEFT JOIN users u ON u.id = d.uploaded_by
         WHERE (d.id = $1 OR d.parent_document_id = $1)
           ${clientId ? "AND d.client_id = $2" : ""}
         ORDER BY d.version_number DESC`,
        clientId ? [rootId, clientId] : [rootId]
    );
    return result.rows;
};

export const createDocumentVersion = async (documentId, data, user) => {
    const connection = await pool.connect();
    try {
        await connection.query("BEGIN");
        const currentResult = await connection.query(
            `SELECT * FROM documents
             WHERE id = $1 AND is_current = TRUE
               ${user.clientId ? "AND client_id = $2" : ""}
             FOR UPDATE`,
            user.clientId ? [documentId, user.clientId] : [documentId]
        );
        const current = currentResult.rows[0];
        if (!current) {
            await connection.query("ROLLBACK");
            return null;
        }
        const rootId = current.parent_document_id || current.id;

        await connection.query(
            `UPDATE documents SET is_current = FALSE, archived_at = NOW(), updated_at = NOW()
             WHERE id = $1`,
            [current.id]
        );
        const result = await connection.query(
            `INSERT INTO documents (
                client_id, station_id, asset_id, service_request_id, document_type,
                title, document_number, file_name, storage_key, mime_type, file_size,
                issued_at, valid_until, visible_to_client, uploaded_by,
                parent_document_id, version_number, is_current, tags
             ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,TRUE,$18
             ) RETURNING *`,
            [
                current.client_id, current.station_id, current.asset_id,
                current.service_request_id, current.document_type,
                data.title || current.title, data.document_number || current.document_number,
                data.file_name, data.storage_key, data.mime_type, data.file_size,
                data.issued_at || current.issued_at, data.valid_until || current.valid_until,
                data.visible_to_client ?? current.visible_to_client, user.userId,
                rootId, current.version_number + 1,
                Array.isArray(data.tags) ? data.tags : current.tags,
            ]
        );
        await connection.query(
            `UPDATE compliance_deadlines
             SET document_id = $1,
                 due_date = COALESCE($2, due_date),
                 status = 'active',
                 completed_at = NULL,
                 last_reminder_days = NULL,
                 last_reminder_at = NULL,
                 updated_at = NOW()
             WHERE document_id = $3`,
            [result.rows[0].id, data.valid_until || null, current.id]
        );
        await connection.query("COMMIT");
        return result.rows[0];
    } catch (error) {
        await connection.query("ROLLBACK");
        throw error;
    } finally {
        connection.release();
    }
};
