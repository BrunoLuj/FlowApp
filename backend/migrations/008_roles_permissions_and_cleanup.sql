BEGIN;

ALTER TABLE roles
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS system_role BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE permissions
    ADD COLUMN IF NOT EXISTS module VARCHAR(80),
    ADD COLUMN IF NOT EXISTS action VARCHAR(40),
    ADD COLUMN IF NOT EXISTS description TEXT;

INSERT INTO permissions(name, module, action, description)
SELECT name, module, action, description
FROM (VALUES
    ('view_management', 'management', 'view', 'Pregled upravljačkih izvještaja i planera'),
    ('view_stations', 'stations', 'view', 'Pregled benzinskih stanica'),
    ('manage_assets', 'assets', 'manage', 'Dodavanje i uređivanje opreme'),
    ('delete_assets', 'assets', 'delete', 'Brisanje opreme'),
    ('create_documents', 'documents', 'create', 'Dodavanje i učitavanje dokumenata'),
    ('delete_documents', 'documents', 'delete', 'Brisanje dokumenata'),
    ('manage_asset_qr', 'assets', 'manage', 'Generiranje javnih QR poveznica opreme'),
    ('reply_service_requests', 'service_requests', 'update', 'Slanje poruka na servisnim zahtjevima'),
    ('manage_work_order_checklist', 'work_orders', 'update', 'Upravljanje checklistom radnog naloga'),
    ('record_work_order_activity', 'work_orders', 'execute', 'Evidentiranje rada i aktivnosti'),
    ('record_work_order_material', 'work_orders', 'execute', 'Evidentiranje utrošenog materijala'),
    ('edit_work_order_field_report', 'work_orders', 'execute', 'Uređivanje terenskog zapisnika i potpisa'),
    ('complete_work_orders', 'work_orders', 'complete', 'Završavanje radnih naloga'),
    ('schedule_work_orders', 'work_orders', 'schedule', 'Planiranje i dodjela radnih naloga'),
    ('manage_inventory_items', 'inventory', 'manage', 'Upravljanje artiklima skladišta'),
    ('manage_inventory_movements', 'inventory', 'execute', 'Evidentiranje ulaza i izlaza robe'),
    ('manage_warehouses', 'inventory', 'manage', 'Upravljanje skladišnim lokacijama'),
    ('manage_contracts', 'commercial', 'manage', 'Upravljanje ugovorima i SLA pravilima'),
    ('manage_quotations', 'commercial', 'manage', 'Izrada i uređivanje ponuda'),
    ('view_inspections', 'inspections', 'view', 'Pregled rezultata inspekcija'),
    ('create_inspections', 'inspections', 'create', 'Izrada i spremanje inspekcija'),
    ('view_roles', 'administration', 'view', 'Pregled rola i njihovih permisija'),
    ('manage_roles', 'administration', 'manage', 'Kreiranje rola i dodjela permisija')
) AS new_permissions(name, module, action, description)
WHERE NOT EXISTS (
    SELECT 1 FROM permissions current_permission
    WHERE current_permission.name = new_permissions.name
);

UPDATE permissions SET module = CASE
    WHEN name LIKE '%work_orders%' THEN 'work_orders'
    WHEN name LIKE '%service_requests%' THEN 'service_requests'
    WHEN name LIKE '%clients%' THEN 'clients'
    WHEN name LIKE '%projects%' THEN 'stations'
    WHEN name LIKE '%users%' OR name LIKE '%profile%' THEN 'administration'
    WHEN name LIKE '%documents%' THEN 'documents'
    WHEN name LIKE '%deadlines%' THEN 'deadlines'
    WHEN name LIKE '%inventory%' THEN 'inventory'
    WHEN name LIKE '%maintenance%' THEN 'maintenance'
    WHEN name LIKE '%commercial%' THEN 'commercial'
    WHEN name LIKE '%dashboard%' THEN 'dashboard'
    ELSE COALESCE(module, 'system')
END
WHERE module IS NULL;

UPDATE permissions SET action = CASE
    WHEN name LIKE 'view_%' THEN 'view'
    WHEN name LIKE 'create_%' THEN 'create'
    WHEN name LIKE 'update_%' THEN 'update'
    WHEN name LIKE 'delete_%' THEN 'delete'
    WHEN name LIKE 'manage_%' THEN 'manage'
    ELSE COALESCE(action, 'execute')
END
WHERE action IS NULL;

-- Postojeće role dobivaju ekvivalentna granularna prava.
WITH mappings(source_permission, target_permission) AS (
    VALUES
        ('view_dashboard', 'view_management'),
        ('view_clients', 'view_stations'),
        ('update_clients', 'manage_assets'),
        ('delete_clients', 'delete_assets'),
        ('manage_documents', 'create_documents'),
        ('manage_documents', 'delete_documents'),
        ('update_clients', 'manage_asset_qr'),
        ('view_service_requests', 'reply_service_requests'),
        ('update_work_orders', 'manage_work_order_checklist'),
        ('update_work_orders', 'record_work_order_activity'),
        ('update_work_orders', 'record_work_order_material'),
        ('update_work_orders', 'edit_work_order_field_report'),
        ('update_work_orders', 'complete_work_orders'),
        ('update_work_orders', 'schedule_work_orders'),
        ('manage_inventory', 'manage_inventory_items'),
        ('manage_inventory', 'manage_inventory_movements'),
        ('manage_inventory', 'manage_warehouses'),
        ('manage_commercial', 'manage_contracts'),
        ('manage_commercial', 'manage_quotations'),
        ('view_projects', 'view_inspections'),
        ('create_projects', 'create_inspections'),
        ('view_users', 'view_roles'),
        ('update_users', 'manage_roles')
)
INSERT INTO role_permissions(role_id, permission_id)
SELECT DISTINCT rp.role_id, target.id
FROM mappings
JOIN permissions source ON source.name = mappings.source_permission
JOIN permissions target ON target.name = mappings.target_permission
JOIN role_permissions rp ON rp.permission_id = source.id
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions existing
    WHERE existing.role_id = rp.role_id
      AND existing.permission_id = target.id
);

