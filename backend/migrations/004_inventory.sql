BEGIN;

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

CREATE INDEX IF NOT EXISTS inventory_items_name_idx
    ON inventory_items(name);
CREATE INDEX IF NOT EXISTS inventory_stock_item_idx
    ON inventory_stock(item_id);
CREATE INDEX IF NOT EXISTS inventory_movements_item_created_idx
    ON inventory_movements(item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS inventory_movements_work_order_idx
    ON inventory_movements(work_order_id);

INSERT INTO warehouse_locations(code, name)
VALUES ('MAIN', 'Glavno skladište')
ON CONFLICT (code) DO NOTHING;

INSERT INTO permissions(name)
SELECT permission_name
FROM (VALUES
    ('view_inventory'),
    ('manage_inventory')
) AS new_permissions(permission_name)
WHERE NOT EXISTS (
    SELECT 1 FROM permissions
    WHERE permissions.name = new_permissions.permission_name
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

COMMIT;
