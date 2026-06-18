BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT service_contracts_status_chk
        CHECK (status IN ('draft', 'active', 'expired', 'cancelled')),
    CONSTRAINT service_contracts_billing_chk
        CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly', 'one_time'))
);

CREATE TABLE IF NOT EXISTS contract_stations (
    contract_id BIGINT NOT NULL REFERENCES service_contracts(id) ON DELETE CASCADE,
    station_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    PRIMARY KEY(contract_id, station_id)
);

ALTER TABLE service_requests
    ADD COLUMN IF NOT EXISTS service_contract_id BIGINT
        REFERENCES service_contracts(id) ON DELETE SET NULL,
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
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT quotations_status_chk
        CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'cancelled'))
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
    sort_order INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT quotation_items_type_chk
        CHECK (item_type IN ('service', 'labor', 'material', 'travel', 'other'))
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

CREATE INDEX IF NOT EXISTS service_contracts_client_idx
    ON service_contracts(client_id, status);
CREATE INDEX IF NOT EXISTS service_contracts_end_idx
    ON service_contracts(end_date);
CREATE INDEX IF NOT EXISTS service_requests_contract_idx
    ON service_requests(service_contract_id);
CREATE INDEX IF NOT EXISTS service_requests_sla_due_idx
    ON service_requests(resolution_due_at)
    WHERE status NOT IN ('resolved', 'cancelled');
CREATE INDEX IF NOT EXISTS quotations_client_idx
    ON quotations(client_id, status);
CREATE INDEX IF NOT EXISTS quotations_valid_until_idx
    ON quotations(valid_until);
CREATE INDEX IF NOT EXISTS quotation_items_quotation_idx
    ON quotation_items(quotation_id, sort_order);

INSERT INTO permissions(name)
SELECT permission_name
FROM (VALUES
    ('view_commercial'),
    ('manage_commercial')
) AS new_permissions(permission_name)
WHERE NOT EXISTS (
    SELECT 1 FROM permissions
    WHERE permissions.name = new_permissions.permission_name
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

COMMIT;
