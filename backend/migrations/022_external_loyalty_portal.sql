BEGIN;

ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS loyalty_portal_only BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS loyalty_external_id VARCHAR(150);
CREATE INDEX IF NOT EXISTS users_loyalty_external_id_idx
    ON users(loyalty_external_id) WHERE loyalty_external_id IS NOT NULL;

COMMIT;
