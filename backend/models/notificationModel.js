import { pool } from "../libs/database.js";

export const getNotifications = async (user) => {
    const clientValues = user.clientId ? [user.userId, user.clientId] : [user.userId];
    const clientDeadline = user.clientId ? "AND d.client_id = $2" : "";
    const clientRequest = user.clientId ? "AND sr.client_id = $2" : "";
    const clientOrder = user.clientId ? "AND p.client_id = $2" : "";

    const result = await pool.query(
        `WITH notifications AS (
            SELECT
                'deadline:' || d.id AS notification_key,
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
              AND d.due_date <= CURRENT_DATE + GREATEST(d.warning_days, 30)
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
