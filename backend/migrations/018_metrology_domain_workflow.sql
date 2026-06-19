BEGIN;

CREATE SEQUENCE IF NOT EXISTS metrology_case_number_seq START 1000;

CREATE TABLE IF NOT EXISTS metrology_cases (
    id BIGSERIAL PRIMARY KEY,
    case_number VARCHAR(50) NOT NULL UNIQUE,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    station_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    service_type VARCHAR(30) NOT NULL,
    inspection_kind VARCHAR(30) NOT NULL DEFAULT 'regular',
    status VARCHAR(30) NOT NULL DEFAULT 'request',
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    requested_by_name VARCHAR(255),
    contact_phone VARCHAR(100),
    request_description TEXT,
    attachments_description TEXT,
    work_started_at TIMESTAMPTZ,
    work_finished_at TIMESTAMPTZ,
    inspection_date DATE,
    approval_date DATE,
    location_text VARCHAR(500),
    method_reference VARCHAR(255),
    procedure_reference VARCHAR(255) NOT NULL DEFAULT 'PR-19',
    conformity_statement TEXT,
    verification_period_months INTEGER NOT NULL,
    next_verification_date DATE,
    result VARCHAR(30) NOT NULL DEFAULT 'pending',
    technical_manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT metrology_cases_service_type_chk
        CHECK (service_type IN ('volumeter','dipstick','tank','amn')),
    CONSTRAINT metrology_cases_inspection_kind_chk
        CHECK (inspection_kind IN ('regular','extraordinary')),
    CONSTRAINT metrology_cases_status_chk
        CHECK (status IN ('request','work_order','measurement','completed','approved','cancelled')),
    CONSTRAINT metrology_cases_result_chk
        CHECK (result IN ('pending','passed','failed','conditional'))
);

