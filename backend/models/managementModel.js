import { pool } from "../libs/database.js";
import { refreshSlaEscalations } from "./serviceRequestModel.js";

const clientFilter = (clientId, alias, startIndex = 1) =>
    clientId ? { sql: `AND ${alias}.client_id = $${startIndex}`, values: [clientId] } : { sql: "", values: [] };

export const getManagementOverview = async (clientId = null) => {
    await refreshSlaEscalations(clientId);
    const requestScope = clientFilter(clientId, "sr");
    const stationScope = clientFilter(clientId, "p");

    const [
        kpis,
        requestTrend,
        orderStatuses,
        slaRequests,
        technicianWorkload,
        topClients,
        overdueOrders,
    ] = await Promise.all([
        pool.query(
            `SELECT
                (SELECT COUNT(*)::int FROM service_requests sr
                 WHERE sr.status NOT IN ('resolved', 'cancelled') ${requestScope.sql}) AS open_requests,
                (SELECT COUNT(*)::int FROM service_requests sr
                 WHERE sr.priority = 'urgent' AND sr.status NOT IN ('resolved', 'cancelled') ${requestScope.sql}) AS urgent_requests,
                (SELECT COUNT(*)::int FROM work_orders wo
                 JOIN projects p ON p.id = COALESCE(wo.station_id, wo.project_id)
                 WHERE wo.status NOT IN ('Completed', 'Cancelled') ${stationScope.sql}) AS active_orders,
                (SELECT COUNT(*)::int FROM work_orders wo
                 JOIN projects p ON p.id = COALESCE(wo.station_id, wo.project_id)
                 WHERE wo.status NOT IN ('Completed', 'Cancelled')
                   AND wo.planned_date < CURRENT_DATE ${stationScope.sql}) AS overdue_orders,
                (SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (sr.resolved_at - sr.created_at)) / 3600)::numeric, 1), 0)
                 FROM service_requests sr
                 WHERE sr.resolved_at IS NOT NULL ${requestScope.sql}) AS average_resolution_hours,
                (SELECT COUNT(*)::int FROM work_orders wo
                 JOIN projects p ON p.id = COALESCE(wo.station_id, wo.project_id)
                 WHERE wo.status = 'Completed'
                   AND wo.end_date >= DATE_TRUNC('month', CURRENT_DATE) ${stationScope.sql}) AS completed_this_month`,
            requestScope.values
        ).then(async (result) => {
            const slaResult = await pool.query(
                `SELECT
                    COALESCE(ROUND(
                        100.0 * COUNT(*) FILTER (
                            WHERE responded_at IS NOT NULL
                              AND (response_due_at IS NULL OR responded_at <= response_due_at)
                        ) / NULLIF(COUNT(*) FILTER (WHERE responded_at IS NOT NULL), 0)
                    , 1), 100) AS response_sla_percent,
                    COALESCE(ROUND(
                        100.0 * COUNT(*) FILTER (
                            WHERE resolved_at IS NOT NULL
                              AND (resolution_due_at IS NULL OR resolved_at <= resolution_due_at)
                        ) / NULLIF(COUNT(*) FILTER (WHERE resolved_at IS NOT NULL), 0)
                    , 1), 100) AS resolution_sla_percent,
                    COUNT(*) FILTER (
                        WHERE status NOT IN ('resolved','cancelled')
                          AND (
                              (responded_at IS NULL AND response_due_at < COALESCE(sla_paused_at, NOW()))
                              OR resolution_due_at < COALESCE(sla_paused_at, NOW())
                          )
                    )::int AS active_sla_breaches,
                    COUNT(*) FILTER (
                        WHERE status NOT IN ('resolved','cancelled','waiting_client')
                          AND resolution_due_at BETWEEN NOW() AND NOW() + INTERVAL '8 hours'
                    )::int AS sla_at_risk
                 FROM service_requests sr
                 WHERE 1=1 ${requestScope.sql}`,
                requestScope.values
            );
            return { ...result, rows: [{ ...result.rows[0], ...slaResult.rows[0] }] };
        }),
        pool.query(
            `WITH months AS (
                SELECT generate_series(
                    DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months',
                    DATE_TRUNC('month', CURRENT_DATE),
                    INTERVAL '1 month'
                )::date AS month
            )
            SELECT TO_CHAR(m.month, 'YYYY-MM') AS month,
                   COUNT(sr.id)::int AS created,
                   COUNT(sr.id) FILTER (WHERE sr.status = 'resolved')::int AS resolved
            FROM months m
            LEFT JOIN service_requests sr
              ON DATE_TRUNC('month', sr.created_at) = m.month
             ${clientId ? "AND sr.client_id = $1" : ""}
            GROUP BY m.month ORDER BY m.month`,
            requestScope.values
        ),
        pool.query(
            `SELECT wo.status, COUNT(*)::int AS count
             FROM work_orders wo
             JOIN projects p ON p.id = COALESCE(wo.station_id, wo.project_id)
             WHERE 1=1 ${stationScope.sql}
             GROUP BY wo.status ORDER BY count DESC`,
            stationScope.values
        ),
        pool.query(
            `SELECT sr.id, sr.request_number, sr.subject, sr.priority, sr.status,
                    sr.response_due_at, sr.resolution_due_at, sr.escalation_level,
                    c.company_name AS client_name, p.name AS station_name,
                    CONCAT(u.firstname, ' ', u.lastname) AS assigned_to_name,
                    CASE
                        WHEN sr.status = 'waiting_client' THEN 'paused'
                        WHEN sr.responded_at IS NULL AND sr.response_due_at < NOW() THEN 'response_breached'
                        WHEN sr.resolution_due_at < NOW() THEN 'resolution_breached'
                        WHEN sr.resolution_due_at <= NOW() + INTERVAL '8 hours' THEN 'at_risk'
                        ELSE 'on_track'
                    END AS sla_status
             FROM service_requests sr
             JOIN clients c ON c.id = sr.client_id
             LEFT JOIN projects p ON p.id = sr.station_id
             LEFT JOIN users u ON u.id = sr.assigned_to
             WHERE sr.status NOT IN ('resolved', 'cancelled')
               AND (
                    sr.escalation_level > 0
                    OR sr.status = 'waiting_client'
                    OR sr.resolution_due_at <= NOW() + INTERVAL '8 hours'
               )
               ${requestScope.sql}
             ORDER BY sr.escalation_level DESC, sr.resolution_due_at
             LIMIT 20`,
            requestScope.values
        ),
        pool.query(
            `WITH assignments AS (
                SELECT (JSONB_ARRAY_ELEMENTS_TEXT(COALESCE(wo.assigned_to, '[]'::jsonb)))::int AS user_id,
                       wo.id, wo.status, wo.planned_date
                FROM work_orders wo
                JOIN projects p ON p.id = COALESCE(wo.station_id, wo.project_id)
                WHERE wo.status NOT IN ('Completed', 'Cancelled') ${stationScope.sql}
            )
            SELECT u.id, u.firstname, u.lastname,
                   COUNT(a.id)::int AS active_orders,
                   COUNT(a.id) FILTER (WHERE a.planned_date < CURRENT_DATE)::int AS overdue_orders,
                   COUNT(a.id) FILTER (WHERE a.planned_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7)::int AS next_seven_days
            FROM users u
            LEFT JOIN assignments a ON a.user_id = u.id
            WHERE COALESCE(u.status, TRUE) = TRUE
            GROUP BY u.id
            ORDER BY active_orders DESC, u.firstname`,
            stationScope.values
        ),
        pool.query(
            `SELECT c.id, c.company_name,
                    COUNT(wo.id)::int AS total_orders,
                    COUNT(wo.id) FILTER (WHERE wo.status NOT IN ('Completed', 'Cancelled'))::int AS active_orders
             FROM clients c
             LEFT JOIN projects p ON p.client_id = c.id
             LEFT JOIN work_orders wo ON COALESCE(wo.station_id, wo.project_id) = p.id
             ${clientId ? "WHERE c.id = $1" : ""}
             GROUP BY c.id
             ORDER BY total_orders DESC
             LIMIT 8`,
            clientId ? [clientId] : []
        ),
        pool.query(
            `SELECT wo.id, wo.work_order_number, wo.title, wo.status, wo.planned_date,
                    p.name AS station_name, c.company_name AS client_name,
                    (CURRENT_DATE - wo.planned_date)::int AS days_overdue
             FROM work_orders wo
             JOIN projects p ON p.id = COALESCE(wo.station_id, wo.project_id)
             JOIN clients c ON c.id = p.client_id
             WHERE wo.status NOT IN ('Completed', 'Cancelled')
               AND wo.planned_date < CURRENT_DATE
               ${stationScope.sql}
             ORDER BY wo.planned_date ASC
             LIMIT 10`,
            stationScope.values
        ),
    ]);

    return {
        kpis: kpis.rows[0],
        requestTrend: requestTrend.rows,
        orderStatuses: orderStatuses.rows,
        technicianWorkload: technicianWorkload.rows,
        topClients: topClients.rows,
        overdueOrders: overdueOrders.rows,
        slaRequests: slaRequests.rows,
    };
};

