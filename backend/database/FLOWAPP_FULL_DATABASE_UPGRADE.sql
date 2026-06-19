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

-- SKLADIŠTE I REZERVNI DIJELOVI

CREATE TABLE IF NOT EXISTS warehouse_locations (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id BIGSERIAL PRIMARY KEY,
    sku VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    manufacturer VARCHAR(255),
    supplier VARCHAR(255),
    unit VARCHAR(30) NOT NULL DEFAULT 'kom',
    purchase_price NUMERIC(12, 2),
    selling_price NUMERIC(12, 2),
    minimum_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_stock (
    id BIGSERIAL PRIMARY KEY,
    warehouse_id BIGINT NOT NULL REFERENCES warehouse_locations(id) ON DELETE CASCADE,
    item_id BIGINT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    quantity NUMERIC(12, 3) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(warehouse_id, item_id)
);

CREATE TABLE IF NOT EXISTS inventory_movements (
    id BIGSERIAL PRIMARY KEY,
    warehouse_id BIGINT NOT NULL REFERENCES warehouse_locations(id) ON DELETE RESTRICT,
    item_id BIGINT NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    movement_type VARCHAR(30) NOT NULL,
    quantity NUMERIC(12, 3) NOT NULL CHECK (quantity > 0),
    reference_type VARCHAR(50),
    reference_id BIGINT,
    work_order_id INTEGER REFERENCES work_orders(id) ON DELETE SET NULL,
    note TEXT,
    unit_cost NUMERIC(12, 2),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT inventory_movements_type_chk CHECK (
        movement_type IN ('receipt', 'issue', 'adjustment_in', 'adjustment_out', 'return')
    )
);

ALTER TABLE work_order_materials
    ADD COLUMN IF NOT EXISTS inventory_item_id BIGINT REFERENCES inventory_items(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS warehouse_id BIGINT REFERENCES warehouse_locations(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS inventory_movement_id BIGINT REFERENCES inventory_movements(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS inventory_items_name_idx ON inventory_items(name);
CREATE INDEX IF NOT EXISTS inventory_stock_item_idx ON inventory_stock(item_id);
CREATE INDEX IF NOT EXISTS inventory_movements_item_created_idx
    ON inventory_movements(item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS inventory_movements_work_order_idx
    ON inventory_movements(work_order_id);

INSERT INTO warehouse_locations(code, name)
VALUES ('MAIN', 'Glavno skladište')
ON CONFLICT (code) DO NOTHING;

-- PREVENTIVNO ODRŽAVANJE I QR IDENTIFIKACIJA

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE equipment_assets
    ADD COLUMN IF NOT EXISTS public_token UUID,
    ADD COLUMN IF NOT EXISTS qr_enabled BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE equipment_assets
SET public_token = gen_random_uuid()
WHERE public_token IS NULL;

ALTER TABLE equipment_assets
    ALTER COLUMN public_token SET DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS equipment_assets_public_token_uq
    ON equipment_assets(public_token)
    WHERE public_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS maintenance_plans (
    id BIGSERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    station_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    asset_id BIGINT NOT NULL REFERENCES equipment_assets(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    work_order_type VARCHAR(80) NOT NULL DEFAULT 'Preventive',
    description TEXT,
    interval_value INTEGER NOT NULL CHECK (interval_value > 0),
    interval_unit VARCHAR(20) NOT NULL,
    lead_days INTEGER NOT NULL DEFAULT 14 CHECK (lead_days >= 0),
    next_due_date DATE NOT NULL,
    last_generated_date DATE,
    assigned_to JSONB NOT NULL DEFAULT '[]'::jsonb,
    checklist_template JSONB NOT NULL DEFAULT '[]'::jsonb,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT maintenance_plans_interval_unit_chk
        CHECK (interval_unit IN ('days', 'weeks', 'months', 'years'))
);

ALTER TABLE work_orders
    ADD COLUMN IF NOT EXISTS maintenance_plan_id BIGINT
        REFERENCES maintenance_plans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS maintenance_plans_due_idx
    ON maintenance_plans(next_due_date)
    WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS maintenance_plans_asset_idx
    ON maintenance_plans(asset_id);
CREATE INDEX IF NOT EXISTS work_orders_maintenance_plan_idx
    ON work_orders(maintenance_plan_id);

-- UGOVORI, SLA I PONUDE

CREATE TABLE IF NOT EXISTS service_contracts (
    id BIGSERIAL PRIMARY KEY,
    contract_number VARCHAR(60) NOT NULL UNIQUE,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    start_date DATE NOT NULL,
    end_date DATE,
    monthly_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
    billing_cycle VARCHAR(30) NOT NULL DEFAULT 'monthly',
    response_hours_normal INTEGER,
    response_hours_high INTEGER,
    response_hours_urgent INTEGER,
    resolution_hours_normal INTEGER,
    resolution_hours_high INTEGER,
    resolution_hours_urgent INTEGER,
    included_services JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contract_stations (
    contract_id BIGINT NOT NULL REFERENCES service_contracts(id) ON DELETE CASCADE,
    station_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    PRIMARY KEY(contract_id, station_id)
);

ALTER TABLE service_requests
    ADD COLUMN IF NOT EXISTS service_contract_id BIGINT REFERENCES service_contracts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS response_due_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS resolution_due_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

CREATE SEQUENCE IF NOT EXISTS quotation_number_seq START 1000;

CREATE TABLE IF NOT EXISTS quotations (
    id BIGSERIAL PRIMARY KEY,
    quotation_number VARCHAR(60) NOT NULL UNIQUE,
    approval_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    station_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    service_request_id BIGINT REFERENCES service_requests(id) ON DELETE SET NULL,
    work_order_id INTEGER REFERENCES work_orders(id) ON DELETE SET NULL,
    contract_id BIGINT REFERENCES service_contracts(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
    discount_percent NUMERIC(6, 2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    tax_percent NUMERIC(6, 2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total NUMERIC(14, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    internal_notes TEXT,
    accepted_by_name VARCHAR(255),
    accepted_by_email VARCHAR(255),
    accepted_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotation_items (
    id BIGSERIAL PRIMARY KEY,
    quotation_id BIGINT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    item_type VARCHAR(30) NOT NULL DEFAULT 'service',
    description TEXT NOT NULL,
    quantity NUMERIC(12, 3) NOT NULL DEFAULT 1,
    unit VARCHAR(30) NOT NULL DEFAULT 'kom',
    unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
    discount_percent NUMERIC(6, 2) NOT NULL DEFAULT 0,
    line_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
    inventory_item_id BIGINT REFERENCES inventory_items(id) ON DELETE SET NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION set_quotation_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quotation_number IS NULL OR NEW.quotation_number = '' THEN
        NEW.quotation_number := 'Q-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' ||
            LPAD(NEXTVAL('quotation_number_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS quotation_number_trigger ON quotations;
CREATE TRIGGER quotation_number_trigger
BEFORE INSERT ON quotations
FOR EACH ROW EXECUTE FUNCTION set_quotation_number();

CREATE INDEX IF NOT EXISTS service_contracts_client_idx ON service_contracts(client_id, status);
CREATE INDEX IF NOT EXISTS service_requests_contract_idx ON service_requests(service_contract_id);
CREATE INDEX IF NOT EXISTS quotations_client_idx ON quotations(client_id, status);
CREATE INDEX IF NOT EXISTS quotation_items_quotation_idx ON quotation_items(quotation_id, sort_order);

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
    ('manage_deadlines'),
    ('view_inventory'),
    ('manage_inventory'),
    ('view_maintenance_plans'),
    ('manage_maintenance_plans'),
    ('view_commercial'),
    ('manage_commercial')
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

INSERT INTO role_permissions(role_id, permission_id)
SELECT DISTINCT rp.role_id, permission.id
FROM role_permissions rp
JOIN permissions existing_permission ON existing_permission.id = rp.permission_id
JOIN permissions permission ON permission.name = 'view_inventory'
WHERE existing_permission.name IN ('view_work_orders', 'view_dashboard')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions current_permission
    WHERE current_permission.role_id = rp.role_id
      AND current_permission.permission_id = permission.id
);

INSERT INTO role_permissions(role_id, permission_id)
SELECT DISTINCT rp.role_id, permission.id
FROM role_permissions rp
JOIN permissions existing_permission ON existing_permission.id = rp.permission_id
JOIN permissions permission ON permission.name = 'manage_inventory'
WHERE existing_permission.name IN ('update_work_orders', 'update_clients')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions current_permission
    WHERE current_permission.role_id = rp.role_id
      AND current_permission.permission_id = permission.id
);

INSERT INTO role_permissions(role_id, permission_id)
SELECT DISTINCT rp.role_id, permission.id
FROM role_permissions rp
JOIN permissions existing_permission ON existing_permission.id = rp.permission_id
JOIN permissions permission ON permission.name = 'view_maintenance_plans'
WHERE existing_permission.name IN ('view_work_orders', 'view_clients')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions current_permission
    WHERE current_permission.role_id = rp.role_id
      AND current_permission.permission_id = permission.id
);

INSERT INTO role_permissions(role_id, permission_id)
SELECT DISTINCT rp.role_id, permission.id
FROM role_permissions rp
JOIN permissions existing_permission ON existing_permission.id = rp.permission_id
JOIN permissions permission ON permission.name = 'manage_maintenance_plans'
WHERE existing_permission.name IN ('update_work_orders', 'update_clients')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions current_permission
    WHERE current_permission.role_id = rp.role_id
      AND current_permission.permission_id = permission.id
);

INSERT INTO role_permissions(role_id, permission_id)
SELECT DISTINCT rp.role_id, permission.id
FROM role_permissions rp
JOIN permissions existing_permission ON existing_permission.id = rp.permission_id
JOIN permissions permission ON permission.name = 'view_commercial'
WHERE existing_permission.name IN ('view_clients', 'view_dashboard')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions current_permission
    WHERE current_permission.role_id = rp.role_id
      AND current_permission.permission_id = permission.id
);

INSERT INTO role_permissions(role_id, permission_id)
SELECT DISTINCT rp.role_id, permission.id
FROM role_permissions rp
JOIN permissions existing_permission ON existing_permission.id = rp.permission_id
JOIN permissions permission ON permission.name = 'manage_commercial'
WHERE existing_permission.name IN ('update_clients', 'update_work_orders')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions current_permission
    WHERE current_permission.role_id = rp.role_id
      AND current_permission.permission_id = permission.id
);

-- Digitalni terenski servisni zapisnik (migracija 007)
ALTER TABLE work_orders
    ADD COLUMN IF NOT EXISTS arrival_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS departure_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS odometer_start NUMERIC(12, 1),
    ADD COLUMN IF NOT EXISTS odometer_end NUMERIC(12, 1),
    ADD COLUMN IF NOT EXISTS travel_distance_km NUMERIC(12, 1),
    ADD COLUMN IF NOT EXISTS travel_time_minutes INTEGER,
    ADD COLUMN IF NOT EXISTS field_notes TEXT,
    ADD COLUMN IF NOT EXISTS customer_signature_data TEXT,
    ADD COLUMN IF NOT EXISTS report_generated_at TIMESTAMPTZ;

-- Granularne role i permisije (migracija 008)
ALTER TABLE roles
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS system_role BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE permissions
    ADD COLUMN IF NOT EXISTS module VARCHAR(80),
    ADD COLUMN IF NOT EXISTS action VARCHAR(40),
    ADD COLUMN IF NOT EXISTS description TEXT;

INSERT INTO permissions(name, module, action, description)
SELECT name, module, action, description
FROM (VALUES
    ('view_management', 'management', 'view', 'Pregled upravljačkih izvještaja i planera'),
    ('view_stations', 'stations', 'view', 'Pregled benzinskih stanica'),
    ('manage_assets', 'assets', 'manage', 'Dodavanje i uređivanje opreme'),
    ('delete_assets', 'assets', 'delete', 'Brisanje opreme'),
    ('create_documents', 'documents', 'create', 'Dodavanje i učitavanje dokumenata'),
    ('delete_documents', 'documents', 'delete', 'Brisanje dokumenata'),
    ('manage_asset_qr', 'assets', 'manage', 'Generiranje javnih QR poveznica opreme'),
    ('reply_service_requests', 'service_requests', 'update', 'Slanje poruka na servisnim zahtjevima'),
    ('manage_work_order_checklist', 'work_orders', 'update', 'Upravljanje checklistom radnog naloga'),
    ('record_work_order_activity', 'work_orders', 'execute', 'Evidentiranje rada i aktivnosti'),
    ('record_work_order_material', 'work_orders', 'execute', 'Evidentiranje utrošenog materijala'),
    ('edit_work_order_field_report', 'work_orders', 'execute', 'Uređivanje terenskog zapisnika i potpisa'),
    ('complete_work_orders', 'work_orders', 'complete', 'Završavanje radnih naloga'),
    ('schedule_work_orders', 'work_orders', 'schedule', 'Planiranje i dodjela radnih naloga'),
    ('manage_inventory_items', 'inventory', 'manage', 'Upravljanje artiklima skladišta'),
    ('manage_inventory_movements', 'inventory', 'execute', 'Evidentiranje ulaza i izlaza robe'),
    ('manage_warehouses', 'inventory', 'manage', 'Upravljanje skladišnim lokacijama'),
    ('manage_contracts', 'commercial', 'manage', 'Upravljanje ugovorima i SLA pravilima'),
    ('manage_quotations', 'commercial', 'manage', 'Izrada i uređivanje ponuda'),
    ('view_inspections', 'inspections', 'view', 'Pregled rezultata inspekcija'),
    ('create_inspections', 'inspections', 'create', 'Izrada i spremanje inspekcija'),
    ('view_roles', 'administration', 'view', 'Pregled rola i njihovih permisija'),
    ('manage_roles', 'administration', 'manage', 'Kreiranje rola i dodjela permisija')
) AS new_permissions(name, module, action, description)
WHERE NOT EXISTS (
    SELECT 1 FROM permissions current_permission
    WHERE current_permission.name = new_permissions.name
);

UPDATE permissions SET module = CASE
    WHEN name LIKE '%work_orders%' THEN 'work_orders'
    WHEN name LIKE '%service_requests%' THEN 'service_requests'
    WHEN name LIKE '%clients%' THEN 'clients'
    WHEN name LIKE '%projects%' THEN 'stations'
    WHEN name LIKE '%users%' OR name LIKE '%profile%' THEN 'administration'
    WHEN name LIKE '%documents%' THEN 'documents'
    WHEN name LIKE '%deadlines%' THEN 'deadlines'
    WHEN name LIKE '%inventory%' THEN 'inventory'
    WHEN name LIKE '%maintenance%' THEN 'maintenance'
    WHEN name LIKE '%commercial%' THEN 'commercial'
    WHEN name LIKE '%dashboard%' THEN 'dashboard'
    ELSE COALESCE(module, 'system')
END
WHERE module IS NULL;

UPDATE permissions SET action = CASE
    WHEN name LIKE 'view_%' THEN 'view'
    WHEN name LIKE 'create_%' THEN 'create'
    WHEN name LIKE 'update_%' THEN 'update'
    WHEN name LIKE 'delete_%' THEN 'delete'
    WHEN name LIKE 'manage_%' THEN 'manage'
    ELSE COALESCE(action, 'execute')
END
WHERE action IS NULL;

WITH mappings(source_permission, target_permission) AS (
    VALUES
        ('view_dashboard', 'view_management'), ('view_clients', 'view_stations'),
        ('update_clients', 'manage_assets'), ('delete_clients', 'delete_assets'),
        ('manage_documents', 'create_documents'), ('manage_documents', 'delete_documents'),
        ('update_clients', 'manage_asset_qr'), ('view_service_requests', 'reply_service_requests'),
        ('update_work_orders', 'manage_work_order_checklist'),
        ('update_work_orders', 'record_work_order_activity'),
        ('update_work_orders', 'record_work_order_material'),
        ('update_work_orders', 'edit_work_order_field_report'),
        ('update_work_orders', 'complete_work_orders'),
        ('update_work_orders', 'schedule_work_orders'),
        ('manage_inventory', 'manage_inventory_items'),
        ('manage_inventory', 'manage_inventory_movements'),
        ('manage_inventory', 'manage_warehouses'),
        ('manage_commercial', 'manage_contracts'),
        ('manage_commercial', 'manage_quotations'),
        ('view_projects', 'view_inspections'), ('create_projects', 'create_inspections'),
        ('view_users', 'view_roles'), ('update_users', 'manage_roles')
)
INSERT INTO role_permissions(role_id, permission_id)
SELECT DISTINCT rp.role_id, target.id
FROM mappings
JOIN permissions source ON source.name = mappings.source_permission
JOIN permissions target ON target.name = mappings.target_permission
JOIN role_permissions rp ON rp.permission_id = source.id
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions existing
    WHERE existing.role_id = rp.role_id AND existing.permission_id = target.id
);

INSERT INTO roles(name, description, system_role, active)
SELECT name, description, TRUE, TRUE
FROM (VALUES
    ('service_manager', 'Voditelj servisa: zahtjevi, raspored, nalozi i dokumentacija'),
    ('technician', 'Serviser na terenu: izvršenje dodijeljenih radnih naloga'),
    ('warehouse_manager', 'Skladištar: artikli, lokacije i kretanje robe'),
    ('metrology', 'Mjeriteljstvo: oprema, rokovi, dokumenti i inspekcije'),
    ('client_admin', 'Administrator klijenta: stanice, zahtjevi i dokumentacija svoje tvrtke'),
    ('client_user', 'Korisnik klijenta: pregled i otvaranje servisnih zahtjeva')
) AS role_templates(name, description)
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE roles.name = role_templates.name);

UPDATE roles SET system_role = TRUE
WHERE name IN ('admin', 'project_manager', 'user', 'service_manager', 'technician',
               'warehouse_manager', 'metrology', 'client_admin', 'client_user');

INSERT INTO role_permissions(role_id, permission_id)
SELECT role.id, permission.id
FROM roles role CROSS JOIN permissions permission
WHERE role.name = 'admin'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions existing
    WHERE existing.role_id = role.id AND existing.permission_id = permission.id
);

WITH templates(role_name, permission_names) AS (
    VALUES
      ('service_manager', ARRAY[
        'view_dashboard','view_management','view_clients','view_stations','view_service_center',
        'view_service_requests','create_service_requests','update_service_requests',
        'reply_service_requests','view_work_orders','create_work_orders','update_work_orders',
        'manage_work_order_checklist','schedule_work_orders','complete_work_orders',
        'view_documents','create_documents','view_deadlines','manage_deadlines',
        'view_maintenance_plans','manage_maintenance_plans','view_inventory']),
      ('technician', ARRAY[
        'view_dashboard','view_stations','view_service_center','view_service_requests',
        'reply_service_requests','view_work_orders','manage_work_order_checklist',
        'record_work_order_activity','record_work_order_material','edit_work_order_field_report',
        'complete_work_orders','view_documents','create_documents','view_inventory']),
      ('warehouse_manager', ARRAY[
        'view_dashboard','view_inventory','manage_inventory_items',
        'manage_inventory_movements','manage_warehouses','view_work_orders']),
      ('metrology', ARRAY[
        'view_dashboard','view_clients','view_stations','view_service_center','manage_assets',
        'manage_asset_qr','view_documents','create_documents','delete_documents','view_deadlines',
        'manage_deadlines','view_inspections','create_inspections','view_work_orders',
        'create_work_orders','view_maintenance_plans','manage_maintenance_plans']),
      ('client_admin', ARRAY[
        'view_dashboard','view_clients','view_stations','view_service_center',
        'view_service_requests','create_service_requests','reply_service_requests',
        'view_work_orders','view_documents','view_deadlines','view_commercial',
        'view_maintenance_plans','view_profile','update_profile']),
      ('client_user', ARRAY[
        'view_dashboard','view_stations','view_service_center','view_service_requests',
        'create_service_requests','reply_service_requests','view_work_orders',
        'view_documents','view_deadlines','view_profile','update_profile'])
)
INSERT INTO role_permissions(role_id, permission_id)
SELECT role.id, permission.id
FROM templates
JOIN roles role ON role.name = templates.role_name
CROSS JOIN LATERAL unnest(templates.permission_names) AS expanded(permission_name)
JOIN permissions permission ON permission.name = permission_name
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions existing
    WHERE existing.role_id = role.id AND existing.permission_id = permission.id
);

-- Centralni dokumentni centar i automatizacija rokova (migracija 009)
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

-- Dispatch servisera i kontrola rasporeda (migracija 010)
ALTER TABLE work_orders
    ADD COLUMN IF NOT EXISTS scheduled_start_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS scheduled_end_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER NOT NULL DEFAULT 120,
    ADD COLUMN IF NOT EXISTS dispatch_status VARCHAR(30) NOT NULL DEFAULT 'planned',
    ADD COLUMN IF NOT EXISTS dispatch_notes TEXT;

CREATE INDEX IF NOT EXISTS work_orders_scheduled_range_idx
    ON work_orders(scheduled_start_at, scheduled_end_at)
    WHERE status NOT IN ('Completed', 'Cancelled');

CREATE TABLE IF NOT EXISTS technician_availability (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    availability_date DATE NOT NULL,
    start_time TIME NOT NULL DEFAULT TIME '00:00',
    end_time TIME NOT NULL DEFAULT TIME '23:59',
    status VARCHAR(30) NOT NULL DEFAULT 'unavailable',
    note TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT technician_availability_status_chk
        CHECK (status IN ('available', 'unavailable', 'vacation', 'sick_leave', 'training')),
    CONSTRAINT technician_availability_time_chk CHECK (end_time > start_time),
    UNIQUE(user_id, availability_date, start_time)
);

CREATE INDEX IF NOT EXISTS technician_availability_date_idx
    ON technician_availability(availability_date, user_id);

INSERT INTO permissions(name, module, action, description)
SELECT name, module, action, description
FROM (VALUES
    ('view_dispatch', 'work_orders', 'view', 'Pregled dispatch planera i opterećenja servisera'),
    ('manage_technician_availability', 'work_orders', 'manage', 'Upravljanje odsutnostima i raspoloživošću servisera')
) AS new_permissions(name, module, action, description)
WHERE NOT EXISTS (
    SELECT 1 FROM permissions p WHERE p.name = new_permissions.name
);

INSERT INTO role_permissions(role_id, permission_id)
SELECT DISTINCT rp.role_id, target.id
FROM role_permissions rp
JOIN permissions source ON source.id = rp.permission_id
JOIN permissions target ON target.name = 'view_dispatch'
WHERE source.name IN ('view_work_orders', 'view_management')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions existing
    WHERE existing.role_id = rp.role_id AND existing.permission_id = target.id
);

INSERT INTO role_permissions(role_id, permission_id)
SELECT DISTINCT rp.role_id, target.id
FROM role_permissions rp
JOIN permissions source ON source.id = rp.permission_id
JOIN permissions target ON target.name = 'manage_technician_availability'
WHERE source.name = 'schedule_work_orders'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions existing
    WHERE existing.role_id = rp.role_id AND existing.permission_id = target.id
);

-- Povijest promjena radnih naloga (migracija 011)
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

INSERT INTO schema_migrations(name)
VALUES ('FLOWAPP_FULL_DATABASE_UPGRADE')
ON CONFLICT (name) DO NOTHING;

COMMIT;
