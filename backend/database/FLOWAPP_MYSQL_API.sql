SET NAMES utf8mb4;

ALTER TABLE clients
  ADD COLUMN contact_person VARCHAR(255),
  ADD COLUMN address VARCHAR(500),
  ADD COLUMN idbroj VARCHAR(80),
  ADD COLUMN pdvbroj VARCHAR(80),
  ADD COLUMN sttn_broj VARCHAR(80),
  ADD COLUMN status BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN description TEXT,
  ADD COLUMN logo TEXT,
  ADD COLUMN loyalty_portal_only BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE clients SET idbroj=COALESCE(idbroj,tax_id),status=active;

ALTER TABLE projects
  ADD COLUMN city VARCHAR(255),
  ADD COLUMN gps_lat DECIMAL(10,7),
  ADD COLUMN gps_lng DECIMAL(10,7),
  ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN sttn VARCHAR(80);

UPDATE projects SET active=(status='active'),sttn=COALESCE(sttn,station_code);

CREATE TABLE IF NOT EXISTS roles (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(500),
  system_role BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS permissions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  module VARCHAR(100),
  action VARCHAR(100),
  description VARCHAR(500)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id BIGINT NOT NULL,
  permission_id BIGINT NOT NULL,
  PRIMARY KEY(role_id,permission_id),
  CONSTRAINT role_permissions_role_fk FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT role_permissions_permission_fk FOREIGN KEY(permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  firstname VARCHAR(120),
  lastname VARCHAR(120),
  contact VARCHAR(120),
  address VARCHAR(500),
  country VARCHAR(120) DEFAULT 'Bosna i Hercegovina',
  currency VARCHAR(20) DEFAULT 'BAM',
  roles_id BIGINT NOT NULL,
  status BOOLEAN NOT NULL DEFAULT TRUE,
  client_id BIGINT,
  loyalty_external_id VARCHAR(255),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT users_role_fk FOREIGN KEY(roles_id) REFERENCES roles(id),
  CONSTRAINT users_client_fk FOREIGN KEY(client_id) REFERENCES clients(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS auth_security_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT,
  email_hash CHAR(64),
  event_type VARCHAR(80) NOT NULL,
  success BOOLEAN NOT NULL,
  reason VARCHAR(255),
  ip_address VARCHAR(80),
  user_agent VARCHAR(500),
  request_id VARCHAR(120),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY auth_security_events_user_idx(user_id)
) ENGINE=InnoDB;

INSERT IGNORE INTO roles(name,description,system_role,active)
VALUES('admin','Administrator',TRUE,TRUE),('technician','Serviser',TRUE,TRUE),('client_user','Klijent',TRUE,TRUE);

INSERT IGNORE INTO permissions(name,module,action,description) VALUES
('view_projects','projects','view','Pregled stanica'),
('create_projects','projects','create','Dodavanje stanica'),
('update_projects','projects','update','Izmjena stanica'),
('delete_projects','projects','delete','Brisanje stanica'),
('view_clients','clients','view','Pregled klijenata'),
('create_clients','clients','create','Dodavanje klijenata'),
('update_clients','clients','update','Izmjena klijenata'),
('delete_clients','clients','delete','Brisanje klijenata'),
('view_equipment','equipment','view','Pregled opreme'),
('view_work_orders','work_orders','view','Pregled radnih naloga'),
('view_service_center','service','view','Pregled servisa');

INSERT IGNORE INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.name='admin';

INSERT IGNORE INTO schema_migrations(name) VALUES ('mysql-api-v1');
