BEGIN;

CREATE TABLE IF NOT EXISTS equipment_assets (
    id BIGSERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    station_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    category VARCHAR(80) NOT NULL,
    name VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    official_mark VARCHAR(255),
    fuel_type VARCHAR(80),
    status VARCHAR(40) NOT NULL DEFAULT 'active',
    installed_at DATE,
    last_service_at DATE,
    next_service_at DATE,
    last_calibration_at DATE,
    calibration_expires_at DATE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE equipment_assets
    ADD COLUMN IF NOT EXISTS asset_code VARCHAR(80),
    ADD COLUMN IF NOT EXISTS location_description VARCHAR(255),
    ADD COLUMN IF NOT EXISTS criticality VARCHAR(20) NOT NULL DEFAULT 'normal',
    ADD COLUMN IF NOT EXISTS warranty_expires_at DATE,
    ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS equipment_assets_asset_code_uq
    ON equipment_assets(asset_code)
    WHERE asset_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS equipment_assets_client_idx
    ON equipment_assets(client_id);
CREATE INDEX IF NOT EXISTS equipment_assets_station_idx
    ON equipment_assets(station_id);
CREATE INDEX IF NOT EXISTS equipment_assets_expiry_idx
    ON equipment_assets(calibration_expires_at);

ALTER TABLE service_requests
    ADD COLUMN IF NOT EXISTS closed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS converted_work_order_id INTEGER REFERENCES work_orders(id) ON DELETE SET NULL;

ALTER TABLE work_orders
    ADD COLUMN IF NOT EXISTS work_order_number VARCHAR(40),
    ADD COLUMN IF NOT EXISTS asset_id BIGINT REFERENCES equipment_assets(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS completed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS completion_notes TEXT,
    ADD COLUMN IF NOT EXISTS customer_signature_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS customer_signed_at TIMESTAMPTZ;

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

COMMIT;