export const getPlanner = async ({ from, to, clientId = null }) => {
    const values = [from, to];
    let clientCondition = "";
    if (clientId) {
        values.push(clientId);
        clientCondition = `AND p.client_id = $${values.length}`;
    }

    const [orders, users, availability] = await Promise.all([
        pool.query(
            `SELECT wo.id, wo.work_order_number, wo.title, wo.type, wo.status,
                    TO_CHAR(wo.planned_date, 'YYYY-MM-DD') AS planned_date,
                    TO_CHAR(wo.start_date, 'YYYY-MM-DD') AS start_date,
                    TO_CHAR(wo.end_date, 'YYYY-MM-DD') AS end_date,
                    wo.assigned_to,
                    wo.scheduled_start_at, wo.scheduled_end_at,
                    wo.estimated_duration_minutes, wo.dispatch_status, wo.dispatch_notes,
                    p.name AS station_name, p.city, p.address,
                    c.company_name AS client_name
             FROM work_orders wo
             JOIN projects p ON p.id = COALESCE(wo.station_id, wo.project_id)
             JOIN clients c ON c.id = p.client_id
             WHERE (
                    wo.scheduled_start_at::date BETWEEN $1 AND $2
                    OR (wo.scheduled_start_at IS NULL AND wo.planned_date BETWEEN $1 AND $2)
                    OR (wo.scheduled_start_at IS NULL AND wo.planned_date IS NULL
                        AND wo.status NOT IN ('Completed', 'Cancelled'))
                   )
                   ${clientCondition}
             ORDER BY COALESCE(wo.scheduled_start_at, wo.planned_date::timestamp), wo.title`,
            values
        ),
        pool.query(
            `SELECT u.id, u.firstname, u.lastname, r.name AS role_name
             FROM users u
             LEFT JOIN roles r ON r.id = u.roles_id
             WHERE COALESCE(u.status, TRUE) = TRUE
               AND u.client_id IS NULL
               AND (r.name IN ('technician', 'service_manager', 'project_manager', 'admin')
                    OR r.name IS NULL)
             ORDER BY firstname, lastname`
        ),
        pool.query(
            `SELECT ta.id, ta.user_id,
                    TO_CHAR(ta.availability_date, 'YYYY-MM-DD') AS availability_date,
                    TO_CHAR(ta.start_time, 'HH24:MI') AS start_time,
                    TO_CHAR(ta.end_time, 'HH24:MI') AS end_time,
                    ta.status, ta.note, ta.created_by, ta.created_at, ta.updated_at,
                    CONCAT(u.firstname, ' ', u.lastname) AS technician_name
             FROM technician_availability ta
             JOIN users u ON u.id = ta.user_id
             WHERE ta.availability_date BETWEEN $1 AND $2
             ORDER BY ta.availability_date, u.firstname`,
            [from, to]
        ),
    ]);

    return { orders: orders.rows, technicians: users.rows, availability: availability.rows };
};

