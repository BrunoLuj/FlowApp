import path from "path";
import { pool } from "../libs/database.js";
import { resolveUploadedFile } from "../middleware/uploadMiddleware.js";
import { renderEmailTemplate } from "../libs/emailTemplates.js";
import { isEmailConfigured, sendEmail } from "../libs/mailer.js";

export const eventTypes = [
    "service_request_created",
    "work_order_assigned",
    "work_order_reminder",
    "sla_escalation",
    "service_report_generated",
    "deadline_reminder",
    "fleet_deadline_reminder",
];

const appUrl = () => (process.env.APP_URL || process.env.CORS_ORIGIN || "http://localhost:3000")
    .split(",")[0].trim().replace(/\/$/, "");

const getSetting = async (eventType, clientId) => {
    const result = await pool.query(
        `SELECT *
         FROM email_notification_settings
         WHERE event_type = $1 AND (client_id = $2 OR client_id IS NULL)
         ORDER BY client_id NULLS LAST
         LIMIT 1`,
        [eventType, clientId || null]
    );
    return result.rows[0];
};

const managerRecipients = async () => {
    const result = await pool.query(
        `SELECT DISTINCT u.email, CONCAT(u.firstname, ' ', u.lastname) AS name
         FROM users u
         JOIN roles r ON r.id = u.roles_id
         WHERE COALESCE(u.status, TRUE) = TRUE
           AND u.client_id IS NULL
           AND r.name IN ('admin', 'project_manager', 'service_manager')
           AND u.email IS NOT NULL`
    );
    return result.rows;
};

const normalizeRecipients = (recipients) => {
    const unique = new Map();
    recipients.forEach((recipient) => {
        const email = String(recipient?.email || "").trim().toLowerCase();
        if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            unique.set(email, { email, name: recipient.name || null });
        }
    });
    return [...unique.values()];
};

export const queueEmailEvent = async ({
    eventType,
    clientId,
    entityType,
    entityId,
    notificationBase,
    data,
    clientRecipients = [],
    assigneeRecipients = [],
    attachments = [],
}) => {
    const setting = await getSetting(eventType, clientId);
    if (!setting?.enabled) return [];
    const recipients = [...(Array.isArray(setting.recipients) ? setting.recipients : []).map((email) => ({ email }))];
    if (setting.send_to_client) recipients.push(...clientRecipients);
    if (setting.send_to_assignee) recipients.push(...assigneeRecipients);
    if (setting.send_to_managers) recipients.push(...await managerRecipients());
    const normalized = normalizeRecipients(recipients);
    if (!normalized.length) return [];
    const template = renderEmailTemplate(eventType, data, appUrl());
    const inserted = [];
    for (const recipient of normalized) {
        const notificationKey = `${notificationBase}:${recipient.email}`;
        const result = await pool.query(
            `INSERT INTO email_queue (
                notification_key, client_id, event_type, entity_type, entity_id,
                recipient_email, recipient_name, subject, html_body, text_body, attachments
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
             ON CONFLICT (notification_key) DO NOTHING
             RETURNING id`,
            [
                notificationKey, clientId || null, eventType, entityType || null,
                entityId ? String(entityId) : null, recipient.email, recipient.name,
                template.subject, template.html, template.text, JSON.stringify(attachments),
            ]
        );
        if (result.rows[0]) inserted.push(result.rows[0].id);
    }
    return inserted;
};

const materializeAttachments = (attachments) => (Array.isArray(attachments) ? attachments : []).map((item) => ({
    filename: item.filename || path.basename(item.storage_key),
    path: resolveUploadedFile(item.storage_key),
    contentType: item.content_type || undefined,
}));

