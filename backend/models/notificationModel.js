import { pool } from "../libs/database.js";

export const getNotifications = async (user) => {
    const clientValues = user.clientId ? [user.userId, user.clientId] : [user.userId];
    const clientDeadline = user.clientId ? "AND d.client_id = $2" : "";
    const clientRequest = user.clientId ? "AND sr.client_id = $2" : "";
    const clientOrder = user.clientId ? "AND p.client_id = $2" : "";

    const result = await pool.query(
        `WITH notifications AS (
            SELECT
                'deadline:' || d.id || ':' ||
                    CASE
                        WHEN d.due_date < CURRENT_DATE THEN 'expired'
                        WHEN d.due_date - CURRENT_DATE <= 7 THEN '7'
                        WHEN d.due_date - CURRENT_DATE <= 15 THEN '15'
                        WHEN d.due_date - CURRENT_DATE <= 30 THEN '30'
                        ELSE '60'
                    END AS notification_key,
                'deadline' AS type,
                CASE WHEN d.due_date < CURRENT_DATE THEN 'danger' ELSE 'warning' END AS severity,
                d.title,
                CASE
                    WHEN d.due_date < CURRENT_DATE
                        THEN 'Rok je istekao prije ' || (CURRENT_DATE - d.due_date) || ' dana'
                    ELSE 'Rok istječe za ' || (d.due_date - CURRENT_DATE) || ' dana'
                END AS message,
                d.due_date::timestamptz AS event_at,
                '/service-center/stations/' || d.station_id AS target_url
            FROM compliance_deadlines d
            WHERE d.status = 'active'
              AND d.due_date <= CURRENT_DATE + 60
              AND (
                    d.due_date < CURRENT_DATE
                    OR (d.due_date - CURRENT_DATE <= 7 AND 7 = ANY(d.reminder_days))
                    OR (d.due_date - CURRENT_DATE BETWEEN 8 AND 15 AND 15 = ANY(d.reminder_days))
                    OR (d.due_date - CURRENT_DATE BETWEEN 16 AND 30 AND 30 = ANY(d.reminder_days))
                    OR (d.due_date - CURRENT_DATE BETWEEN 31 AND 60 AND 60 = ANY(d.reminder_days))
              )
              ${clientDeadline}

            UNION ALL

            SELECT
                'request:' || sr.id,
                'service_request',
                CASE sr.priority WHEN 'urgent' THEN 'danger' WHEN 'high' THEN 'warning' ELSE 'info' END,
                sr.subject,
                sr.request_number || ' · status: ' || sr.status,
                sr.created_at,
                '/service-center'
            FROM service_requests sr
            WHERE sr.status NOT IN ('resolved', 'cancelled')
              ${clientRequest}

            UNION ALL

            SELECT
                'sla:' || sr.id,
                'sla',
                CASE
                    WHEN sr.resolution_due_at < NOW() THEN 'danger'
                    ELSE 'warning'
                END,
                'SLA · ' || sr.subject,
                CASE
                    WHEN sr.resolution_due_at < NOW()
                        THEN sr.request_number || ' je prekoračio rok rješavanja'
                    ELSE sr.request_number || ' uskoro doseže SLA rok'
                END,
                sr.resolution_due_at,
                '/service-center'
            FROM service_requests sr
            WHERE sr.status NOT IN ('resolved', 'cancelled')
              AND sr.resolution_due_at IS NOT NULL
              AND sr.resolution_due_at <= NOW() + INTERVAL '8 hours'
              ${clientRequest}

            UNION ALL

            SELECT
                'work-order:' || wo.id,
                'work_order',
                CASE
                    WHEN wo.planned_date < CURRENT_DATE THEN 'danger'
                    WHEN wo.planned_date <= CURRENT_DATE + 3 THEN 'warning'
                    ELSE 'info'
                END,
                wo.title,
                COALESCE(wo.work_order_number, 'WO-' || wo.id) || ' · ' || wo.status,
                COALESCE(wo.planned_date::timestamptz, wo.created_at),
                '/work-orders/' || wo.id
            FROM work_orders wo
            JOIN projects p ON p.id = COALESCE(wo.station_id, wo.project_id)
            WHERE wo.status NOT IN ('Completed', 'Cancelled')
              AND (wo.planned_date IS NULL OR wo.planned_date <= CURRENT_DATE + 7)
              ${clientOrder}

            UNION ALL

            SELECT
                'maintenance-plan:' || mp.id,
                'maintenance_plan',
                CASE WHEN mp.next_due_date < CURRENT_DATE THEN 'danger' ELSE 'warning' END,
                mp.name,
                CASE
                    WHEN mp.next_due_date < CURRENT_DATE
                        THEN 'Preventivni plan kasni ' || (CURRENT_DATE - mp.next_due_date) || ' dana'
                    ELSE 'Preventivni nalog dospijeva za ' || (mp.next_due_date - CURRENT_DATE) || ' dana'
                END,
                mp.next_due_date::timestamptz,
                '/maintenance'
            FROM maintenance_plans mp
            WHERE mp.active = TRUE
              AND mp.next_due_date <= CURRENT_DATE + mp.lead_days
              ${user.clientId ? "AND mp.client_id = $2" : ""}

            UNION ALL

            SELECT
                'contract:' || sc.id,
                'contract',
                CASE WHEN sc.end_date < CURRENT_DATE THEN 'danger' ELSE 'warning' END,
                sc.title,
                CASE
                    WHEN sc.end_date < CURRENT_DATE THEN 'Ugovor je istekao'
                    ELSE 'Ugovor istječe za ' || (sc.end_date - CURRENT_DATE) || ' dana'
                END,
                sc.end_date::timestamptz,
                '/commercial'
            FROM service_contracts sc
            WHERE sc.status = 'active'
              AND sc.end_date IS NOT NULL
              AND sc.end_date <= CURRENT_DATE + 60
              ${user.clientId ? "AND sc.client_id = $2" : ""}

            UNION ALL

            SELECT
                'quotation:' || q.id,
                'quotation',
                CASE
                    WHEN q.valid_until IS NOT NULL AND q.valid_until < CURRENT_DATE
                        THEN 'danger'
                    ELSE 'info'
                END,
                q.title,
                q.quotation_number || ' · čeka odgovor klijenta',
                COALESCE(q.valid_until::timestamptz, q.created_at),
                '/commercial'
            FROM quotations q
            WHERE q.status = 'sent'
              ${user.clientId ? "AND q.client_id = $2" : ""}
        )
        SELECT n.*, (nr.id IS NOT NULL) AS is_read
        FROM notifications n
        LEFT JOIN notification_reads nr
          ON nr.notification_key = n.notification_key
         AND nr.user_id = $1
        ORDER BY is_read ASC, event_at ASC
        LIMIT 100`,
        clientValues
    );
    return result.rows;
};

export const markNotificationRead = async (userId, notificationKey) => {
    await pool.query(
        `INSERT INTO notification_reads(user_id, notification_key)
         VALUES ($1, $2)
         ON CONFLICT (user_id, notification_key)
         DO UPDATE SET read_at = NOW()`,
        [userId, notificationKey]
    );
};

export const markAllNotificationsRead = async (userId, keys) => {
    if (!keys.length) return;
    await pool.query(
        `INSERT INTO notification_reads(user_id, notification_key)
         SELECT $1, UNNEST($2::varchar[])
         ON CONFLICT (user_id, notification_key)
         DO UPDATE SET read_at = NOW()`,
        [userId, keys]
    );
};
