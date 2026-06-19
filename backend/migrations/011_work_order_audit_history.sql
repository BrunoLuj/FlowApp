BEGIN;

CREATE INDEX IF NOT EXISTS audit_logs_entity_created_idx
    ON audit_logs(entity_type, entity_id, created_at DESC);

INSERT INTO permissions(name, module, action, description)
SELECT 'view_work_order_history', 'work_orders', 'view',
       'Pregled povijesti promjena i događaja radnog naloga'
WHERE NOT EXISTS (
    SELECT 1 FROM permissions WHERE name = 'view_work_order_history'
);

INSERT INTO role_permissions(role_id, permission_id)
SELECT DISTINCT role.id, permission.id
FROM roles role
JOIN permissions permission ON permission.name = 'view_work_order_history'
WHERE role.name IN ('admin', 'project_manager', 'service_manager', 'technician')
AND NOT EXISTS (
    SELECT 1
    FROM role_permissions existing
    WHERE existing.role_id = role.id
      AND existing.permission_id = permission.id
);

COMMIT;