export const processEmailQueue = async (limit = 20) => {
    if (!isEmailConfigured()) return { configured: false, processed: 0, sent: 0, failed: 0 };
    await pool.query(
        `UPDATE email_queue SET status='failed',next_attempt_at=NOW(),updated_at=NOW(),
                last_error=COALESCE(last_error,'Slanje prekinuto prije završetka')
         WHERE status='processing' AND updated_at < NOW()-INTERVAL '15 minutes'`
    );
    let sent = 0;
    let failed = 0;
    for (let index = 0; index < limit; index += 1) {
        const connection = await pool.connect();
        let message;
        try {
            await connection.query("BEGIN");
            const result = await connection.query(
                `SELECT * FROM email_queue
                 WHERE status IN ('pending','failed')
                   AND attempts < max_attempts
                   AND next_attempt_at <= NOW()
                 ORDER BY created_at
                 FOR UPDATE SKIP LOCKED
                 LIMIT 1`
            );
            message = result.rows[0];
            if (!message) {
                await connection.query("COMMIT");
                connection.release();
                break;
            }
            await connection.query(
                `UPDATE email_queue SET status='processing', attempts=attempts+1, updated_at=NOW()
                 WHERE id=$1`,
                [message.id]
            );
            await connection.query("COMMIT");
        } catch (error) {
            await connection.query("ROLLBACK");
            connection.release();
            throw error;
        }
        connection.release();
        try {
            const info = await sendEmail({
                ...message,
                attachments: materializeAttachments(message.attachments),
            });
            await pool.query(
                `UPDATE email_queue SET status='sent', sent_at=NOW(), last_error=NULL,
                    provider_message_id=$2, updated_at=NOW() WHERE id=$1`,
                [message.id, info.messageId || null]
            );
            sent += 1;
        } catch (error) {
            await pool.query(
                `UPDATE email_queue SET
                    status = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'failed' END,
                    last_error=$2,
                    next_attempt_at=NOW() + LEAST(POWER(2, attempts)::integer, 60) * INTERVAL '1 minute',
                    updated_at=NOW()
                 WHERE id=$1`,
                [message.id, String(error.message || error).slice(0, 2000)]
            );
            failed += 1;
        }
    }
    return { configured: true, processed: sent + failed, sent, failed };
};

export const generateScheduledEmails = async () => {
    const [orders, sla, deadlines, fleetDeadlines] = await Promise.all([
        pool.query(
            `SELECT wo.id, wo.work_order_number, wo.title, wo.assigned_to,
                    COALESCE(wo.scheduled_start_at, wo.planned_date::timestamp) AS scheduled_at,
                    p.client_id, p.name AS station_name, p.address, p.city,
                    c.company_name AS client_name
             FROM work_orders wo
             JOIN projects p ON p.id=COALESCE(wo.station_id,wo.project_id)
             JOIN clients c ON c.id=p.client_id
             WHERE wo.status NOT IN ('Completed','Cancelled')
               AND COALESCE(wo.scheduled_start_at,wo.planned_date::timestamp)
                   BETWEEN NOW() AND NOW()+INTERVAL '24 hours'`
        ),
        pool.query(
            `SELECT sr.id, sr.request_number, sr.subject, sr.client_id,
                    sr.escalation_level, COALESCE(sr.resolution_due_at,sr.response_due_at) due_at,
                    c.company_name AS client_name
             FROM service_requests sr JOIN clients c ON c.id=sr.client_id
             WHERE sr.status NOT IN ('resolved','cancelled') AND sr.escalation_level > 0`
        ),
        pool.query(
            `SELECT d.id,d.title,TO_CHAR(d.due_date,'YYYY-MM-DD') due_date,d.client_id,p.name station_name,c.company_name client_name,
                    c.email client_email,(d.due_date-CURRENT_DATE)::int days_remaining,d.station_id
             FROM compliance_deadlines d
             JOIN clients c ON c.id=d.client_id
             LEFT JOIN projects p ON p.id=d.station_id
             WHERE d.status='active' AND d.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE+30`
        ),
        pool.query(
            `SELECT r.id,r.title,r.record_type,TO_CHAR(r.due_date,'YYYY-MM-DD') due_date,
                    (r.due_date-CURRENT_DATE)::int days_remaining,
                    v.registration_number,v.make,v.model,u.email assignee_email,
                    CONCAT(u.firstname,' ',u.lastname) assignee_name
             FROM fleet_vehicle_records r
             JOIN fleet_vehicles v ON v.id=r.vehicle_id
             LEFT JOIN users u ON u.id=v.assigned_user_id
             WHERE r.status='active' AND r.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE+30`
        ),
    ]);
    for (const order of orders.rows) {
        const users = await pool.query(
            `SELECT email,CONCAT(firstname,' ',lastname) name FROM users
             WHERE id=ANY($1::int[]) AND email IS NOT NULL`,
            [Array.isArray(order.assigned_to) ? order.assigned_to : []]
        );
        await queueEmailEvent({
            eventType: "work_order_reminder", clientId: order.client_id,
            entityType: "work_order", entityId: order.id,
            notificationBase: `work-order-reminder:${order.id}:${new Date(order.scheduled_at).toISOString().slice(0, 13)}`,
            assigneeRecipients: users.rows,
            data: {
                ...order,
                scheduled_at: new Intl.DateTimeFormat("hr-HR", { dateStyle: "short", timeStyle: "short" }).format(new Date(order.scheduled_at)),
                address: [order.address, order.city].filter(Boolean).join(", "),
                target_url: `/work-orders/${order.id}`,
            },
        });
    }
    for (const request of sla.rows) {
        await queueEmailEvent({
            eventType: "sla_escalation", clientId: request.client_id,
            entityType: "service_request", entityId: request.id,
            notificationBase: `sla-email:${request.id}:E${request.escalation_level}`,
            data: {
                ...request,
                due_at: request.due_at ? new Intl.DateTimeFormat("hr-HR", { dateStyle: "short", timeStyle: "short" }).format(new Date(request.due_at)) : "-",
                target_url: "/service-center",
            },
        });
    }
    for (const deadline of deadlines.rows) {
        await queueEmailEvent({
            eventType: "deadline_reminder", clientId: deadline.client_id,
            entityType: "deadline", entityId: deadline.id,
            notificationBase: `deadline-email:${deadline.id}:${deadline.days_remaining}`,
            clientRecipients: [{ email: deadline.client_email, name: deadline.client_name }],
            data: {
                ...deadline,
                due_date: deadline.due_date.split("-").reverse().join("."),
                target_url: deadline.station_id ? `/service-center/stations/${deadline.station_id}` : "/documents",
            },
        });
    }
    for (const deadline of fleetDeadlines.rows) {
        await queueEmailEvent({
            eventType:"fleet_deadline_reminder",clientId:null,
            entityType:"fleet_record",entityId:deadline.id,
            notificationBase:`fleet-deadline:${deadline.id}:${deadline.days_remaining}`,
            assigneeRecipients:deadline.assignee_email?[{email:deadline.assignee_email,name:deadline.assignee_name}]:[],
            data:{...deadline,due_date:deadline.due_date.split("-").reverse().join("."),target_url:"/fleet"},
        });
    }
    return { orders: orders.rowCount, sla: sla.rowCount, deadlines: deadlines.rowCount,fleetDeadlines:fleetDeadlines.rowCount };
};

