import { pool } from "../libs/database.js";

export const refreshSlaEscalations = async (clientId = null) => {
    const values = clientId ? [clientId] : [];
    const scope = clientId ? "AND client_id = $1" : "";
    await pool.query(
        `UPDATE service_requests
         SET response_breached_at = CASE
                 WHEN responded_at IS NULL
                  AND response_due_at < COALESCE(sla_paused_at, NOW())
                 THEN COALESCE(response_breached_at, response_due_at)
                 ELSE response_breached_at
             END,
             resolution_breached_at = CASE
                 WHEN resolution_due_at < COALESCE(sla_paused_at, NOW())
                 THEN COALESCE(resolution_breached_at, resolution_due_at)
                 ELSE resolution_breached_at
             END,
             escalation_level = GREATEST(
                 escalation_level,
                 CASE
                     WHEN resolution_due_at < COALESCE(sla_paused_at, NOW()) - INTERVAL '4 hours'
                       OR (
                           priority = 'urgent'
                           AND (
                               (responded_at IS NULL AND response_due_at < COALESCE(sla_paused_at, NOW()))
                               OR resolution_due_at < COALESCE(sla_paused_at, NOW())
                           )
                       ) THEN 2
                     WHEN (responded_at IS NULL AND response_due_at < COALESCE(sla_paused_at, NOW()))
                       OR resolution_due_at < COALESCE(sla_paused_at, NOW()) THEN 1
                     ELSE 0
                 END
             ),
             escalated_at = CASE
                 WHEN escalated_at IS NULL
                  AND (
                      (responded_at IS NULL AND response_due_at < COALESCE(sla_paused_at, NOW()))
                      OR resolution_due_at < COALESCE(sla_paused_at, NOW())
                  )
                 THEN NOW()
                 ELSE escalated_at
             END
         WHERE status NOT IN ('resolved', 'cancelled')
           ${scope}`,
        values
    );
};

const slaColumns = `
    CASE
        WHEN sr.status = 'waiting_client' THEN 'paused'
        WHEN sr.responded_at IS NULL AND sr.response_due_at < NOW() THEN 'response_breached'
        WHEN sr.resolution_due_at < NOW() THEN 'resolution_breached'
        WHEN sr.resolution_due_at <= NOW() + INTERVAL '8 hours' THEN 'at_risk'
        WHEN sr.resolution_due_at IS NOT NULL THEN 'on_track'
        ELSE 'not_defined'
    END AS sla_status,
    CASE WHEN sr.status = 'waiting_client' THEN sr.sla_paused_at ELSE NULL END AS sla_clock_stopped_at,
    EXTRACT(EPOCH FROM (sr.response_due_at - COALESCE(sr.sla_paused_at, NOW())))::bigint AS response_seconds_remaining,
    EXTRACT(EPOCH FROM (sr.resolution_due_at - COALESCE(sr.sla_paused_at, NOW())))::bigint AS resolution_seconds_remaining`;

