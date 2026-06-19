BEGIN;

ALTER TABLE entity_attachments
    ADD COLUMN IF NOT EXISTS document_type VARCHAR(60),
    ADD COLUMN IF NOT EXISTS version_no INTEGER,
    ADD COLUMN IF NOT EXISTS system_generated BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS entity_attachments_report_version_uq
    ON entity_attachments(work_order_id, document_type, version_no)
    WHERE work_order_id IS NOT NULL AND document_type IS NOT NULL AND version_no IS NOT NULL;

INSERT INTO permissions(name, module, action, description)
SELECT 'generate_service_reports', 'work_orders', 'execute',
       'Serversko generiranje i arhiviranje servisnih PDF zapisnika'
WHERE NOT EXISTS (
    SELECT 1 FROM permissions WHERE name = 'generate_service_reports'
);

INSERT INTO role_permissions(role_id, permission_id)
SELECT role.id, permission.id
FROM roles role
JOIN permissions permission ON permission.name = 'generate_service_reports'
WHERE (
    role.name IN ('admin', 'project_manager', 'service_manager', 'technician')
    OR EXISTS (
        SELECT 1 FROM role_permissions rp
        JOIN permissions source ON source.id = rp.permission_id
        WHERE rp.role_id = role.id AND source.name = 'edit_work_order_field_report'
    )
)
AND NOT EXISTS (
    SELECT 1 FROM role_permissions existing
    WHERE existing.role_id = role.id AND existing.permission_id = permission.id
);

COMMIT;
