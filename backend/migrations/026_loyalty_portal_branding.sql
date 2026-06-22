BEGIN;

ALTER TABLE loyalty_programs
    ADD COLUMN IF NOT EXISTS brand_name VARCHAR(120),
    ADD COLUMN IF NOT EXISTS brand_tagline VARCHAR(200),
    ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) NOT NULL DEFAULT '#7C3AED',
    ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7) NOT NULL DEFAULT '#2563EB',
    ADD COLUMN IF NOT EXISTS accent_color VARCHAR(7) NOT NULL DEFAULT '#FBBF24',
    ADD COLUMN IF NOT EXISTS background_color VARCHAR(7) NOT NULL DEFAULT '#080B18',
    ADD COLUMN IF NOT EXISTS surface_color VARCHAR(7) NOT NULL DEFAULT '#111827',
    ADD COLUMN IF NOT EXISTS text_color VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
    ADD COLUMN IF NOT EXISTS muted_text_color VARCHAR(7) NOT NULL DEFAULT '#CBD5E1';

INSERT INTO permissions(name,module,action,description)
SELECT 'manage_loyalty_branding','loyalty','manage_branding',
       'Prilagodba boja, naziva i vizualnog identiteta Loyalty portala'
WHERE NOT EXISTS (
    SELECT 1 FROM permissions WHERE name='manage_loyalty_branding'
);

INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name IN ('admin','project_manager','service_manager','client_admin')
  AND p.name='manage_loyalty_branding'
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_id=r.id AND rp.permission_id=p.id
  );

COMMIT;
