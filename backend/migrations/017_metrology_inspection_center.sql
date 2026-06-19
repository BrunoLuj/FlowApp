BEGIN;

ALTER TABLE equipment_assets
    ADD COLUMN IF NOT EXISTS metrology_required BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS verification_interval_months INTEGER NOT NULL DEFAULT 12,
    ADD COLUMN IF NOT EXISTS metrology_standard VARCHAR(255),
    ADD COLUMN IF NOT EXISTS metrology_auto_order BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS metrology_lead_days INTEGER NOT NULL DEFAULT 30;

CREATE SEQUENCE IF NOT EXISTS metrology_inspection_number_seq START 1000;

CREATE TABLE IF NOT EXISTS metrology_inspections (
    id BIGSERIAL PRIMARY KEY,
    inspection_number VARCHAR(50) NOT NULL UNIQUE,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    station_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    asset_id BIGINT NOT NULL REFERENCES equipment_assets(id) ON DELETE RESTRICT,
    work_order_id INTEGER REFERENCES work_orders(id) ON DELETE SET NULL,
    inspection_type VARCHAR(40) NOT NULL DEFAULT 'verification',
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    result VARCHAR(30) NOT NULL DEFAULT 'pending',
    standard_reference VARCHAR(255),
    procedure_reference VARCHAR(255),
    inspected_at TIMESTAMPTZ,
    next_due_date DATE,
    temperature NUMERIC(8,2),
    humidity NUMERIC(8,2),
    installation_check BOOLEAN NOT NULL DEFAULT FALSE,
    label_check BOOLEAN NOT NULL DEFAULT FALSE,
    integrity_check BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    corrective_action TEXT,
    inspector_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    certificate_number VARCHAR(80),
    certificate_version INTEGER,
    certificate_attachment_id BIGINT REFERENCES entity_attachments(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT metrology_inspections_type_chk
        CHECK (inspection_type IN ('verification','calibration','inspection')),
    CONSTRAINT metrology_inspections_status_chk
        CHECK (status IN ('draft','in_progress','completed','approved','cancelled')),
    CONSTRAINT metrology_inspections_result_chk
        CHECK (result IN ('pending','passed','failed','conditional'))
);

CREATE OR REPLACE FUNCTION set_metrology_inspection_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.inspection_number IS NULL OR NEW.inspection_number = '' THEN
        NEW.inspection_number := 'MET-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' ||
            LPAD(NEXTVAL('metrology_inspection_number_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS metrology_inspection_number_trigger ON metrology_inspections;
CREATE TRIGGER metrology_inspection_number_trigger
BEFORE INSERT ON metrology_inspections
FOR EACH ROW EXECUTE FUNCTION set_metrology_inspection_number();

CREATE TABLE IF NOT EXISTS metrology_measurements (
    id BIGSERIAL PRIMARY KEY,
    inspection_id BIGINT NOT NULL REFERENCES metrology_inspections(id) ON DELETE CASCADE,
    sequence_no INTEGER NOT NULL DEFAULT 1,
    measurement_point VARCHAR(120),
    reference_value NUMERIC(18,6) NOT NULL,
    measured_value NUMERIC(18,6) NOT NULL,
    error_value NUMERIC(18,6) NOT NULL,
    tolerance_min NUMERIC(18,6),
    tolerance_max NUMERIC(18,6),
    unit VARCHAR(30) NOT NULL,
    passed BOOLEAN NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS metrology_inspections_due_idx
    ON metrology_inspections(next_due_date, status);
CREATE INDEX IF NOT EXISTS metrology_inspections_asset_idx
    ON metrology_inspections(asset_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS metrology_inspections_work_order_active_uq
    ON metrology_inspections(work_order_id)
    WHERE work_order_id IS NOT NULL AND status <> 'cancelled';
CREATE INDEX IF NOT EXISTS metrology_measurements_inspection_idx
    ON metrology_measurements(inspection_id, sequence_no);

INSERT INTO permissions(name,module,action,description)
SELECT name,module,action,description
FROM (VALUES
    ('view_metrology_center','metrology','view','Pregled mjeriteljskih rokova, sesija i certifikata'),
    ('manage_metrology_inspections','metrology','manage','Izrada i uređivanje mjeriteljskih pregleda'),
    ('approve_metrology_inspections','metrology','approve','Zaključavanje i odobravanje mjeriteljskih rezultata'),
    ('generate_metrology_certificates','metrology','execute','Generiranje PDF certifikata i potvrda')
) items(name,module,action,description)
WHERE NOT EXISTS (SELECT 1 FROM permissions p WHERE p.name=items.name);

INSERT INTO role_permissions(role_id,permission_id)
SELECT role.id,permission.id FROM roles role
JOIN permissions permission ON permission.name IN (
    'view_metrology_center','manage_metrology_inspections',
    'approve_metrology_inspections','generate_metrology_certificates'
)
WHERE role.name IN ('admin','project_manager','service_manager','metrology')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions existing
    WHERE existing.role_id=role.id AND existing.permission_id=permission.id
);

INSERT INTO role_permissions(role_id,permission_id)
SELECT role.id,permission.id FROM roles role
JOIN permissions permission ON permission.name IN (
    'view_metrology_center','manage_metrology_inspections'
)
WHERE role.name='technician'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions existing
    WHERE existing.role_id=role.id AND existing.permission_id=permission.id
);

COMMIT;
