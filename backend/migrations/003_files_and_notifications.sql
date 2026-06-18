BEGIN;

CREATE TABLE IF NOT EXISTS entity_attachments (
    id BIGSERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    station_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    service_request_id BIGINT REFERENCES service_requests(id) ON DELETE CASCADE,
    work_order_id INTEGER REFERENCES work_orders(id) ON DELETE CASCADE,
    asset_id BIGINT REFERENCES equipment_assets(id) ON DELETE SET NULL,
    title VARCHAR(255),
    file_name VARCHAR(255) NOT NULL,
    storage_key TEXT NOT NULL,
    mime_type VARCHAR(120),
    file_size BIGINT,
    visible_to_client BOOLEAN NOT NULL DEFAULT TRUE,
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT entity_attachments_parent_chk CHECK (
        service_request_id IS NOT NULL OR work_order_id IS NOT NULL OR asset_id IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS entity_attachments_client_idx
    ON entity_attachments(client_id);
CREATE INDEX IF NOT EXISTS entity_attachments_request_idx
    ON entity_attachments(service_request_id);
CREATE INDEX IF NOT EXISTS entity_attachments_work_order_idx
    ON entity_attachments(work_order_id);

CREATE TABLE IF NOT EXISTS notification_reads (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_key VARCHAR(255) NOT NULL,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, notification_key)
);

CREATE INDEX IF NOT EXISTS notification_reads_user_idx
    ON notification_reads(user_id);

COMMIT;
