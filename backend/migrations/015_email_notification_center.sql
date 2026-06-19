BEGIN;

CREATE TABLE IF NOT EXISTS email_notification_settings (
    id BIGSERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    event_type VARCHAR(80) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
    send_to_client BOOLEAN NOT NULL DEFAULT FALSE,
    send_to_assignee BOOLEAN NOT NULL DEFAULT FALSE,
    send_to_managers BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(client_id, event_type)
);
CREATE UNIQUE INDEX IF NOT EXISTS email_notification_settings_scope_uq
    ON email_notification_settings(COALESCE(client_id, 0), event_type);

CREATE TABLE IF NOT EXISTS email_queue (
    id BIGSERIAL PRIMARY KEY,
    notification_key VARCHAR(255) NOT NULL UNIQUE,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    event_type VARCHAR(80) NOT NULL,
    entity_type VARCHAR(80),
    entity_id TEXT,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    html_body TEXT NOT NULL,
    text_body TEXT,
    attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    last_error TEXT,
    provider_message_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT email_queue_status_chk
        CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS email_queue_pending_idx
    ON email_queue(status, next_attempt_at)
    WHERE status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS email_queue_entity_idx
    ON email_queue(entity_type, entity_id, created_at DESC);

INSERT INTO email_notification_settings (
    client_id, event_type, enabled, send_to_client, send_to_assignee, send_to_managers
)
SELECT NULL, event_type, TRUE, send_client, send_assignee, send_managers
FROM (VALUES
    ('service_request_created', TRUE, FALSE, TRUE),
    ('work_order_assigned', FALSE, TRUE, FALSE),
    ('work_order_reminder', FALSE, TRUE, FALSE),
    ('sla_escalation', FALSE, FALSE, TRUE),
    ('service_report_generated', TRUE, FALSE, FALSE),
    ('deadline_reminder', TRUE, FALSE, TRUE)
) AS defaults(event_type, send_client, send_assignee, send_managers)
WHERE NOT EXISTS (
    SELECT 1 FROM email_notification_settings current
    WHERE current.client_id IS NULL AND current.event_type = defaults.event_type
);

INSERT INTO permissions(name, module, action, description)
SELECT name, module, action, description
FROM (VALUES
    ('view_email_center', 'notifications', 'view', 'Pregled reda i povijesti e-mail obavijesti'),
    ('manage_email_center', 'notifications', 'manage', 'Upravljanje e-mail postavkama i ponovno slanje')
) AS items(name, module, action, description)
WHERE NOT EXISTS (SELECT 1 FROM permissions p WHERE p.name = items.name);

INSERT INTO role_permissions(role_id, permission_id)
SELECT role.id, permission.id
FROM roles role
JOIN permissions permission ON permission.name IN ('view_email_center', 'manage_email_center')
WHERE role.name IN ('admin', 'project_manager', 'service_manager')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions existing
    WHERE existing.role_id = role.id AND existing.permission_id = permission.id
);

COMMIT;
