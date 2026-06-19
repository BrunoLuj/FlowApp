BEGIN;

ALTER TABLE equipment_assets
    ADD COLUMN IF NOT EXISTS metrology_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS metrology_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS parent_asset_id BIGINT REFERENCES equipment_assets(id) ON DELETE RESTRICT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname='equipment_assets_metrology_type_chk'
    ) THEN
        ALTER TABLE equipment_assets ADD CONSTRAINT equipment_assets_metrology_type_chk
            CHECK (metrology_type IS NULL OR metrology_type IN (
                'dispenser','volumeter','tank','amn_probe','dipstick','standard'
            ));
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname='equipment_assets_not_self_parent_chk'
    ) THEN
        ALTER TABLE equipment_assets ADD CONSTRAINT equipment_assets_not_self_parent_chk
            CHECK (parent_asset_id IS NULL OR parent_asset_id<>id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS equipment_assets_parent_idx
    ON equipment_assets(parent_asset_id);
CREATE INDEX IF NOT EXISTS equipment_assets_station_metrology_idx
    ON equipment_assets(station_id,metrology_type)
    WHERE metrology_type IS NOT NULL;

UPDATE equipment_assets SET metrology_type=CASE
    WHEN LOWER(category||' '||name) ~ 'volumetar|mjerilo protoka' THEN 'volumeter'
    WHEN LOWER(category||' '||name) ~ 'aparat|agregat|dispenser' THEN 'dispenser'
    WHEN LOWER(category||' '||name) ~ 'rezervoar|spremnik|tank' THEN 'tank'
    WHEN LOWER(category||' '||name) ~ 'amn|sonda|nivo' THEN 'amn_probe'
    WHEN LOWER(category||' '||name) ~ 'mjerna letva|letva' THEN 'dipstick'
    ELSE metrology_type
END
WHERE metrology_type IS NULL;

COMMIT;