export const setTechnicianAvailability = async (data, userId) => {
    if (data.id) {
        const result = await pool.query(
            `UPDATE technician_availability SET
                user_id = $1,
                availability_date = $2,
                start_time = $3,
                end_time = $4,
                status = $5,
                note = $6,
                updated_at = NOW()
             WHERE id = $7
             RETURNING *`,
            [
                data.user_id,
                data.availability_date,
                data.start_time || "00:00",
                data.end_time || "23:59",
                data.status || "unavailable",
                data.note || null,
                data.id,
            ]
        );
        return result.rows[0];
    }
    const result = await pool.query(
        `INSERT INTO technician_availability (
            user_id, availability_date, start_time, end_time, status, note, created_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (user_id, availability_date, start_time)
         DO UPDATE SET
            end_time = EXCLUDED.end_time,
            status = EXCLUDED.status,
            note = EXCLUDED.note,
            updated_at = NOW()
         RETURNING *`,
        [
            data.user_id,
            data.availability_date,
            data.start_time || "00:00",
            data.end_time || "23:59",
            data.status || "unavailable",
            data.note || null,
            userId,
        ]
    );
    return result.rows[0];
};

export const deleteTechnicianAvailability = async (id) => {
    const result = await pool.query(
        "DELETE FROM technician_availability WHERE id = $1 RETURNING id",
        [id]
    );
    return result.rows[0];
};