export const getEmailCenter = async () => {
    const [summary, queue, settings] = await Promise.all([
        pool.query(
            `SELECT COUNT(*) FILTER (WHERE status='pending')::int pending,
                    COUNT(*) FILTER (WHERE status='sent')::int sent,
                    COUNT(*) FILTER (WHERE status='failed')::int failed,
                    COUNT(*) FILTER (WHERE status='processing')::int processing
             FROM email_queue`
        ),
        pool.query(
            `SELECT id,event_type,entity_type,entity_id,recipient_email,recipient_name,
                    subject,status,attempts,max_attempts,next_attempt_at,sent_at,last_error,created_at
             FROM email_queue ORDER BY created_at DESC LIMIT 200`
        ),
        pool.query(
            `SELECT * FROM email_notification_settings
             WHERE client_id IS NULL ORDER BY event_type`
        ),
    ]);
    return { configured: isEmailConfigured(), summary: summary.rows[0], queue: queue.rows, settings: settings.rows };
};

export const saveEmailSetting = async (eventType, data, userId) => {
    if (!eventTypes.includes(eventType)) return null;
    const values = [
        eventType, Boolean(data.enabled), JSON.stringify(data.recipients || []),
        Boolean(data.send_to_client), Boolean(data.send_to_assignee),
        Boolean(data.send_to_managers), userId,
    ];
    let result = await pool.query(
        `UPDATE email_notification_settings SET enabled=$2,recipients=$3::jsonb,
            send_to_client=$4,send_to_assignee=$5,send_to_managers=$6,
            updated_by=$7,updated_at=NOW()
         WHERE client_id IS NULL AND event_type=$1 RETURNING *`,
        values
    );
    if (!result.rows[0]) {
        result = await pool.query(
            `INSERT INTO email_notification_settings (
                client_id,event_type,enabled,recipients,send_to_client,
                send_to_assignee,send_to_managers,updated_by
             ) VALUES (NULL,$1,$2,$3::jsonb,$4,$5,$6,$7) RETURNING *`,
            values
        );
    }
    return result.rows[0];
};

export const retryEmail = async (id) => {
    const result = await pool.query(
        `UPDATE email_queue SET status='pending',attempts=0,next_attempt_at=NOW(),
                last_error=NULL,updated_at=NOW()
         WHERE id=$1 AND status IN ('failed','cancelled') RETURNING *`,
        [id]
    );
    return result.rows[0];
};
