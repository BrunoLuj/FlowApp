BEGIN;

ALTER TABLE service_requests
    ADD COLUMN IF NOT EXISTS sla_paused_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS sla_paused_seconds BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS response_breached_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS resolution_breached_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS escalation_level INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS service_requests_sla_monitor_idx
    ON service_requests(status, response_due_at, resolution_due_at)
    WHERE status NOT IN ('resolved', 'cancelled');

INSERT INTO permissions(name, module, action, description)
SELECT 'manage_service_request_sla', 'service_requests', 'manage',
       'Upravljanje statusom, prioritetom, dodjelom i SLA pauzama servisnih zahtjeva'
WHERE NOT EXISTS (
    SELECT 1 FROM permissions WHERE name = 'manage_service_request_sla'
);

INSERT INTO role_permissions(role_id, permission_id)
SELECT role.id, permission.id
FROM roles role
JOIN permissions permission ON permission.name = 'manage_service_request_sla'
WHERE (
    role.name IN ('admin', 'project_manager', 'service_manager')
    OR EXISTS (
        SELECT 1
        FROM role_permissions source_role_permission
        JOIN permissions source_permission
          ON source_permission.id = source_role_permission.permission_id
        WHERE source_role_permission.role_id = role.id
          AND source_permission.name = 'update_service_requests'
    )
)
AND NOT EXISTS (
    SELECT 1 FROM role_permissions existing
    WHERE existing.role_id = role.id AND existing.permission_id = permission.id
);

COMMIT;
