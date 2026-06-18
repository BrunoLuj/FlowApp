-- FlowApp: kompletna nadogradnja PostgreSQL baze
-- Obuhvaća servisni centar, klijentski portal, opremu, dokumente,
-- rokove, servisne zahtjeve i proširenje radnih naloga.
--
-- Preporuka: napraviti backup baze prije izvršavanja.

BEGIN;

CREATE TABLE IF NOT EXISTS schema_migrations (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- KORISNICI I BENZINSKE STANICE

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL;

ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS station_code VARCHAR(80),
    ADD COLUMN IF NOT EXISTS phone VARCHAR(80),
    ADD COLUMN IF NOT EXISTS email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS working_hours TEXT,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS projects_station_code_uq
    ON projects(station_code)
    WHERE station_code IS NOT NULL;

-- JEDINSTVENI REGISTAR OPREME

CREATE TABLE IF NOT EXISTS equipment_assets (
    id BIGSERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    station_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    asset_code VARCHAR(80),
    category VARCHAR(80) NOT NULL,
    name VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    official_mark VARCHAR(255),
    fuel_type VARCHAR(80),
    status VARCHAR(40) NOT NULL DEFAULT 'active',
    criticality VARCHAR(20) NOT NULL DEFAULT 'normal',
    location_description VARCHAR(255),
    installed_at DATE,
    last_service_at DATE,
    next_service_at DATE,
    last_calibration_at DATE,
    calibration_expires_at DATE,
    warranty_expires_at DATE,
    notes TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE equipment_assets
    ADD COLUMN IF NOT EXISTS asset_code VARCHAR(80),
    ADD COLUMN IF NOT EXISTS category VARCHAR(80),
    ADD COLUMN IF NOT EXISTS name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255),
    ADD COLUMN IF NOT EXISTS model VARCHAR(255),
    ADD COLUMN IF NOT EXISTS serial_number VARCHAR(255),
    ADD COLUMN IF NOT EXISTS official_mark VARCHAR(255),
    ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(80),
    ADD COLUMN IF NOT EXISTS status VARCHAR(40) NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS criticality VARCHAR(20) NOT NULL DEFAULT 'normal',
    ADD COLUMN IF NOT EXISTS location_description VARCHAR(255),
    ADD COLUMN IF NOT EXISTS installed_at DATE,
    ADD COLUMN IF NOT EXISTS last_service_at DATE,
    ADD COLUMN IF NOT EXISTS next_service_at DATE,
    ADD COLUMN IF NOT EXISTS last_calibration_at DATE,
    ADD COLUMN IF NOT EXISTS calibration_expires_at DATE,
    ADD COLUMN IF NOT EXISTS warranty_expires_at DATE,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS equipment_assets_asset_code_uq
    ON equipment_assets(asset_code)
    WHERE asset_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS equipment_assets_client_idx
    ON equipment_assets(client_id);
CREATE INDEX IF NOT EXISTS equipment_assets_station_idx
    ON equipment_assets(station_id);
CREATE INDEX IF NOT EXISTS equipment_assets_expiry_idx
    ON equipment_assets(calibration_expires_at);

-- SERVISNI ZAHTJEVI / HELP DESK

CREATE TABLE IF NOT EXISTS service_requests (
    id BIGSERIAL PRIMARY KEY,
    request_number VARCHAR(40) UNIQUE,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    station_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    asset_id BIGINT REFERENCES equipment_assets(id) ON DELETE SET NULL,
    requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    category VARCHAR(60) NOT NULL DEFAULT 'service',
    priority VARCHAR(20) NOT NULL DEFAULT 'normal',
    status VARCHAR(30) NOT NULL DEFAULT 'new',
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    desired_date DATE,
    scheduled_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT service_requests_priority_chk
        CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    CONSTRAINT service_requests_status_chk
        CHECK (status IN (
            'new', 'triage', 'scheduled', 'in_progress',
            'waiting_client', 'resolved', 'cancelled'
        ))
);

ALTER TABLE service_requests
    ADD COLUMN IF NOT EXISTS request_number VARCHAR(40),
    ADD COLUMN IF NOT EXISTS station_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS asset_id BIGINT REFERENCES equipment_assets(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS category VARCHAR(60) NOT NULL DEFAULT 'service',
    ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'normal',
    ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'new',
    ADD COLUMN IF NOT EXISTS desired_date DATE,
    ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS closed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE SEQUENCE IF NOT EXISTS service_request_number_seq START 1000;

CREATE OR REPLACE FUNCTION set_service_request_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.request_number IS NULL THEN
        NEW.request_number := 'SR-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' ||
            LPAD(NEXTVAL('service_request_number_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS service_request_number_trigger ON service_requests;
CREATE TRIGGER service_request_number_trigger
BEFORE INSERT ON service_requests
FOR EACH ROW EXECUTE FUNCTION set_service_request_number();

CREATE UNIQUE INDEX IF NOT EXISTS service_requests_number_uq
    ON service_requests(request_number)
    WHERE request_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS service_requests_client_idx
    ON service_requests(client_id);
CREATE INDEX IF NOT EXISTS service_requests_station_idx
    ON service_requests(station_id);
CREATE INDEX IF NOT EXISTS service_requests_status_idx
    ON service_requests(status);

CREATE TABLE IF NOT EXISTS service_request_messages (
    id BIGSERIAL PRIMARY KEY,
    service_request_id BIGINT NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    internal_note BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS service_request_messages_request_idx
    ON service_request_messages(service_request_id, created_at);

-- DOKUMENTNI CENTAR

CREATE TABLE IF NOT EXISTS documents (
    id BIGSERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    station_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    asset_id BIGINT REFERENCES equipment_assets(id) ON DELETE SET NULL,
    service_request_id BIGINT REFERENCES service_requests(id) ON DELETE SET NULL,
    document_type VARCHAR(80) NOT NULL,
    title VARCHAR(255) NOT NULL,
    document_number VARCHAR(120),
    file_name VARCHAR(255) NOT NULL,
    storage_key TEXT NOT NULL,
    mime_type VARCHAR(120),
    file_size BIGINT,
    issued_at DATE,
    valid_until DATE,
    visible_to_client BOOLEAN NOT NULL DEFAULT TRUE,
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS documents_client_idx ON documents(client_id);
CREATE INDEX IF NOT EXISTS documents_station_idx ON documents(station_id);
CREATE INDEX IF NOT EXISTS documents_asset_idx ON documents(asset_id);
CREATE INDEX IF NOT EXISTS documents_valid_until_idx ON documents(valid_until);

-- ROKOVI, OVJERE, UMJERAVANJA I PREGLEDI

CREATE TABLE IF NOT EXISTS compliance_deadlines (
    id BIGSERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    station_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    asset_id BIGINT REFERENCES equipment_assets(id) ON DELETE CASCADE,
    document_id BIGINT REFERENCES documents(id) ON DELETE CASCADE,
    deadline_type VARCHAR(80) NOT NULL,
    title VARCHAR(255) NOT NULL,
    due_date DATE NOT NULL,
    warning_days INTEGER NOT NULL DEFAULT 30,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT compliance_deadlines_target_chk CHECK (
        station_id IS NOT NULL OR asset_id IS NOT NULL OR document_id IS NOT NULL
    ),
    CONSTRAINT compliance_deadlines_status_chk
        CHECK (status IN ('active', 'completed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS compliance_deadlines_client_idx
    ON compliance_deadlines(client_id);
CREATE INDEX IF NOT EXISTS compliance_deadlines_station_idx
    ON compliance_deadlines(station_id);
CREATE INDEX IF NOT EXISTS compliance_deadlines_due_idx
    ON compliance_deadlines(due_date)
    WHERE status = 'active';

-- AUDIT LOG

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id TEXT,
    action VARCHAR(80) NOT NULL,
    summary TEXT NOT NULL,
    changes JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_client_created_idx
    ON audit_logs(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx
    ON audit_logs(entity_type, entity_id);

-- PROŠIRENJE RADNIH NALOGA

ALTER TABLE work_orders
    ADD COLUMN IF NOT EXISTS station_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS service_request_id BIGINT REFERENCES service_requests(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS work_order_number VARCHAR(40),
    ADD COLUMN IF NOT EXISTS asset_id BIGINT REFERENCES equipment_assets(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS completed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS completion_notes TEXT,
    ADD COLUMN IF NOT EXISTS customer_signature_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS customer_signed_at TIMESTAMPTZ;

ALTER TABLE service_requests
    ADD COLUMN IF NOT EXISTS converted_work_order_id INTEGER REFERENCES work_orders(id) ON DELETE SET NULL;

CREATE SEQUENCE IF NOT EXISTS work_order_number_seq START 1000;

CREATE OR REPLACE FUNCTION set_work_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.work_order_number IS NULL THEN
        NEW.work_order_number := 'WO-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' ||
            LPAD(NEXTVAL('work_order_number_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS work_order_number_trigger ON work_orders;
CREATE TRIGGER work_order_number_trigger
BEFORE INSERT ON work_orders
FOR EACH ROW EXECUTE FUNCTION set_work_order_number();

CREATE UNIQUE INDEX IF NOT EXISTS work_orders_number_uq
    ON work_orders(work_order_number)
    WHERE work_order_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS work_orders_station_idx
    ON work_orders(station_id);
CREATE INDEX IF NOT EXISTS work_orders_service_request_idx
    ON work_orders(service_request_id);
CREATE INDEX IF NOT EXISTS work_orders_asset_idx
    ON work_orders(asset_id);

CREATE TABLE IF NOT EXISTS work_order_activities (
    id BIGSERIAL PRIMARY KEY,
    work_order_id INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    activity_type VARCHAR(50) NOT NULL DEFAULT 'work',
    description TEXT NOT NULL,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS work_order_materials (
    id BIGSERIAL PRIMARY KEY,
    work_order_id INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(12, 3) NOT NULL DEFAULT 1,
    unit VARCHAR(30) NOT NULL DEFAULT 'kom',
    unit_cost NUMERIC(12, 2),
    serial_number VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS work_order_checklist_items (
    id BIGSERIAL PRIMARY KEY,
    work_order_id INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL,
    required BOOLEAN NOT NULL DEFAULT FALSE,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS work_order_activities_order_idx
    ON work_order_activities(work_order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS work_order_materials_order_idx
    ON work_order_materials(work_order_id);
CREATE INDEX IF NOT EXISTS work_order_checklist_order_idx
    ON work_order_checklist_items(work_order_id, sort_order);

-- PRILOZI I FOTOGRAFIJE

CREATE TABLE IF NOT EXISTS entity_attachments (
    id BIGSERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    station_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    service_request_id BIGINT REFERENCES service_requests(id) ON DELETE CASCADE,
    work_order_id INTEGER REFERENCES work_orders(id) ON DELETE CASCADE,
    asset_id BIGINT REFERENCES equipment_assets(id) ON DELETE SET NULL,
    title VARCHAR(255),
    file_name VARCHAR(255) NOT NULL,
    storage_key TEXT NOT NULL,
    mime_type VARCHAR(120),
    file_size BIGINT,
    visible_to_client BOOLEAN NOT NULL DEFAULT TRUE,
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT entity_attachments_parent_chk CHECK (
        service_request_id IS NOT NULL OR work_order_id IS NOT NULL OR asset_id IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS entity_attachments_client_idx
    ON entity_attachments(client_id);
CREATE INDEX IF NOT EXISTS entity_attachments_request_idx
    ON entity_attachments(service_request_id);
CREATE INDEX IF NOT EXISTS entity_attachments_work_order_idx
    ON entity_attachments(work_order_id);

-- PROČITANE OBAVIJESTI

CREATE TABLE IF NOT EXISTS notification_reads (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_key VARCHAR(255) NOT NULL,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, notification_key)
);

CREATE INDEX IF NOT EXISTS notification_reads_user_idx
    ON notification_reads(user_id);

-- DOZVOLE

INSERT INTO permissions(name)
SELECT permission_name
FROM (VALUES
    ('view_service_center'),
    ('view_service_requests'),
    ('create_service_requests'),
    ('update_service_requests'),
    ('view_documents'),
    ('manage_documents'),
    ('view_deadlines'),
    ('manage_deadlines')
) AS new_permissions(permission_name)
WHERE NOT EXISTS (
    SELECT 1
    FROM permissions
    WHERE permissions.name = new_permissions.permission_name
);

-- Read/create dozvole dobivaju uloge koje već vide dashboard ili klijente.
INSERT INTO role_permissions(role_id, permission_id)
SELECT DISTINCT rp.role_id, new_permission.id
FROM role_permissions rp
JOIN permissions existing_permission
    ON existing_permission.id = rp.permission_id
JOIN permissions new_permission
    ON new_permission.name IN (
        'view_service_center',
        'view_service_requests',
        'view_documents',
        'view_deadlines',
        'create_service_requests'
    )
WHERE existing_permission.name IN ('view_dashboard', 'view_clients')
AND NOT EXISTS (
    SELECT 1
    FROM role_permissions current_permission
    WHERE current_permission.role_id = rp.role_id
      AND current_permission.permission_id = new_permission.id
);

-- Upravljačke dozvole dobivaju uloge koje već uređuju klijente ili naloge.
INSERT INTO role_permissions(role_id, permission_id)
SELECT DISTINCT rp.role_id, new_permission.id
FROM role_permissions rp
JOIN permissions existing_permission
    ON existing_permission.id = rp.permission_id
JOIN permissions new_permission
    ON new_permission.name IN (
        'update_service_requests',
        'manage_documents',
        'manage_deadlines'
    )
WHERE existing_permission.name IN ('update_clients', 'update_work_orders')
AND NOT EXISTS (
    SELECT 1
    FROM role_permissions current_permission
    WHERE current_permission.role_id = rp.role_id
      AND current_permission.permission_id = new_permission.id
);

INSERT INTO schema_migrations(name)
VALUES ('FLOWAPP_FULL_DATABASE_UPGRADE')
ON CONFLICT (name) DO NOTHING;

COMMIT;
