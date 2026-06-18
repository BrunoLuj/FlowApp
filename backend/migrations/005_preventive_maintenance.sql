BEGIN;

ALTER TABLE equipment_assets
    ADD COLUMN IF NOT EXISTS public_token UUID,
    ADD COLUMN IF NOT EXISTS qr_enabled BOOLEAN NOT NULL DEFAULT TRUE;

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

CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE equipment_assets
SET public_token = gen_random_uuid()
WHERE public_token IS NULL;

ALTER TABLE equipment_assets
    ALTER COLUMN public_token SET DEFAULT gen_random_uuid();

INSERT INTO permissions(name)
SELECT permission_name
FROM (VALUES
    ('view_maintenance_plans'),
    ('manage_maintenance_plans')
) AS new_permissions(permission_name)
WHERE NOT EXISTS (
    SELECT 1 FROM permissions
    WHERE permissions.name = new_permissions.permission_name
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

COMMIT;
