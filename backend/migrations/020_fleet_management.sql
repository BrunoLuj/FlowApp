BEGIN;

CREATE TABLE IF NOT EXISTS fleet_vehicles (
    id BIGSERIAL PRIMARY KEY,
    registration_number VARCHAR(40) NOT NULL UNIQUE,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    vehicle_type VARCHAR(60) NOT NULL DEFAULT 'service_van',
    vin VARCHAR(80),
    manufacture_year INTEGER,
    first_registration_date DATE,
    current_odometer INTEGER NOT NULL DEFAULT 0,
    fuel_type VARCHAR(40),
    assigned_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    notes TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fleet_vehicles_status_chk
        CHECK (status IN ('active','in_service','inactive','sold')),
    CONSTRAINT fleet_vehicles_odometer_chk CHECK (current_odometer >= 0)
);

CREATE TABLE IF NOT EXISTS fleet_vehicle_records (
    id BIGSERIAL PRIMARY KEY,
    vehicle_id BIGINT NOT NULL REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
    record_type VARCHAR(40) NOT NULL,
    title VARCHAR(255) NOT NULL,
    performed_at DATE,
    due_date DATE,
    odometer INTEGER,
    next_odometer INTEGER,
    provider VARCHAR(255),
    document_number VARCHAR(120),
    cost NUMERIC(14,2),
    currency VARCHAR(3) NOT NULL DEFAULT 'BAM',
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    notes TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fleet_vehicle_records_type_chk CHECK (
        record_type IN (
            'registration','insurance','technical_inspection','service',
            'fire_extinguisher','tire','road_assistance','vignette','other'
        )
    ),
    CONSTRAINT fleet_vehicle_records_status_chk
        CHECK (status IN ('active','completed','cancelled')),
    CONSTRAINT fleet_vehicle_records_odometer_chk
        CHECK (odometer IS NULL OR odometer >= 0),
    CONSTRAINT fleet_vehicle_records_next_odometer_chk
        CHECK (next_odometer IS NULL OR next_odometer >= 0)
);

CREATE INDEX IF NOT EXISTS fleet_vehicle_records_due_idx
    ON fleet_vehicle_records(due_date) WHERE status='active';
CREATE INDEX IF NOT EXISTS fleet_vehicle_records_vehicle_idx
    ON fleet_vehicle_records(vehicle_id,record_type,performed_at DESC);
CREATE INDEX IF NOT EXISTS fleet_vehicles_status_idx
    ON fleet_vehicles(status,registration_number);

INSERT INTO permissions(name,module,action,description)
SELECT name,module,action,description FROM (VALUES
    ('view_fleet','fleet','view','Pregled vozila, registracija, servisa i rokova'),
    ('manage_fleet_vehicles','fleet','manage','Dodavanje i uređivanje vozila'),
    ('manage_fleet_records','fleet','manage','Upravljanje registracijama, servisima, PP aparatima i troškovima'),
    ('delete_fleet_records','fleet','delete','Brisanje evidencija voznog parka')
) permissions_to_add(name,module,action,description)
WHERE NOT EXISTS (
    SELECT 1 FROM permissions existing WHERE existing.name=permissions_to_add.name
);

INSERT INTO role_permissions(role_id,permission_id)
SELECT role.id,permission.id
FROM roles role
CROSS JOIN permissions permission
WHERE role.name IN ('admin','project_manager','service_manager')
  AND permission.name IN (
      'view_fleet','manage_fleet_vehicles','manage_fleet_records','delete_fleet_records'
  )
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions current_permission
      WHERE current_permission.role_id=role.id
        AND current_permission.permission_id=permission.id
  );

INSERT INTO role_permissions(role_id,permission_id)
SELECT role.id,permission.id
FROM roles role
CROSS JOIN permissions permission
WHERE role.name IN ('technician','warehouse_manager')
  AND permission.name='view_fleet'
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions current_permission
      WHERE current_permission.role_id=role.id
        AND current_permission.permission_id=permission.id
  );

COMMIT;