INSERT INTO roles(name, description, system_role, active)
SELECT name, description, TRUE, TRUE
FROM (VALUES
    ('service_manager', 'Voditelj servisa: zahtjevi, raspored, nalozi i dokumentacija'),
    ('technician', 'Serviser na terenu: izvršenje dodijeljenih radnih naloga'),
    ('warehouse_manager', 'Skladištar: artikli, lokacije i kretanje robe'),
    ('metrology', 'Mjeriteljstvo: oprema, rokovi, dokumenti i inspekcije'),
    ('client_admin', 'Administrator klijenta: stanice, zahtjevi i dokumentacija svoje tvrtke'),
    ('client_user', 'Korisnik klijenta: pregled i otvaranje servisnih zahtjeva')
) AS role_templates(name, description)
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE roles.name = role_templates.name);

UPDATE roles
SET system_role = TRUE,
    description = COALESCE(description, CASE name
        WHEN 'admin' THEN 'Administrator sustava s punim pristupom'
        WHEN 'project_manager' THEN 'Operativni voditelj postojećeg sustava'
        WHEN 'user' THEN 'Osnovna postojeća korisnička rola'
    END)
WHERE name IN ('admin', 'project_manager', 'user');

-- Administrator dobiva svaku sadašnju i buduću permisiju iz ove migracije.
INSERT INTO role_permissions(role_id, permission_id)
SELECT role.id, permission.id
FROM roles role
CROSS JOIN permissions permission
WHERE role.name = 'admin'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions existing
    WHERE existing.role_id = role.id AND existing.permission_id = permission.id
);

WITH role_permission_templates(role_name, permission_name) AS (
    VALUES
        ('service_manager','view_dashboard'), ('service_manager','view_management'),
        ('service_manager','view_clients'), ('service_manager','view_stations'),
        ('service_manager','view_service_center'), ('service_manager','view_service_requests'),
        ('service_manager','create_service_requests'), ('service_manager','update_service_requests'),
        ('service_manager','reply_service_requests'), ('service_manager','view_work_orders'),
        ('service_manager','create_work_orders'), ('service_manager','update_work_orders'),
        ('service_manager','manage_work_order_checklist'), ('service_manager','schedule_work_orders'),
        ('service_manager','complete_work_orders'), ('service_manager','view_documents'),
        ('service_manager','create_documents'), ('service_manager','view_deadlines'),
        ('service_manager','manage_deadlines'), ('service_manager','view_maintenance_plans'),
        ('service_manager','manage_maintenance_plans'), ('service_manager','view_inventory'),

        ('technician','view_dashboard'), ('technician','view_stations'),
        ('technician','view_service_center'), ('technician','view_service_requests'),
        ('technician','reply_service_requests'), ('technician','view_work_orders'),
        ('technician','manage_work_order_checklist'), ('technician','record_work_order_activity'),
        ('technician','record_work_order_material'), ('technician','edit_work_order_field_report'),
        ('technician','complete_work_orders'), ('technician','view_documents'),
        ('technician','create_documents'), ('technician','view_inventory'),

        ('warehouse_manager','view_dashboard'), ('warehouse_manager','view_inventory'),
        ('warehouse_manager','manage_inventory_items'), ('warehouse_manager','manage_inventory_movements'),
        ('warehouse_manager','manage_warehouses'), ('warehouse_manager','view_work_orders'),

        ('metrology','view_dashboard'), ('metrology','view_clients'), ('metrology','view_stations'),
        ('metrology','view_service_center'), ('metrology','manage_assets'),
        ('metrology','manage_asset_qr'), ('metrology','view_documents'),
        ('metrology','create_documents'), ('metrology','delete_documents'),
        ('metrology','view_deadlines'), ('metrology','manage_deadlines'),
        ('metrology','view_inspections'), ('metrology','create_inspections'),
        ('metrology','view_work_orders'), ('metrology','create_work_orders'),
        ('metrology','view_maintenance_plans'), ('metrology','manage_maintenance_plans'),

        ('client_admin','view_dashboard'), ('client_admin','view_clients'), ('client_admin','view_stations'),
        ('client_admin','view_service_center'), ('client_admin','view_service_requests'),
        ('client_admin','create_service_requests'), ('client_admin','reply_service_requests'),
        ('client_admin','view_work_orders'), ('client_admin','view_documents'),
        ('client_admin','view_deadlines'), ('client_admin','view_commercial'),
        ('client_admin','view_maintenance_plans'), ('client_admin','view_profile'),
        ('client_admin','update_profile'),

        ('client_user','view_dashboard'), ('client_user','view_stations'),
        ('client_user','view_service_center'), ('client_user','view_service_requests'),
        ('client_user','create_service_requests'), ('client_user','reply_service_requests'),
        ('client_user','view_work_orders'), ('client_user','view_documents'),
        ('client_user','view_deadlines'), ('client_user','view_profile'),
        ('client_user','update_profile')
)
INSERT INTO role_permissions(role_id, permission_id)
SELECT role.id, permission.id
FROM role_permission_templates template
JOIN roles role ON role.name = template.role_name
JOIN permissions permission ON permission.name = template.permission_name
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions existing
    WHERE existing.role_id = role.id AND existing.permission_id = permission.id
);

COMMIT;
