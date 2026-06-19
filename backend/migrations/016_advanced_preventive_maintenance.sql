BEGIN;

ALTER TABLE equipment_assets
    ADD COLUMN IF NOT EXISTS meter_value NUMERIC(14, 2),
    ADD COLUMN IF NOT EXISTS meter_unit VARCHAR(30),
    ADD COLUMN IF NOT EXISTS meter_updated_at TIMESTAMPTZ;

ALTER TABLE maintenance_plans
    ADD COLUMN IF NOT EXISTS trigger_type VARCHAR(30) NOT NULL DEFAULT 'calendar',
    ADD COLUMN IF NOT EXISTS meter_interval NUMERIC(14, 2),
    ADD COLUMN IF NOT EXISTS meter_lead NUMERIC(14, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS next_due_meter NUMERIC(14, 2),
    ADD COLUMN IF NOT EXISTS last_completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_completed_meter NUMERIC(14, 2),
    ADD COLUMN IF NOT EXISTS auto_generate BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS generation_horizon_days INTEGER NOT NULL DEFAULT 30;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_plans_trigger_type_chk'
    ) THEN
        ALTER TABLE maintenance_plans ADD CONSTRAINT maintenance_plans_trigger_type_chk
            CHECK (trigger_type IN ('calendar', 'meter', 'hybrid'));
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_plans_meter_interval_chk'
    ) THEN
        ALTER TABLE maintenance_plans ADD CONSTRAINT maintenance_plans_meter_interval_chk
            CHECK (meter_interval IS NULL OR meter_interval > 0);
    END IF;
END $$;

ALTER TABLE maintenance_plans
    ALTER COLUMN next_due_date DROP NOT NULL;

CREATE TABLE IF NOT EXISTS asset_meter_readings (
    id BIGSERIAL PRIMARY KEY,
    asset_id BIGINT NOT NULL REFERENCES equipment_assets(id) ON DELETE CASCADE,
    reading_value NUMERIC(14, 2) NOT NULL CHECK (reading_value >= 0),
    reading_unit VARCHAR(30) NOT NULL,
    reading_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source VARCHAR(30) NOT NULL DEFAULT 'manual',
    work_order_id INTEGER REFERENCES work_orders(id) ON DELETE SET NULL,
    note TEXT,
    recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS asset_meter_readings_asset_idx
    ON asset_meter_readings(asset_id, reading_at DESC);

CREATE TABLE IF NOT EXISTS maintenance_occurrences (
    id BIGSERIAL PRIMARY KEY,
    maintenance_plan_id BIGINT NOT NULL REFERENCES maintenance_plans(id) ON DELETE CASCADE,
    work_order_id INTEGER REFERENCES work_orders(id) ON DELETE SET NULL,
    due_date DATE,
    due_meter NUMERIC(14, 2),
    status VARCHAR(30) NOT NULL DEFAULT 'planned',
    generated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    completed_meter NUMERIC(14, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT maintenance_occurrences_status_chk
        CHECK (status IN ('planned', 'generated', 'completed', 'skipped', 'cancelled')),
    UNIQUE(maintenance_plan_id, due_date, due_meter)
);

ALTER TABLE work_orders
    ADD COLUMN IF NOT EXISTS maintenance_occurrence_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'work_orders_maintenance_occurrence_fk'
    ) THEN
        ALTER TABLE work_orders ADD CONSTRAINT work_orders_maintenance_occurrence_fk
            FOREIGN KEY (maintenance_occurrence_id)
            REFERENCES maintenance_occurrences(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS maintenance_occurrences_plan_idx
    ON maintenance_occurrences(maintenance_plan_id, status, due_date);
CREATE INDEX IF NOT EXISTS work_orders_maintenance_occurrence_idx
    ON work_orders(maintenance_occurrence_id);

INSERT INTO permissions(name, module, action, description)
SELECT 'record_asset_meter', 'maintenance', 'execute',
       'Evidentiranje očitanja sati, ciklusa ili kilometara opreme'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name='record_asset_meter');

INSERT INTO role_permissions(role_id, permission_id)
SELECT role.id, permission.id
FROM roles role
JOIN permissions permission ON permission.name='record_asset_meter'
WHERE role.name IN ('admin','project_manager','service_manager','technician','metrology')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions existing
    WHERE existing.role_id=role.id AND existing.permission_id=permission.id
);

COMMIT;
