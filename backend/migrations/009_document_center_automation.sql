BEGIN;

ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS parent_document_id BIGINT REFERENCES documents(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS version_number INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS documents_current_idx
    ON documents(client_id, is_current, valid_until);
CREATE INDEX IF NOT EXISTS documents_parent_idx
    ON documents(parent_document_id, version_number DESC);
CREATE INDEX IF NOT EXISTS documents_tags_idx
    ON documents USING GIN(tags);

ALTER TABLE compliance_deadlines
    ADD COLUMN IF NOT EXISTS reminder_days INTEGER[] NOT NULL DEFAULT ARRAY[60,30,15,7],
    ADD COLUMN IF NOT EXISTS last_reminder_days INTEGER,
    ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ;

INSERT INTO permissions(name, module, action, description)
SELECT name, module, action, description
FROM (VALUES
    ('view_document_center', 'documents', 'view', 'Pregled centralnog dokumentnog centra'),
    ('manage_document_versions', 'documents', 'manage', 'Učitavanje novih verzija dokumenta')
) AS new_permissions(name, module, action, description)
WHERE NOT EXISTS (
    SELECT 1 FROM permissions p WHERE p.name = new_permissions.name
);

INSERT INTO role_permissions(role_id, permission_id)
SELECT DISTINCT rp.role_id, target.id
FROM role_permissions rp
JOIN permissions source ON source.id = rp.permission_id
JOIN permissions target ON target.name = 'view_document_center'
WHERE source.name = 'view_documents'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions current_permission
    WHERE current_permission.role_id = rp.role_id
      AND current_permission.permission_id = target.id
);

INSERT INTO role_permissions(role_id, permission_id)
SELECT DISTINCT rp.role_id, target.id
FROM role_permissions rp
JOIN permissions source ON source.id = rp.permission_id
JOIN permissions target ON target.name = 'manage_document_versions'
WHERE source.name = 'create_documents'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions current_permission
    WHERE current_permission.role_id = rp.role_id
      AND current_permission.permission_id = target.id
);

COMMIT;
