BEGIN;

ALTER TABLE loyalty_members
    ADD COLUMN IF NOT EXISTS card_token VARCHAR(64);
UPDATE loyalty_members
SET card_token=md5(random()::text || clock_timestamp()::text || id::text)
WHERE card_token IS NULL;
ALTER TABLE loyalty_members ALTER COLUMN card_token SET NOT NULL;
ALTER TABLE loyalty_members ALTER COLUMN card_token
    SET DEFAULT md5(random()::text || clock_timestamp()::text);
CREATE UNIQUE INDEX IF NOT EXISTS loyalty_members_card_token_uidx
    ON loyalty_members(card_token);

CREATE TABLE IF NOT EXISTS loyalty_tiers (
    id BIGSERIAL PRIMARY KEY,
    program_id BIGINT NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
    name VARCHAR(60) NOT NULL,
    min_lifetime_points NUMERIC(14,2) NOT NULL DEFAULT 0,
    color VARCHAR(30) NOT NULL DEFAULT '#7c3aed',
    benefits TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(program_id,name)
);

INSERT INTO loyalty_tiers(program_id,name,min_lifetime_points,color,benefits)
SELECT lp.id,t.name,t.points,t.color,t.benefits
FROM loyalty_programs lp
CROSS JOIN (VALUES
    ('Bronze',0,'#b45309','Osnovne pogodnosti i digitalna kartica'),
    ('Silver',1000,'#64748b','Prioritetne ponude i posebni kuponi'),
    ('Gold',3000,'#ca8a04','Ekskluzivne promocije i bonus bodovi'),
    ('Platinum',7500,'#7c3aed','Najviša razina pogodnosti i VIP ponude')
) t(name,points,color,benefits)
ON CONFLICT(program_id,name) DO NOTHING;

CREATE TABLE IF NOT EXISTS loyalty_redemptions (
    id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL REFERENCES loyalty_members(id) ON DELETE CASCADE,
    reward_id BIGINT NOT NULL REFERENCES loyalty_rewards(id) ON DELETE RESTRICT,
    transaction_id BIGINT REFERENCES loyalty_transactions(id) ON DELETE SET NULL,
    coupon_code VARCHAR(40) NOT NULL UNIQUE,
    points_spent NUMERIC(14,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    CONSTRAINT loyalty_redemption_status_chk CHECK (status IN ('active','used','expired','cancelled'))
);

CREATE TABLE IF NOT EXISTS loyalty_receipts (
    id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL REFERENCES loyalty_members(id) ON DELETE CASCADE,
    transaction_id BIGINT REFERENCES loyalty_transactions(id) ON DELETE SET NULL,
    receipt_number VARCHAR(120) NOT NULL,
    merchant_name VARCHAR(200),
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    document_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(member_id,receipt_number)
);

CREATE TABLE IF NOT EXISTS loyalty_points_audit (
    id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL REFERENCES loyalty_members(id) ON DELETE CASCADE,
    transaction_id BIGINT REFERENCES loyalty_transactions(id) ON DELETE SET NULL,
    action VARCHAR(30) NOT NULL,
    points_delta NUMERIC(14,2) NOT NULL,
    balance_before NUMERIC(14,2) NOT NULL,
    balance_after NUMERIC(14,2) NOT NULL,
    reason TEXT,
    actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS loyalty_redemptions_member_idx
    ON loyalty_redemptions(member_id,redeemed_at DESC);
CREATE INDEX IF NOT EXISTS loyalty_receipts_member_idx
    ON loyalty_receipts(member_id,purchased_at DESC);
CREATE INDEX IF NOT EXISTS loyalty_points_audit_member_idx
    ON loyalty_points_audit(member_id,created_at DESC);

INSERT INTO permissions(name,module,action,description)
SELECT 'view_loyalty_audit','loyalty','audit','Pregled sigurnosnog audita promjena bodova'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name='view_loyalty_audit');

INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
WHERE r.name IN ('admin','project_manager','service_manager')
  AND p.name='view_loyalty_audit'
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_id=r.id AND rp.permission_id=p.id
  );

COMMIT;