export const getServiceRequests = async ({ clientId, status, priority, stationId }) => {
    await refreshSlaEscalations(clientId);
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
        `SELECT sr.*, ${slaColumns}, c.company_name AS client_name, p.name AS station_name,
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
    const contractResult = await pool.query(
        `SELECT sc.* FROM service_contracts sc
         LEFT JOIN contract_stations cs ON cs.contract_id = sc.id
         WHERE sc.client_id = $1
           AND sc.status = 'active'
           AND sc.start_date <= CURRENT_DATE
           AND (sc.end_date IS NULL OR sc.end_date >= CURRENT_DATE)
           AND ($2::int IS NULL OR cs.station_id = $2 OR NOT EXISTS (
                SELECT 1 FROM contract_stations covered
                WHERE covered.contract_id = sc.id
           ))
         ORDER BY
           CASE WHEN cs.station_id = $2 THEN 0 ELSE 1 END,
           sc.start_date DESC
         LIMIT 1`,
        [clientId, data.station_id || null]
    );
    const contract = contractResult.rows[0];
    const priority = data.priority || "normal";
    const responseHours = contract?.[`response_hours_${priority}`] || null;
    const resolutionHours = contract?.[`resolution_hours_${priority}`] || null;
    const result = await pool.query(
        `INSERT INTO service_requests
            (client_id, station_id, asset_id, requested_by, category, priority,
             subject, description, desired_date, service_contract_id,
             response_due_at, resolution_due_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
                 CASE WHEN $11::int IS NULL THEN NULL ELSE NOW() + MAKE_INTERVAL(hours => $11::int) END,
                 CASE WHEN $12::int IS NULL THEN NULL ELSE NOW() + MAKE_INTERVAL(hours => $12::int) END)
         RETURNING *`,
        [
            clientId,
            data.station_id || null,
            data.asset_id || null,
            user.userId,
            data.category || "service",
            priority,
            data.subject,
            data.description,
            data.desired_date || null,
            contract?.id || null,
            responseHours,
            resolutionHours,
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

export const updateServiceRequest = async (id, data, user) => {
    const connection = await pool.connect();
    try {
        await connection.query("BEGIN");
        const currentValues = [id];
        let scope = "";
        if (user.clientId) {
            currentValues.push(user.clientId);
            scope = `AND sr.client_id = $${currentValues.length}`;
        }
        const currentResult = await connection.query(
            `SELECT sr.*, sc.response_hours_normal, sc.response_hours_high,
                    sc.response_hours_urgent, sc.resolution_hours_normal,
                    sc.resolution_hours_high, sc.resolution_hours_urgent
             FROM service_requests sr
             LEFT JOIN service_contracts sc ON sc.id = sr.service_contract_id
             WHERE sr.id = $1 ${scope}
             FOR UPDATE OF sr`,
            currentValues
        );
        const current = currentResult.rows[0];
        if (!current) {
            await connection.query("ROLLBACK");
            return null;
        }

        const nextStatus = data.status || current.status;
        const nextPriority = data.priority || current.priority;
        const leavingPause = current.status === "waiting_client" && nextStatus !== "waiting_client";
        const enteringPause = current.status !== "waiting_client" && nextStatus === "waiting_client";
        const responseHours = current[`response_hours_${nextPriority}`]
            ?? current.response_hours_normal;
        const resolutionHours = current[`resolution_hours_${nextPriority}`]
            ?? current.resolution_hours_normal;

        const result = await connection.query(
            `UPDATE service_requests SET
                status = $1::varchar,
                priority = $2::varchar,
                assigned_to = CASE WHEN $3::boolean THEN $4::integer ELSE assigned_to END,
                scheduled_at = CASE WHEN $5::boolean THEN $6::timestamptz ELSE scheduled_at END,
                resolved_at = CASE
                    WHEN $1::varchar = 'resolved' THEN COALESCE(resolved_at, NOW())
                    WHEN $1::varchar <> 'resolved' THEN NULL
                    ELSE resolved_at
                END,
                sla_paused_seconds = sla_paused_seconds + CASE
                    WHEN $7::boolean AND sla_paused_at IS NOT NULL
                    THEN EXTRACT(EPOCH FROM (NOW() - sla_paused_at))::bigint
                    ELSE 0
                END,
                response_due_at = CASE
                    WHEN $8::boolean AND $9::int IS NOT NULL
                    THEN created_at + MAKE_INTERVAL(hours => $9::int)
                         + MAKE_INTERVAL(secs => sla_paused_seconds::double precision)
                         + CASE WHEN $7::boolean AND sla_paused_at IS NOT NULL
                             THEN NOW() - sla_paused_at ELSE INTERVAL '0 seconds' END
                    WHEN $7::boolean AND sla_paused_at IS NOT NULL AND response_due_at IS NOT NULL
                    THEN response_due_at + (NOW() - sla_paused_at)
                    ELSE response_due_at
                END,
                resolution_due_at = CASE
                    WHEN $8::boolean AND $10::int IS NOT NULL
                    THEN created_at + MAKE_INTERVAL(hours => $10::int)
                         + MAKE_INTERVAL(secs => sla_paused_seconds::double precision)
                         + CASE WHEN $7::boolean AND sla_paused_at IS NOT NULL
                             THEN NOW() - sla_paused_at ELSE INTERVAL '0 seconds' END
                    WHEN $7::boolean AND sla_paused_at IS NOT NULL AND resolution_due_at IS NOT NULL
                    THEN resolution_due_at + (NOW() - sla_paused_at)
                    ELSE resolution_due_at
                END,
                sla_paused_at = CASE
                    WHEN $11::boolean THEN NOW()
                    WHEN $7::boolean THEN NULL
                    ELSE sla_paused_at
                END,
                updated_at = NOW()
             WHERE id = $12
             RETURNING *`,
            [
                nextStatus,
                nextPriority,
                Object.prototype.hasOwnProperty.call(data, "assigned_to"),
                data.assigned_to || null,
                Object.prototype.hasOwnProperty.call(data, "scheduled_at"),
                data.scheduled_at || null,
                leavingPause,
                nextPriority !== current.priority,
                responseHours,
                resolutionHours,
                enteringPause,
                id,
            ]
        );
        const request = result.rows[0];
        await connection.query(
            `INSERT INTO audit_logs
                (user_id, client_id, entity_type, entity_id, action, summary, changes)
             VALUES ($1,$2,'service_request',$3,'sla_updated',$4,$5::jsonb)`,
            [
                user.userId,
                current.client_id,
                String(id),
                enteringPause
                    ? "SLA sat je pauziran dok se čeka klijenta"
                    : leavingPause
                        ? "SLA sat je nastavljen"
                        : "Ažuriran servisni zahtjev",
                JSON.stringify({
                    status: { from: current.status, to: nextStatus },
                    priority: { from: current.priority, to: nextPriority },
                    assigned_to: request.assigned_to,
                }),
            ]
        );
        await connection.query("COMMIT");
        return request;
    } catch (error) {
        await connection.query("ROLLBACK");
        throw error;
    } finally {
        connection.release();
    }
};

export const getServiceRequestById = async (id, clientId = null) => {
    await refreshSlaEscalations(clientId);
    const values = [id];
    let clientCondition = "";
    if (clientId) {
        values.push(clientId);
        clientCondition = `AND sr.client_id = $${values.length}`;
    }

    const requestResult = await pool.query(
        `SELECT sr.*, ${slaColumns}, c.company_name AS client_name, p.name AS station_name,
                ea.name AS asset_name, ea.asset_code, c.email AS client_email,
                CONCAT(assignee.firstname, ' ', assignee.lastname) AS assigned_to_name,
                CONCAT(requester.firstname, ' ', requester.lastname) AS requested_by_name
         FROM service_requests sr
         JOIN clients c ON c.id = sr.client_id
         LEFT JOIN projects p ON p.id = sr.station_id
         LEFT JOIN equipment_assets ea ON ea.id = sr.asset_id
         LEFT JOIN users assignee ON assignee.id = sr.assigned_to
         LEFT JOIN users requester ON requester.id = sr.requested_by
         WHERE sr.id = $1 ${clientCondition}`,
        values
    );
    if (!requestResult.rows[0]) return null;

    const [messages, attachments] = await Promise.all([
        pool.query(
        `SELECT m.*, CONCAT(u.firstname, ' ', u.lastname) AS author_name
         FROM service_request_messages m
         LEFT JOIN users u ON u.id = m.author_id
         WHERE m.service_request_id = $1
           ${clientId ? "AND m.internal_note = FALSE" : ""}
         ORDER BY m.created_at ASC`,
        [id]
        ),
        pool.query(
            `SELECT id, title, file_name, mime_type, file_size,
                    visible_to_client, created_at
             FROM entity_attachments
             WHERE service_request_id = $1
             ${clientId ? "AND visible_to_client = TRUE" : ""}
             ORDER BY created_at DESC`,
            [id]
        ),
    ]);

    return {
        ...requestResult.rows[0],
        messages: messages.rows,
        attachments: attachments.rows,
    };
};

export const addServiceRequestMessage = async (requestId, message, internalNote, user) => {
    const values = [requestId];
    let clientCondition = "";
    if (user.clientId) {
        values.push(user.clientId);
        clientCondition = `AND client_id = $${values.length}`;
    }
    const request = await pool.query(
        `SELECT id FROM service_requests WHERE id = $1 ${clientCondition}`,
        values
    );
    if (!request.rows[0]) return null;

    const result = await pool.query(
        `INSERT INTO service_request_messages
            (service_request_id, author_id, message, internal_note)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [requestId, user.userId, message, user.clientId ? false : Boolean(internalNote)]
    );
    if (!user.clientId) {
        await pool.query(
            `UPDATE service_requests
             SET responded_at = COALESCE(responded_at, NOW()), updated_at = NOW()
             WHERE id = $1`,
            [requestId]
        );
    }
    return result.rows[0];
};

