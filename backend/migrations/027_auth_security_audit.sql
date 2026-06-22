BEGIN;

CREATE TABLE IF NOT EXISTS auth_security_events (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    email_hash VARCHAR(64),
    event_type VARCHAR(40) NOT NULL,
    success BOOLEAN NOT NULL DEFAULT FALSE,
    reason VARCHAR(80),
    ip_address VARCHAR(80),
    user_agent VARCHAR(500),
    request_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auth_security_events_created_idx
    ON auth_security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS auth_security_events_user_idx
    ON auth_security_events(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS auth_security_events_email_idx
    ON auth_security_events(email_hash,created_at DESC);

COMMIT;
