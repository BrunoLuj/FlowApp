import { pool } from "../libs/database.js";

const scope = (clientId, alias = "") => {
    const column = alias ? `${alias}.client_id` : "client_id";
    return clientId ? { clause: `WHERE ${column} = $1`, values: [clientId] } : { clause: "", values: [] };
};

export const getDashboard = async (clientId = null) => {
    const clientScope = scope(clientId);
    const deadlineScope = scope(clientId, "d");
    const requestScope = scope(clientId, "sr");
    const stationScope = scope(clientId, "p");

    const [
        clientsResult,
        stationsResult,
        assetsResult,
        requestsResult,
        workOrdersResult,
        deadlinesResult,
        recentRequestsResult,
        stationListResult,
    ] = await Promise.all([
        clientId
            ? pool.query("SELECT COUNT(*)::int AS count FROM clients WHERE id = $1", [clientId])
            : pool.query("SELECT COUNT(*)::int AS count FROM clients WHERE status = TRUE"),
        pool.query(
            `SELECT COUNT(*)::int AS count FROM projects p ${stationScope.clause}
             ${stationScope.clause ? "AND" : "WHERE"} COALESCE(p.active, TRUE) = TRUE`,
            stationScope.values
        ),
        pool.query(
            `SELECT (
                (SELECT COUNT(*) FROM equipment_assets ${clientScope.clause}) +
                (SELECT COUNT(*) FROM sonda ${clientScope.clause}) +
                (SELECT COUNT(*) FROM volumeters ${clientScope.clause}) +
                (SELECT COUNT(*) FROM rezervoar ${clientScope.clause}) +
                (SELECT COUNT(*) FROM mjerna_letva ${clientScope.clause})
            )::int AS count`,
            clientScope.values
        ),
        pool.query(
            `SELECT COUNT(*)::int AS count
             FROM service_requests sr
             ${requestScope.clause}
             ${requestScope.clause ? "AND" : "WHERE"} sr.status NOT IN ('resolved', 'cancelled')`,
            requestScope.values
        ),
        pool.query(
            `SELECT COUNT(*)::int AS count
             FROM work_orders wo
             JOIN projects p ON p.id = COALESCE(wo.station_id, wo.project_id)
             ${stationScope.clause}
             ${stationScope.clause ? "AND" : "WHERE"} LOWER(COALESCE(wo.status, '')) NOT IN ('completed', 'završen', 'zavrsen')`,
            stationScope.values
        ),
        pool.query(
            `SELECT d.id, d.title, d.deadline_type, d.due_date, d.warning_days,
                    c.company_name AS client_name, p.name AS station_name,
                    (d.due_date - CURRENT_DATE)::int AS days_remaining
             FROM compliance_deadlines d
             JOIN clients c ON c.id = d.client_id
             LEFT JOIN projects p ON p.id = d.station_id
             ${deadlineScope.clause}
             ${deadlineScope.clause ? "AND" : "WHERE"} d.status = 'active'
             AND d.due_date <= CURRENT_DATE + GREATEST(d.warning_days, 60)
             ORDER BY d.due_date ASC
             LIMIT 12`,
            deadlineScope.values
        ),
        pool.query(
            `SELECT sr.id, sr.request_number, sr.subject, sr.priority, sr.status, sr.created_at,
                    c.company_name AS client_name, p.name AS station_name
             FROM service_requests sr
             JOIN clients c ON c.id = sr.client_id
             LEFT JOIN projects p ON p.id = sr.station_id
             ${requestScope.clause}
             ORDER BY sr.created_at DESC
             LIMIT 8`,
            requestScope.values
        ),
        pool.query(
            `SELECT p.id, p.name, p.city, p.address, p.active, p.station_code,
                    c.company_name AS client_name,
                    COUNT(ea.id)::int AS registered_assets
             FROM projects p
             JOIN clients c ON c.id = p.client_id
             LEFT JOIN equipment_assets ea ON ea.station_id = p.id
             ${stationScope.clause}
             GROUP BY p.id, c.company_name
             ORDER BY c.company_name, p.name
             LIMIT 8`,
            stationScope.values
        ),
    ]);

    const deadlines = deadlinesResult.rows;

    return {
        stats: {
            clients: clientsResult.rows[0].count,
            stations: stationsResult.rows[0].count,
            assets: assetsResult.rows[0].count,
            openRequests: requestsResult.rows[0].count,
            activeWorkOrders: workOrdersResult.rows[0].count,
            overdueDeadlines: deadlines.filter((item) => item.days_remaining < 0).length,
        },
        deadlines,
        recentRequests: recentRequestsResult.rows,
        stations: stationListResult.rows,
    };
};

export const getStations = async (clientId = null) => {
    const stationScope = scope(clientId, "p");
    const result = await pool.query(
        `SELECT p.*, c.company_name AS client_name,
                COUNT(ea.id)::int AS registered_assets
         FROM projects p
         JOIN clients c ON c.id = p.client_id
         LEFT JOIN equipment_assets ea ON ea.station_id = p.id
         ${stationScope.clause}
         GROUP BY p.id, c.company_name
         ORDER BY c.company_name, p.name`,
        stationScope.values
    );
    return result.rows;
};

