BEGIN;

ALTER TABLE entity_attachments
    ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE entity_attachments
    ADD COLUMN IF NOT EXISTS fleet_record_id BIGINT
        REFERENCES fleet_vehicle_records(id) ON DELETE CASCADE;
ALTER TABLE entity_attachments DROP CONSTRAINT IF EXISTS entity_attachments_parent_chk;
ALTER TABLE entity_attachments ADD CONSTRAINT entity_attachments_parent_chk CHECK (
    service_request_id IS NOT NULL OR work_order_id IS NOT NULL OR asset_id IS NOT NULL
    OR metrology_case_id IS NOT NULL OR fleet_record_id IS NOT NULL
);
CREATE INDEX IF NOT EXISTS entity_attachments_fleet_record_idx
    ON entity_attachments(fleet_record_id);

CREATE TABLE IF NOT EXISTS loyalty_programs (
    id BIGSERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    points_per_currency NUMERIC(12,4) NOT NULL DEFAULT 1,
    currency_per_point NUMERIC(12,4) NOT NULL DEFAULT 0.01,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    terms TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT loyalty_program_status_chk CHECK (status IN ('draft','active','paused','closed'))
);

CREATE TABLE IF NOT EXISTS loyalty_members (
    id BIGSERIAL PRIMARY KEY,
    program_id BIGINT NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    member_number VARCHAR(60) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(80),
    tier VARCHAR(40) NOT NULL DEFAULT 'standard',
    points_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
    lifetime_points NUMERIC(14,2) NOT NULL DEFAULT 0,
    marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT loyalty_member_status_chk CHECK (status IN ('active','blocked','inactive'))
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL REFERENCES loyalty_members(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL,
    points NUMERIC(14,2) NOT NULL,
    amount NUMERIC(14,2),
    reference VARCHAR(120),
    description TEXT,
    expires_at DATE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT loyalty_transaction_type_chk CHECK (
        transaction_type IN ('earn','redeem','adjustment','expire')
    )
);

CREATE TABLE IF NOT EXISTS loyalty_rewards (
    id BIGSERIAL PRIMARY KEY,
    program_id BIGINT NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    points_cost NUMERIC(14,2) NOT NULL,
    valid_from DATE,
    valid_until DATE,
    quantity_limit INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT loyalty_reward_status_chk CHECK (status IN ('draft','active','inactive'))
);

CREATE TABLE IF NOT EXISTS loyalty_campaigns (
    id BIGSERIAL PRIMARY KEY,
    program_id BIGINT NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'in_app',
    audience_tier VARCHAR(40),
    bonus_points NUMERIC(14,2),
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT loyalty_campaign_channel_chk CHECK (channel IN ('in_app','email','both')),
    CONSTRAINT loyalty_campaign_status_chk CHECK (status IN ('draft','scheduled','active','completed','cancelled'))
);

CREATE INDEX IF NOT EXISTS loyalty_members_program_idx ON loyalty_members(program_id,status);
CREATE INDEX IF NOT EXISTS loyalty_transactions_member_idx ON loyalty_transactions(member_id,created_at DESC);
CREATE INDEX IF NOT EXISTS loyalty_campaigns_client_idx ON loyalty_campaigns(client_id,status,starts_at);

INSERT INTO permissions(name,module,action,description)
SELECT name,module,action,description FROM (VALUES
    ('view_loyalty','loyalty','view','Pregled loyalty programa, članova, bodova i promocija'),
    ('manage_loyalty_program','loyalty','manage','Upravljanje loyalty programom i pravilima'),
    ('manage_loyalty_members','loyalty','manage','Upravljanje članovima i bodovima'),
    ('manage_loyalty_campaigns','loyalty','manage','Upravljanje nagradama i marketinškim kampanjama')
) item(name,module,action,description)
WHERE NOT EXISTS (SELECT 1 FROM permissions p WHERE p.name=item.name);

INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
WHERE r.name IN ('admin','project_manager','service_manager')
  AND p.name IN ('view_loyalty','manage_loyalty_program','manage_loyalty_members','manage_loyalty_campaigns')
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id=r.id AND rp.permission_id=p.id);
INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
WHERE r.name IN ('client_admin','client_user') AND p.name='view_loyalty'
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id=r.id AND rp.permission_id=p.id);

INSERT INTO email_notification_settings (
    client_id,event_type,enabled,send_to_client,send_to_assignee,send_to_managers
)
SELECT NULL,'fleet_deadline_reminder',TRUE,FALSE,TRUE,TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM email_notification_settings
    WHERE client_id IS NULL AND event_type='fleet_deadline_reminder'
);

COMMIT;