CREATE OR REPLACE FUNCTION set_metrology_case_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.case_number IS NULL OR NEW.case_number='' THEN
        NEW.case_number := 'MI-' || TO_CHAR(CURRENT_DATE,'YYYY') || '-' ||
            LPAD(NEXTVAL('metrology_case_number_seq')::TEXT,5,'0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS metrology_case_number_trigger ON metrology_cases;
CREATE TRIGGER metrology_case_number_trigger
BEFORE INSERT ON metrology_cases
FOR EACH ROW EXECUTE FUNCTION set_metrology_case_number();

ALTER TABLE entity_attachments
    ADD COLUMN IF NOT EXISTS metrology_case_id BIGINT
        REFERENCES metrology_cases(id) ON DELETE CASCADE;

ALTER TABLE entity_attachments
    DROP CONSTRAINT IF EXISTS entity_attachments_parent_chk;
ALTER TABLE entity_attachments
    ADD CONSTRAINT entity_attachments_parent_chk CHECK (
        service_request_id IS NOT NULL OR work_order_id IS NOT NULL
        OR asset_id IS NOT NULL OR metrology_case_id IS NOT NULL
    );

CREATE TABLE IF NOT EXISTS metrology_case_inspectors (
    case_id BIGINT NOT NULL REFERENCES metrology_cases(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY(case_id,user_id)
);

CREATE TABLE IF NOT EXISTS metrology_case_items (
    id BIGSERIAL PRIMARY KEY,
    case_id BIGINT NOT NULL REFERENCES metrology_cases(id) ON DELETE CASCADE,
    parent_item_id BIGINT REFERENCES metrology_case_items(id) ON DELETE CASCADE,
    item_type VARCHAR(30) NOT NULL,
    source_table VARCHAR(30),
    source_id INTEGER,
    name VARCHAR(255),
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    official_mark VARCHAR(255),
    apparatus_serial_number VARCHAR(255),
    tank_reference VARCHAR(255),
    fuel_type VARCHAR(80),
    nominal_capacity NUMERIC(18,3),
    measurement_range VARCHAR(100),
    verification_mark VARCHAR(100),
    seal_number VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT metrology_case_items_type_chk
        CHECK (item_type IN ('dispenser','volumeter','dipstick','tank','amn_probe')),
    CONSTRAINT metrology_case_items_status_chk
        CHECK (status IN ('pending','passed','failed','conditional'))
);

CREATE TABLE IF NOT EXISTS metrology_case_measurements (
    id BIGSERIAL PRIMARY KEY,
    case_item_id BIGINT NOT NULL REFERENCES metrology_case_items(id) ON DELETE CASCADE,
    measurement_group VARCHAR(50) NOT NULL,
    sequence_no INTEGER NOT NULL DEFAULT 1,
    values JSONB NOT NULL DEFAULT '{}'::jsonb,
    passed BOOLEAN,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS metrology_case_checks (
    id BIGSERIAL PRIMARY KEY,
    case_item_id BIGINT NOT NULL REFERENCES metrology_case_items(id) ON DELETE CASCADE,
    check_code VARCHAR(80) NOT NULL,
    label VARCHAR(255) NOT NULL,
    passed BOOLEAN,
    notes TEXT,
    UNIQUE(case_item_id,check_code)
);

CREATE TABLE IF NOT EXISTS metrology_case_standards (
    id BIGSERIAL PRIMARY KEY,
    case_id BIGINT NOT NULL REFERENCES metrology_cases(id) ON DELETE CASCADE,
    equipment_name VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(255),
    serial_number VARCHAR(255),
    calibration_certificate VARCHAR(255),
    valid_until DATE,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS metrology_case_documents (
    id BIGSERIAL PRIMARY KEY,
    case_id BIGINT NOT NULL REFERENCES metrology_cases(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    document_number VARCHAR(100) NOT NULL,
    version_no INTEGER NOT NULL DEFAULT 1,
    attachment_id BIGINT REFERENCES entity_attachments(id) ON DELETE SET NULL,
    generated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(case_id,document_type,version_no),
    CONSTRAINT metrology_case_documents_type_chk CHECK (
        document_type IN (
            'inspection_request','inspection_work_order','inspection_report',
            'inspection_certificate','verification_certificate'
        )
    )
);

CREATE INDEX IF NOT EXISTS metrology_cases_client_idx
    ON metrology_cases(client_id,status,request_date DESC);
CREATE INDEX IF NOT EXISTS metrology_case_items_case_idx
    ON metrology_case_items(case_id,item_type,sort_order);
CREATE INDEX IF NOT EXISTS metrology_case_measurements_item_idx
    ON metrology_case_measurements(case_item_id,measurement_group,sequence_no);

INSERT INTO permissions(name,module,action,description)
SELECT name,module,action,description FROM (VALUES
    ('view_metrology_cases','metrology','view','Pregled predmeta inspekcije i pripadajućih dokumenata'),
    ('manage_metrology_cases','metrology','manage','Upravljanje zahtjevima, nalozima, stavkama i rezultatima inspekcije'),
    ('generate_metrology_case_documents','metrology','execute','Generiranje zahtjeva, naloga, izvještaja i certifikata')
) items(name,module,action,description)
WHERE NOT EXISTS (SELECT 1 FROM permissions p WHERE p.name=items.name);

INSERT INTO role_permissions(role_id,permission_id)
SELECT role.id,permission.id FROM roles role
JOIN permissions permission ON permission.name IN (
    'view_metrology_cases','manage_metrology_cases','generate_metrology_case_documents'
)
WHERE role.name IN ('admin','project_manager','service_manager','metrology')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions existing
    WHERE existing.role_id=role.id AND existing.permission_id=permission.id
);

INSERT INTO role_permissions(role_id,permission_id)
SELECT role.id,permission.id FROM roles role
JOIN permissions permission ON permission.name IN ('view_metrology_cases','manage_metrology_cases')
WHERE role.name='technician'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions existing
    WHERE existing.role_id=role.id AND existing.permission_id=permission.id
);

COMMIT;