export const getStationById = async (stationId, clientId = null) => {
    const values = [stationId];
    let clientCondition = "";

    if (clientId) {
        values.push(clientId);
        clientCondition = `AND p.client_id = $${values.length}`;
    }

    const stationResult = await pool.query(
        `SELECT p.*, c.company_name AS client_name, c.contact_person,
                c.email AS client_email, c.phone AS client_phone
         FROM projects p
         JOIN clients c ON c.id = p.client_id
         WHERE p.id = $1 ${clientCondition}`,
        values
    );

    if (!stationResult.rows[0]) return null;

    const [assets, requests, workOrders, documents, deadlines] = await Promise.all([
        pool.query(
            `SELECT * FROM equipment_assets
             WHERE station_id = $1
             ORDER BY category, name`,
            [stationId]
        ),
        pool.query(
            `SELECT sr.*, CONCAT(u.firstname, ' ', u.lastname) AS assigned_to_name
             FROM service_requests sr
             LEFT JOIN users u ON u.id = sr.assigned_to
             WHERE sr.station_id = $1
             ORDER BY sr.created_at DESC
             LIMIT 20`,
            [stationId]
        ),
        pool.query(
            `SELECT wo.*, sr.request_number
             FROM work_orders wo
             LEFT JOIN service_requests sr ON sr.id = wo.service_request_id
             WHERE COALESCE(wo.station_id, wo.project_id) = $1
             ORDER BY wo.created_at DESC
             LIMIT 20`,
            [stationId]
        ),
        pool.query(
            `SELECT id, title, document_type, document_number, file_name,
                    issued_at, valid_until, visible_to_client, created_at
             FROM documents
             WHERE station_id = $1
             ${clientId ? "AND visible_to_client = TRUE" : ""}
             ORDER BY created_at DESC
             LIMIT 20`,
            [stationId]
        ),
        pool.query(
            `SELECT id, title, deadline_type, due_date, warning_days, status,
                    (due_date - CURRENT_DATE)::int AS days_remaining
             FROM compliance_deadlines
             WHERE station_id = $1 AND status = 'active'
             ORDER BY due_date ASC`,
            [stationId]
        ),
    ]);

    return {
        station: stationResult.rows[0],
        assets: assets.rows,
        requests: requests.rows,
        workOrders: workOrders.rows,
        documents: documents.rows,
        deadlines: deadlines.rows,
        summary: {
            assets: assets.rowCount,
            openRequests: requests.rows.filter((item) => !["resolved", "cancelled"].includes(item.status)).length,
            activeWorkOrders: workOrders.rows.filter((item) => !["Completed", "Cancelled"].includes(item.status)).length,
            upcomingDeadlines: deadlines.rowCount,
        },
    };
};

export const createAsset = async (stationId, data, clientId = null) => {
    const stationValues = [stationId];
    let clientCondition = "";
    if (clientId) {
        stationValues.push(clientId);
        clientCondition = `AND client_id = $${stationValues.length}`;
    }

    const station = await pool.query(
        `SELECT id, client_id FROM projects WHERE id = $1 ${clientCondition}`,
        stationValues
    );
    if (!station.rows[0]) return null;

    const result = await pool.query(
        `INSERT INTO equipment_assets (
            client_id, station_id, asset_code, category, name, manufacturer, model,
            serial_number, official_mark, fuel_type, status, criticality,
            location_description, installed_at, last_service_at, next_service_at,
            last_calibration_at, calibration_expires_at, warranty_expires_at, notes, metadata
         ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
            $15, $16, $17, $18, $19, $20, $21
         ) RETURNING *`,
        [
            station.rows[0].client_id,
            stationId,
            data.asset_code || null,
            data.category,
            data.name,
            data.manufacturer || null,
            data.model || null,
            data.serial_number || null,
            data.official_mark || null,
            data.fuel_type || null,
            data.status || "active",
            data.criticality || "normal",
            data.location_description || null,
            data.installed_at || null,
            data.last_service_at || null,
            data.next_service_at || null,
            data.last_calibration_at || null,
            data.calibration_expires_at || null,
            data.warranty_expires_at || null,
            data.notes || null,
            data.metadata || {},
        ]
    );
    return result.rows[0];
};

export const updateAsset = async (assetId, data, clientId = null) => {
    const values = [
        data.asset_code || null,
        data.category,
        data.name,
        data.manufacturer || null,
        data.model || null,
        data.serial_number || null,
        data.official_mark || null,
        data.fuel_type || null,
        data.status || "active",
        data.criticality || "normal",
        data.location_description || null,
        data.next_service_at || null,
        data.calibration_expires_at || null,
        data.warranty_expires_at || null,
        data.notes || null,
        assetId,
    ];
    let clientCondition = "";
    if (clientId) {
        values.push(clientId);
        clientCondition = `AND client_id = $${values.length}`;
    }

    const result = await pool.query(
        `UPDATE equipment_assets SET
            asset_code = $1, category = $2, name = $3, manufacturer = $4,
            model = $5, serial_number = $6, official_mark = $7, fuel_type = $8,
            status = $9, criticality = $10, location_description = $11,
            next_service_at = $12, calibration_expires_at = $13,
            warranty_expires_at = $14, notes = $15, updated_at = NOW()
         WHERE id = $16 ${clientCondition}
         RETURNING *`,
        values
    );
    return result.rows[0];
};