export const convertServiceRequestToWorkOrder = async (requestId, data, user) => {
    const connection = await pool.connect();
    try {
        await connection.query("BEGIN");

        const requestValues = [requestId];
        let clientCondition = "";
        if (user.clientId) {
            requestValues.push(user.clientId);
            clientCondition = `AND client_id = $${requestValues.length}`;
        }

        const requestResult = await connection.query(
            `SELECT * FROM service_requests
             WHERE id = $1 ${clientCondition}
             FOR UPDATE`,
            requestValues
        );
        const request = requestResult.rows[0];
        if (!request) {
            await connection.query("ROLLBACK");
            return null;
        }
        if (request.converted_work_order_id) {
            await connection.query("ROLLBACK");
            return { alreadyConverted: true, workOrderId: request.converted_work_order_id };
        }
        if (!request.station_id) {
            const error = new Error("A station is required before creating a work order");
            error.code = "STATION_REQUIRED";
            throw error;
        }

        const assignedTo = Array.isArray(data.assigned_to)
            ? data.assigned_to
            : data.assigned_to ? [data.assigned_to] : [];

        const workOrderResult = await connection.query(
            `INSERT INTO work_orders (
                project_id, station_id, service_request_id, asset_id, type, title,
                description, assigned_to, planned_date, start_date, end_date, status
             ) VALUES ($1, $1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11)
             RETURNING *`,
            [
                request.station_id,
                request.id,
                request.asset_id,
                data.type || request.category || "Service",
                data.title || request.subject,
                data.description || request.description,
                JSON.stringify(assignedTo),
                data.planned_date || request.desired_date || null,
                data.start_date || null,
                data.end_date || null,
                data.status || "Open",
            ]
        );
        const workOrder = workOrderResult.rows[0];

        await connection.query(
            `UPDATE service_requests
             SET status = 'scheduled',
                 assigned_to = COALESCE($1, assigned_to),
                 scheduled_at = COALESCE($2, scheduled_at),
                 converted_work_order_id = $3,
                 updated_at = NOW()
             WHERE id = $4`,
            [
                assignedTo[0] || null,
                data.planned_date || request.desired_date || null,
                workOrder.id,
                request.id,
            ]
        );

        await connection.query(
            `INSERT INTO audit_logs
                (user_id, client_id, entity_type, entity_id, action, summary, changes)
             VALUES ($1, $2, 'service_request', $3, 'converted_to_work_order', $4, $5)`,
            [
                user.userId,
                request.client_id,
                String(request.id),
                `${request.request_number} converted to ${workOrder.work_order_number || `work order ${workOrder.id}`}`,
                JSON.stringify({ work_order_id: workOrder.id }),
            ]
        );

        await connection.query("COMMIT");
        return { workOrder };
    } catch (error) {
        await connection.query("ROLLBACK");
        throw error;
    } finally {
        connection.release();
    }
};
