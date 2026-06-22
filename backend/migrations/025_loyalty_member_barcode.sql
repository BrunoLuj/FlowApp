BEGIN;

ALTER TABLE loyalty_members
    ADD COLUMN IF NOT EXISTS barcode_value VARCHAR(32);

UPDATE loyalty_members
SET barcode_value='FL' || UPPER(SUBSTRING(md5(
    card_token || id::text || clock_timestamp()::text
) FROM 1 FOR 18))
WHERE barcode_value IS NULL;

ALTER TABLE loyalty_members ALTER COLUMN barcode_value SET NOT NULL;
ALTER TABLE loyalty_members ALTER COLUMN barcode_value
    SET DEFAULT ('FL' || UPPER(SUBSTRING(md5(
        random()::text || clock_timestamp()::text
    ) FROM 1 FOR 18)));

CREATE UNIQUE INDEX IF NOT EXISTS loyalty_members_barcode_value_uidx
    ON loyalty_members(barcode_value);

COMMIT;