export const deleteAsset = async (assetId, clientId = null) => {
    const values = [assetId];
    let clientCondition = "";
    if (clientId) {
        values.push(clientId);
        clientCondition = `AND client_id = $${values.length}`;
    }
    const result = await pool.query(
        `DELETE FROM equipment_assets WHERE id = $1 ${clientCondition} RETURNING id`,
        values
    );
    return result.rows[0];
};

export const createDocument = async (stationId, data, user) => {
    const values = [stationId];
    let clientCondition = "";
    if (user.clientId) {
        values.push(user.clientId);
        clientCondition = `AND client_id = $${values.length}`;
    }
    const stationResult = await pool.query(
        `SELECT id, client_id FROM projects WHERE id = $1 ${clientCondition}`,
        values
    );
    const station = stationResult.rows[0];
    if (!station) return null;

    const result = await pool.query(
        `INSERT INTO documents (
            client_id, station_id, asset_id, document_type, title,
            document_number, file_name, storage_key, mime_type, file_size,
            issued_at, valid_until, visible_to_client, uploaded_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *`,
        [
            station.client_id,
            stationId,
            data.asset_id || null,
            data.document_type,
            data.title,
            data.document_number || null,
            data.file_name,
            data.storage_key || data.file_name,
            data.mime_type || null,
            data.file_size || null,
            data.issued_at || null,
            data.valid_until || null,
            data.visible_to_client !== false,
            user.userId,
        ]
    );
    return result.rows[0];
};

export const deleteDocument = async (documentId, clientId = null) => {
    const values = [documentId];
    let clientCondition = "";
    if (clientId) {
        values.push(clientId);
        clientCondition = `AND client_id = $${values.length}`;
    }
    const result = await pool.query(
        `DELETE FROM documents WHERE id = $1 ${clientCondition}
         RETURNING id, storage_key`,
        values
    );
    return result.rows[0];
};

export const getDocumentById = async (documentId, clientId = null) => {
    const values = [documentId];
    let clientCondition = "";
    if (clientId) {
        values.push(clientId);
        clientCondition = `AND client_id = $${values.length} AND visible_to_client = TRUE`;
    }
    const result = await pool.query(
        `SELECT * FROM documents WHERE id = $1 ${clientCondition}`,
        values
    );
    return result.rows[0];
};

export const createDeadline = async (stationId, data, user) => {
    const values = [stationId];
    let clientCondition = "";
    if (user.clientId) {
        values.push(user.clientId);
        clientCondition = `AND client_id = $${values.length}`;
    }
    const stationResult = await pool.query(
        `SELECT id, client_id FROM projects WHERE id = $1 ${clientCondition}`,
        values
    );
    const station = stationResult.rows[0];
    if (!station) return null;

    const result = await pool.query(
        `INSERT INTO compliance_deadlines (
            client_id, station_id, asset_id, document_id, deadline_type,
            title, due_date, warning_days, notes
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
            station.client_id,
            stationId,
            data.asset_id || null,
            data.document_id || null,
            data.deadline_type,
            data.title,
            data.due_date,
            Number(data.warning_days) || 30,
            data.notes || null,
        ]
    );
    return result.rows[0];
};

export const updateDeadline = async (deadlineId, data, user) => {
    const values = [
        data.deadline_type,
        data.title,
        data.due_date,
        data.warning_days == null ? null : Number(data.warning_days),
        data.notes || null,
        data.status,
        data.status === "completed" ? new Date() : null,
        deadlineId,
    ];
    let clientCondition = "";
    if (user.clientId) {
        values.push(user.clientId);
        clientCondition = `AND client_id = $${values.length}`;
    }

    const result = await pool.query(
        `UPDATE compliance_deadlines SET
            deadline_type = COALESCE($1, deadline_type),
            title = COALESCE($2, title),
            due_date = COALESCE($3, due_date),
            warning_days = COALESCE($4, warning_days),
            notes = COALESCE($5, notes),
            status = COALESCE($6, status),
            completed_at = CASE
                WHEN $6 = 'completed' THEN COALESCE(completed_at, $7)
                WHEN $6 = 'active' THEN NULL
                ELSE completed_at
            END,
            updated_at = NOW()
         WHERE id = $8 ${clientCondition}
         RETURNING *`,
        values
    );
    return result.rows[0];
};

export const deleteDeadline = async (deadlineId, clientId = null) => {
    const values = [deadlineId];
    let clientCondition = "";
    if (clientId) {
        values.push(clientId);
        clientCondition = `AND client_id = $${values.length}`;
    }
    const result = await pool.query(
        `DELETE FROM compliance_deadlines WHERE id = $1 ${clientCondition} RETURNING id`,
        values
    );
    return result.rows[0];
};
