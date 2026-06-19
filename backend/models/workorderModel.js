import { pool } from "../libs/database.js";
import { completeMaintenanceCycle } from "./maintenanceModel.js";
import { assertWorkOrderMetrologyComplete } from "./metrologyModel.js";

const addWorkOrderAudit = async (database, workOrderId, userId, action, summary, changes = {}) => {
    await database.query(
        `INSERT INTO audit_logs
            (user_id, client_id, entity_type, entity_id, action, summary, changes)
         SELECT $1, p.client_id, 'work_order', $2, $3, $4, $5::jsonb
         FROM work_orders wo
         JOIN projects p ON p.id = COALESCE(wo.station_id, wo.project_id)
         WHERE wo.id = $2::integer`,
        [userId || null, String(workOrderId), action, summary, JSON.stringify(changes)]
    );
};

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

export const getMyMobileWorkOrders = async (userId) => {
    const result = await pool.query(
        `SELECT wo.id, wo.work_order_number, wo.title, wo.type, wo.status,
                TO_CHAR(wo.planned_date, 'YYYY-MM-DD') AS planned_date,
                wo.scheduled_start_at, wo.scheduled_end_at,
                wo.arrival_at, wo.departure_at, wo.field_notes,
                p.name AS station_name, p.address, p.city,
                c.company_name AS client_name, c.email AS client_email, ea.name AS asset_name,
                (
                    SELECT event.event_type
                    FROM work_order_mobile_events event
                    WHERE event.work_order_id = wo.id AND event.user_id = $1
                    ORDER BY event.event_at DESC, event.id DESC
                    LIMIT 1
                ) AS last_mobile_event
         FROM work_orders wo
         JOIN projects p ON p.id = COALESCE(wo.station_id, wo.project_id)
         JOIN clients c ON c.id = p.client_id
         LEFT JOIN equipment_assets ea ON ea.id = wo.asset_id
         WHERE wo.assigned_to @> TO_JSONB(ARRAY[$1::integer])
           AND wo.status NOT IN ('Completed', 'Cancelled')
         ORDER BY
            CASE
                WHEN COALESCE(wo.scheduled_start_at::date, wo.planned_date) = CURRENT_DATE THEN 0
                WHEN COALESCE(wo.scheduled_start_at::date, wo.planned_date) < CURRENT_DATE THEN 1
                ELSE 2
            END,
            COALESCE(wo.scheduled_start_at, wo.planned_date::timestamp, wo.created_at)`,
        [userId]
    );
    return result.rows;
};

