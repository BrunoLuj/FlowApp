BEGIN;

CREATE TABLE IF NOT EXISTS work_order_mobile_events (
    id BIGSERIAL PRIMARY KEY,
    event_key UUID NOT NULL UNIQUE,
    work_order_id INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(30) NOT NULL,
    event_at TIMESTAMPTZ NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT work_order_mobile_event_type_chk
        CHECK (event_type IN ('arrive', 'start', 'stop', 'field_update'))
);

CREATE INDEX IF NOT EXISTS work_order_mobile_events_order_idx
    ON work_order_mobile_events(work_order_id, event_at DESC);

INSERT INTO permissions(name, module, action, description)
SELECT 'use_mobile_work_orders', 'work_orders', 'execute',
       'Korištenje mobilnog serviserskog portala i offline sinkronizacije'
WHERE NOT EXISTS (
    SELECT 1 FROM permissions WHERE name = 'use_mobile_work_orders'
);

INSERT INTO role_permissions(role_id, permission_id)
SELECT role.id, permission.id
FROM roles role
JOIN permissions permission ON permission.name = 'use_mobile_work_orders'
WHERE (
    role.name IN ('admin', 'project_manager', 'service_manager', 'technician')
    OR EXISTS (
        SELECT 1
        FROM role_permissions source_role_permission
        JOIN permissions source_permission
          ON source_permission.id = source_role_permission.permission_id
        WHERE source_role_permission.role_id = role.id
          AND source_permission.name = 'edit_work_order_field_report'
    )
)
AND NOT EXISTS (
    SELECT 1 FROM role_permissions existing
    WHERE existing.role_id = role.id AND existing.permission_id = permission.id
);

COMMIT;
