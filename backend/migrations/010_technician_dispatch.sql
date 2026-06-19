BEGIN;

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
    CONSTRAINT technician_availability_time_chk
        CHECK (end_time > start_time),
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

COMMIT;