export const applyMobileWorkOrderEvent = async (workOrderId, data, userId) => {
    const connection = await pool.connect();
    try {
        await connection.query("BEGIN");
        const orderResult = await connection.query(
            `SELECT wo.*, p.client_id
             FROM work_orders wo
             JOIN projects p ON p.id = COALESCE(wo.station_id, wo.project_id)
             WHERE wo.id = $1
               AND wo.assigned_to @> TO_JSONB(ARRAY[$2::integer])
             FOR UPDATE OF wo`,
            [workOrderId, userId]
        );
        const order = orderResult.rows[0];
        if (!order) {
            await connection.query("ROLLBACK");
            return null;
        }

        const eventAt = data.event_at ? new Date(data.event_at) : new Date();
        if (Number.isNaN(eventAt.getTime())) {
            const error = new Error("Invalid event time");
            error.code = "INVALID_EVENT_TIME";
            throw error;
        }
        const eventResult = await connection.query(
            `INSERT INTO work_order_mobile_events
                (event_key, work_order_id, user_id, event_type, event_at, payload)
             VALUES ($1,$2,$3,$4,$5,$6::jsonb)
             ON CONFLICT (event_key) DO NOTHING
             RETURNING *`,
            [
                data.event_key,
                workOrderId,
                userId,
                data.event_type,
                eventAt.toISOString(),
                JSON.stringify(data.payload || {}),
            ]
        );
        if (!eventResult.rows[0]) {
            const existing = await connection.query(
                `SELECT * FROM work_order_mobile_events
                 WHERE event_key = $1 AND work_order_id = $2 AND user_id = $3`,
                [data.event_key, workOrderId, userId]
            );
            if (!existing.rows[0]) {
                const error = new Error("Event key already belongs to another event");
                error.code = "EVENT_KEY_CONFLICT";
                throw error;
            }
            await connection.query("COMMIT");
            return { order, event: existing.rows[0], duplicate: true };
        }

        let summary = "Mobilni događaj je evidentiran";
        if (data.event_type === "arrive") {
            await connection.query(
                `UPDATE work_orders SET arrival_at = COALESCE(arrival_at, $1), updated_at = NOW()
                 WHERE id = $2`,
                [eventAt.toISOString(), workOrderId]
            );
            summary = "Serviser je evidentirao dolazak";
        } else if (data.event_type === "start") {
            await connection.query(
                `UPDATE work_orders SET
                    arrival_at = COALESCE(arrival_at, $1),
                    start_date = COALESCE(start_date, $1::timestamptz::date),
                    status = CASE WHEN status IN ('New', 'Open', 'On Hold') THEN 'In Progress' ELSE status END,
                    updated_at = NOW()
                 WHERE id = $2`,
                [eventAt.toISOString(), workOrderId]
            );
            summary = "Serviser je pokrenuo rad";
        } else if (data.event_type === "stop") {
            const startResult = await connection.query(
                `SELECT event_at FROM work_order_mobile_events
                 WHERE work_order_id = $1 AND user_id = $2 AND event_type = 'start'
                   AND event_at <= $3
                 ORDER BY event_at DESC LIMIT 1`,
                [workOrderId, userId, eventAt.toISOString()]
            );
            const startedAt = startResult.rows[0]?.event_at;
            const duration = startedAt
                ? Math.max(Math.round((eventAt.getTime() - new Date(startedAt).getTime()) / 60000), 0)
                : null;
            await connection.query(
                `UPDATE work_orders SET departure_at = $1, updated_at = NOW()
                 WHERE id = $2`,
                [eventAt.toISOString(), workOrderId]
            );
            if (duration !== null) {
                await connection.query(
                    `INSERT INTO work_order_activities
                        (work_order_id, user_id, activity_type, description, started_at, ended_at, duration_minutes)
                     VALUES ($1,$2,'work','Rad evidentiran mobilnom aplikacijom',$3,$4,$5)`,
                    [workOrderId, userId, startedAt, eventAt.toISOString(), duration]
                );
            }
            summary = "Serviser je zaustavio rad";
        } else if (data.event_type === "field_update") {
            await connection.query(
                `UPDATE work_orders SET
                    field_notes = COALESCE($1, field_notes),
                    odometer_start = COALESCE($2, odometer_start),
                    odometer_end = COALESCE($3, odometer_end),
                    travel_distance_km = COALESCE($4, travel_distance_km),
                    updated_at = NOW()
                 WHERE id = $5`,
                [
                    data.payload?.field_notes ?? null,
                    data.payload?.odometer_start || null,
                    data.payload?.odometer_end || null,
                    data.payload?.travel_distance_km || null,
                    workOrderId,
                ]
            );
            summary = "Serviser je spremio terenske podatke s mobilnog uređaja";
        }

        await connection.query(
            `INSERT INTO audit_logs
                (user_id, client_id, entity_type, entity_id, action, summary, changes)
             VALUES ($1,$2,'work_order',$3,'mobile_' || $4,$5,$6::jsonb)`,
            [
                userId,
                order.client_id,
                String(workOrderId),
                data.event_type,
                summary,
                JSON.stringify({ event_key: data.event_key, event_at: eventAt.toISOString() }),
            ]
        );
        const updatedOrder = await connection.query(
            "SELECT * FROM work_orders WHERE id = $1",
            [workOrderId]
        );
        await connection.query("COMMIT");
        return { order: updatedOrder.rows[0], event: eventResult.rows[0], duplicate: false };
    } catch (error) {
        await connection.query("ROLLBACK");
        throw error;
    } finally {
        connection.release();
    }
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
         [project_id, type, title, description, JSON.stringify(Array.isArray(assigned_to) ? assigned_to : []), planned_date, status, id]
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
        `SELECT wo.*, p.client_id, p.name AS station_name, p.address, p.city,
                c.company_name AS client_name, ea.name AS asset_name,
                ea.meter_value AS asset_meter_value,
                ea.meter_unit AS asset_meter_unit,
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

    const [activities, materials, checklist, users, attachments] = await Promise.all([
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
        pool.query("SELECT id, firstname, lastname, email FROM users"),
        pool.query(
            `SELECT id, title, file_name, mime_type, file_size,
                    visible_to_client, document_type, version_no,
                    system_generated, created_at
             FROM entity_attachments
             WHERE work_order_id = $1
             ${clientId ? "AND visible_to_client = TRUE" : ""}
             ORDER BY created_at DESC`,
            [id]
        ),
    ]);

    const order = orderResult.rows[0];
    const assignedIds = Array.isArray(order.assigned_to) ? order.assigned_to : [];
    return {
        ...order,
        assigned_users: users.rows.filter((user) => assignedIds.includes(user.id)),
        activities: activities.rows,
        materials: materials.rows,
        checklist: checklist.rows,
        attachments: attachments.rows,
    };
};

export const getWorkOrderHistory = async (id) => {
    const result = await pool.query(
        `SELECT event_key, action, summary, changes, created_at, user_name
         FROM (
            SELECT 'audit-' || log.id AS event_key, log.action, log.summary,
                   log.changes, log.created_at,
                   NULLIF(TRIM(CONCAT(u.firstname, ' ', u.lastname)), '') AS user_name
            FROM audit_logs log
            LEFT JOIN users u ON u.id = log.user_id
            WHERE log.entity_type = 'work_order' AND log.entity_id = $1

            UNION ALL

            SELECT 'activity-' || activity.id, 'activity_added',
                   'Evidentiran rad: ' || activity.description,
                   jsonb_build_object('duration_minutes', activity.duration_minutes),
                   activity.created_at,
                   NULLIF(TRIM(CONCAT(u.firstname, ' ', u.lastname)), '')
            FROM work_order_activities activity
            LEFT JOIN users u ON u.id = activity.user_id
            WHERE activity.work_order_id = $1::integer

            UNION ALL

            SELECT 'material-' || material.id, 'material_added',
                   'Evidentiran materijal: ' || material.item_name,
                   jsonb_build_object('quantity', material.quantity, 'unit', material.unit),
                   material.created_at, NULL
            FROM work_order_materials material
            WHERE material.work_order_id = $1::integer

            UNION ALL

            SELECT 'checklist-' || item.id, 'checklist_completed',
                   'Dovršena checklista: ' || item.label,
                   '{}'::jsonb, item.completed_at,
                   NULLIF(TRIM(CONCAT(u.firstname, ' ', u.lastname)), '')
            FROM work_order_checklist_items item
            LEFT JOIN users u ON u.id = item.completed_by
            WHERE item.work_order_id = $1::integer AND item.completed = TRUE

            UNION ALL

            SELECT 'created-' || wo.id, 'created', 'Radni nalog je kreiran',
                   jsonb_build_object('status', wo.status), wo.created_at, NULL
            FROM work_orders wo
            WHERE wo.id = $1::integer
         ) history
         ORDER BY created_at DESC, event_key DESC`,
        [String(id)]
    );
    return result.rows;
};

export const getNextServiceReportVersion = async (id) => {
    const result = await pool.query(
        `SELECT COALESCE(MAX(version_no), 0)::integer + 1 AS version
         FROM entity_attachments
         WHERE work_order_id = $1 AND document_type = 'service_report'`,
        [id]
    );
    return result.rows[0].version;
};

export const registerGeneratedServiceReport = async (id, file, userId, clientId = null) => {
    const connection = await pool.connect();
    try {
        await connection.query("BEGIN");
        const values = [id];
        let scope = "";
        if (clientId) {
            values.push(clientId);
            scope = `AND p.client_id = $${values.length}`;
        }
        const orderResult = await connection.query(
            `SELECT wo.id, wo.work_order_number, p.client_id,
                    COALESCE(wo.station_id, wo.project_id) AS station_id
             FROM work_orders wo
             JOIN projects p ON p.id = COALESCE(wo.station_id, wo.project_id)
             WHERE wo.id = $1 ${scope}
             FOR UPDATE OF wo`,
            values
        );
        const order = orderResult.rows[0];
        if (!order) {
            await connection.query("ROLLBACK");
            return null;
        }
        const versionResult = await connection.query(
            `SELECT COALESCE(MAX(version_no), 0)::integer + 1 AS version
             FROM entity_attachments
             WHERE work_order_id = $1 AND document_type = 'service_report'`,
            [id]
        );
        const version = versionResult.rows[0].version;
        if (version !== file.version) {
            const error = new Error("Service report version changed");
            error.code = "REPORT_VERSION_CONFLICT";
            throw error;
        }
        const attachment = await connection.query(
            `INSERT INTO entity_attachments (
                client_id, station_id, work_order_id, title, file_name,
                storage_key, mime_type, file_size, visible_to_client,
                uploaded_by, document_type, version_no, system_generated
             ) VALUES ($1,$2,$3,$4,$5,$6,'application/pdf',$7,TRUE,$8,
                       'service_report',$9,TRUE)
             RETURNING *`,
            [
                order.client_id,
                order.station_id,
                id,
                `Servisni zapisnik ${order.work_order_number || `WO-${id}`} v${version}`,
                file.fileName,
                file.storageKey,
                file.fileSize,
                userId,
                version,
            ]
        );
        await connection.query(
            `UPDATE work_orders SET report_generated_at = NOW(), updated_at = NOW()
             WHERE id = $1`,
            [id]
        );
        await connection.query(
            `INSERT INTO audit_logs
                (user_id, client_id, entity_type, entity_id, action, summary, changes)
             VALUES ($1,$2,'work_order',$3,'service_report_generated',$4,$5::jsonb)`,
            [
                userId,
                order.client_id,
                String(id),
                `Generiran servisni PDF zapisnik, verzija ${version}`,
                JSON.stringify({ attachment_id: attachment.rows[0].id, version }),
            ]
        );
        await connection.query("COMMIT");
        return attachment.rows[0];
    } catch (error) {
        await connection.query("ROLLBACK");
        throw error;
    } finally {
        connection.release();
    }
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
    const connection = await pool.connect();
    try {
        await connection.query("BEGIN");

        let inventoryItem = null;
        let movementId = null;
        if (data.inventory_item_id && data.warehouse_id) {
            const itemResult = await connection.query(
                `SELECT id, name, unit, purchase_price
                 FROM inventory_items WHERE id = $1 AND active = TRUE`,
                [data.inventory_item_id]
            );
            inventoryItem = itemResult.rows[0];
            if (!inventoryItem) {
                const error = new Error("Inventory item not found");
                error.code = "ITEM_NOT_FOUND";
                throw error;
            }

            const quantity = Number(data.quantity) || 1;
            const stockResult = await connection.query(
                `UPDATE inventory_stock
                 SET quantity = quantity - $1, updated_at = NOW()
                 WHERE warehouse_id = $2 AND item_id = $3
                   AND quantity >= $1
                 RETURNING quantity`,
                [quantity, data.warehouse_id, data.inventory_item_id]
            );
            if (!stockResult.rows[0]) {
                const error = new Error("Insufficient stock");
                error.code = "INSUFFICIENT_STOCK";
                throw error;
            }

            const movement = await connection.query(
                `INSERT INTO inventory_movements (
                    warehouse_id, item_id, movement_type, quantity,
                    reference_type, reference_id, work_order_id, note, unit_cost, created_by
                 ) VALUES ($1,$2,'issue',$3,'work_order',$4,$4,$5,$6,$7)
                 RETURNING id`,
                [
                    data.warehouse_id,
                    data.inventory_item_id,
                    quantity,
                    workOrderId,
                    data.note || null,
                    data.unit_cost || inventoryItem.purchase_price || null,
                    data.user_id || null,
                ]
            );
            movementId = movement.rows[0].id;
        }

        const result = await connection.query(
            `INSERT INTO work_order_materials (
                work_order_id, item_name, quantity, unit, unit_cost, serial_number,
                inventory_item_id, warehouse_id, inventory_movement_id
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
             RETURNING *`,
            [
                workOrderId,
                inventoryItem?.name || data.item_name,
                Number(data.quantity) || 1,
                inventoryItem?.unit || data.unit || "kom",
                data.unit_cost || inventoryItem?.purchase_price || null,
                data.serial_number || null,
                data.inventory_item_id || null,
                data.warehouse_id || null,
                movementId,
            ]
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

export const updateWorkOrderFieldData = async (id, data, userId, clientId = null) => {
    const values = [
        data.arrival_at || null,
        data.departure_at || null,
        data.odometer_start === "" ? null : data.odometer_start,
        data.odometer_end === "" ? null : data.odometer_end,
        data.travel_distance_km === "" ? null : data.travel_distance_km,
        data.travel_time_minutes === "" ? null : data.travel_time_minutes,
        data.field_notes ?? null,
        data.completion_notes ?? null,
        data.customer_signature_name ?? null,
        data.customer_signature_data ?? null,
        Boolean(data.report_generated),
        id,
    ];
    let clientCondition = "";
    if (clientId) {
        values.push(clientId);
        clientCondition = `AND p.client_id = $${values.length}`;
    }

    const connection = await pool.connect();
    try {
        await connection.query("BEGIN");
        const result = await connection.query(
            `UPDATE work_orders wo SET
                arrival_at = COALESCE($1, wo.arrival_at),
                departure_at = COALESCE($2, wo.departure_at),
                odometer_start = COALESCE($3, wo.odometer_start),
                odometer_end = COALESCE($4, wo.odometer_end),
                travel_distance_km = COALESCE(
                    $5,
                    CASE
                        WHEN $4::numeric IS NOT NULL AND COALESCE($3::numeric, wo.odometer_start) IS NOT NULL
                        THEN GREATEST($4::numeric - COALESCE($3::numeric, wo.odometer_start), 0)
                        ELSE wo.travel_distance_km
                    END
                ),
                travel_time_minutes = COALESCE($6, wo.travel_time_minutes),
                field_notes = COALESCE($7, wo.field_notes),
                completion_notes = COALESCE($8, wo.completion_notes),
                customer_signature_name = COALESCE($9, wo.customer_signature_name),
                customer_signature_data = COALESCE($10, wo.customer_signature_data),
                customer_signed_at = CASE
                    WHEN $10 IS NOT NULL AND $10 IS DISTINCT FROM wo.customer_signature_data
                    THEN CASE WHEN $10 = '' THEN NULL ELSE NOW() END
                    ELSE wo.customer_signed_at
                END,
                report_generated_at = CASE
                    WHEN $11 THEN NOW()
                    ELSE wo.report_generated_at
                END,
                updated_at = NOW()
             FROM projects p
             WHERE wo.id = $12
               AND p.id = COALESCE(wo.station_id, wo.project_id)
               ${clientCondition}
             RETURNING wo.*`,
            values
        );
        const order = result.rows[0];
        if (order) {
            await connection.query(
                `INSERT INTO audit_logs
                    (user_id, client_id, entity_type, entity_id, action, summary, changes)
                 SELECT $1, p.client_id, 'work_order', $2, 'field_data_updated',
                        'Ažuriran terenski servisni zapisnik', $3::jsonb
                 FROM projects p
                 WHERE p.id = COALESCE($4, $5)`,
                [
                    userId,
                    String(id),
                    JSON.stringify({
                        arrival_at: data.arrival_at,
                        departure_at: data.departure_at,
                        odometer_start: data.odometer_start,
                        odometer_end: data.odometer_end,
                        travel_distance_km: data.travel_distance_km,
                        travel_time_minutes: data.travel_time_minutes,
                        report_generated: Boolean(data.report_generated),
                        signature_updated: Boolean(data.customer_signature_data),
                    }),
                    order.station_id,
                    order.project_id,
                ]
            );
        }
        await connection.query("COMMIT");
        return order;
    } catch (error) {
        await connection.query("ROLLBACK");
        throw error;
    } finally {
        connection.release();
    }
};

export const completeWorkOrder = async (id, data, userId) => {
    const connection = await pool.connect();
    try {
        await connection.query("BEGIN");
        const incompleteResult = await connection.query(
            `SELECT COUNT(*)::integer AS count
             FROM work_order_checklist_items
             WHERE work_order_id = $1 AND required = TRUE AND completed = FALSE`,
            [id]
        );
        if (incompleteResult.rows[0].count > 0) {
            const error = new Error("Required checklist items are incomplete");
            error.code = "CHECKLIST_INCOMPLETE";
            throw error;
        }

        const workOrder = (await connection.query(
            "SELECT * FROM work_orders WHERE id=$1 FOR UPDATE",
            [id]
        )).rows[0];
        if (!workOrder) {
            await connection.query("ROLLBACK");
            return null;
        }
        await assertWorkOrderMetrologyComplete(connection, workOrder);

        const result = await connection.query(
            `UPDATE work_orders SET
                status = 'Completed',
                end_date = COALESCE(end_date, CURRENT_DATE),
                departure_at = COALESCE(departure_at, NOW()),
                completed_by = $1,
                completion_notes = COALESCE($2, completion_notes),
                customer_signature_name = COALESCE($3, customer_signature_name),
                customer_signature_data = COALESCE($4, customer_signature_data),
                customer_signed_at = CASE
                    WHEN COALESCE($3, $4) IS NOT NULL THEN NOW()
                    ELSE customer_signed_at
                END,
                updated_at = NOW()
             WHERE id = $5 RETURNING *`,
            [
                userId,
                data.completion_notes || null,
                data.customer_signature_name || null,
                data.customer_signature_data || null,
                id,
            ]
        );
        if (result.rows[0]?.service_request_id) {
            await connection.query(
            `UPDATE service_requests
             SET status = 'resolved', resolved_at = NOW(), updated_at = NOW()
             WHERE id = $1`,
            [result.rows[0].service_request_id]
            );
        }
        if (result.rows[0]?.maintenance_plan_id) {
            await completeMaintenanceCycle(
                connection,
                result.rows[0],
                result.rows[0].departure_at || new Date(),
                data.asset_meter_value === "" || data.asset_meter_value === undefined
                    ? null
                    : Number(data.asset_meter_value)
            );
        }
        if (result.rows[0]) {
            await addWorkOrderAudit(
                connection,
                id,
                userId,
                "completed",
                "Radni nalog je završen",
                {
                    status: "Completed",
                    customer_signature_name: data.customer_signature_name || null,
                }
            );
        }
        await connection.query("COMMIT");
        return result.rows[0];
    } catch (error) {
        await connection.query("ROLLBACK");
        throw error;
    } finally {
        connection.release();
    }
};

export const updateWorkOrderSchedule = async (id, data, clientId = null, userId = null) => {
    const assignedTo = Array.isArray(data.assigned_to) ? data.assigned_to.map(Number).filter(Number.isInteger) : [];
    const scheduledStart = data.scheduled_start_at || null;
    const duration = Math.max(Number(data.estimated_duration_minutes) || 120, 15);
    const scheduledEnd = data.scheduled_end_at
        || (scheduledStart ? new Date(new Date(scheduledStart).getTime() + duration * 60000).toISOString() : null);
    const values = [
        data.planned_date || null,
        data.status || null,
        JSON.stringify(assignedTo),
        scheduledStart,
        scheduledEnd,
        duration,
        data.dispatch_status || null,
        data.dispatch_notes ?? null,
        id,
    ];
    let clientCondition = "";
    if (clientId) {
        values.push(clientId);
        clientCondition = `AND p.client_id = $${values.length}`;
    }

    const connection = await pool.connect();
    try {
        await connection.query("BEGIN");
        if (scheduledStart && scheduledEnd && assignedTo.length) {
            const conflictResult = await connection.query(
                `SELECT wo.id, wo.work_order_number, wo.title,
                        wo.scheduled_start_at, wo.scheduled_end_at,
                        CONCAT(u.firstname, ' ', u.lastname) AS technician_name
                 FROM work_orders wo
                 CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(wo.assigned_to, '[]'::jsonb)) assigned(user_id)
                 JOIN users u ON u.id = assigned.user_id::integer
                 WHERE wo.id <> $1
                   AND wo.status NOT IN ('Completed', 'Cancelled')
                   AND assigned.user_id::integer = ANY($2::int[])
                   AND wo.scheduled_start_at < $4::timestamptz
                   AND wo.scheduled_end_at > $3::timestamptz
                 LIMIT 1`,
                [id, assignedTo, scheduledStart, scheduledEnd]
            );
            if (conflictResult.rows[0]) {
                const error = new Error("Technician schedule conflict");
                error.code = "SCHEDULE_CONFLICT";
                error.conflict = conflictResult.rows[0];
                throw error;
            }

            const availabilityResult = await connection.query(
                `SELECT ta.id, ta.status, ta.note,
                        CONCAT(u.firstname, ' ', u.lastname) AS technician_name
                 FROM technician_availability ta
                 JOIN users u ON u.id = ta.user_id
                 WHERE ta.user_id = ANY($1::int[])
                   AND ta.availability_date = $2::timestamptz::date
                   AND ta.status <> 'available'
                   AND ta.start_time < $3::timestamptz::time
                   AND ta.end_time > $2::timestamptz::time
                 LIMIT 1`,
                [assignedTo, scheduledStart, scheduledEnd]
            );
            if (availabilityResult.rows[0]) {
                const error = new Error("Technician is unavailable");
                error.code = "TECHNICIAN_UNAVAILABLE";
                error.conflict = availabilityResult.rows[0];
                throw error;
            }
        }

        const result = await connection.query(
            `UPDATE work_orders wo SET
                planned_date = COALESCE($1, wo.planned_date),
                status = COALESCE($2, wo.status),
                assigned_to = $3::jsonb,
                scheduled_start_at = COALESCE($4, wo.scheduled_start_at),
                scheduled_end_at = COALESCE($5, wo.scheduled_end_at),
                estimated_duration_minutes = COALESCE($6, wo.estimated_duration_minutes),
                dispatch_status = COALESCE($7, wo.dispatch_status),
                dispatch_notes = COALESCE($8, wo.dispatch_notes),
                updated_at = NOW()
             FROM projects p
             WHERE wo.id = $9
               AND p.id = COALESCE(wo.station_id, wo.project_id)
               ${clientCondition}
             RETURNING wo.*`,
            values
        );
        if (result.rows[0]) {
            await addWorkOrderAudit(
                connection,
                id,
                userId,
                "schedule_updated",
                "Ažuriran raspored i dodjela radnog naloga",
                {
                    planned_date: data.planned_date || null,
                    scheduled_start_at: scheduledStart,
                    scheduled_end_at: scheduledEnd,
                    estimated_duration_minutes: duration,
                    assigned_to: assignedTo,
                    dispatch_status: data.dispatch_status || null,
                }
            );
        }
        await connection.query("COMMIT");
        return result.rows[0];
    } catch (error) {
        await connection.query("ROLLBACK");
        throw error;
    } finally {
        connection.release();
    }
};
