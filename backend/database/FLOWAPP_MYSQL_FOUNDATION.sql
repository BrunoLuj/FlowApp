SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS schema_migrations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS clients (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  tax_id VARCHAR(80),
  phone VARCHAR(100),
  email VARCHAR(255),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY clients_tax_id_uq (tax_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS projects (
  id INT PRIMARY KEY,
  client_id BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL,
  station_code VARCHAR(80),
  phone VARCHAR(100),
  email VARCHAR(255),
  address VARCHAR(500),
  status VARCHAR(40) NOT NULL DEFAULT 'active',
  notes TEXT,
  desktop_station_id INT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY projects_desktop_station_uq (desktop_station_id),
  KEY projects_client_idx (client_id),
  CONSTRAINT projects_client_fk FOREIGN KEY (client_id) REFERENCES clients(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS equipment_assets (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  client_id BIGINT NOT NULL,
  station_id INT NOT NULL,
  parent_asset_id BIGINT,
  legacy_type VARCHAR(40) NOT NULL,
  legacy_id INT NOT NULL,
  category VARCHAR(80) NOT NULL,
  metrology_type VARCHAR(30),
  name VARCHAR(255) NOT NULL,
  manufacturer VARCHAR(255),
  model VARCHAR(255),
  serial_number VARCHAR(255),
  official_mark VARCHAR(255),
  fuel_type VARCHAR(80),
  status VARCHAR(40) NOT NULL DEFAULT 'active',
  notes TEXT,
  metadata JSON,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY equipment_legacy_uq (legacy_type,legacy_id),
  KEY equipment_station_idx (station_id,metrology_type),
  KEY equipment_parent_idx (parent_asset_id),
  CONSTRAINT equipment_client_fk FOREIGN KEY (client_id) REFERENCES clients(id),
  CONSTRAINT equipment_station_fk FOREIGN KEY (station_id) REFERENCES projects(id),
  CONSTRAINT equipment_parent_fk FOREIGN KEY (parent_asset_id) REFERENCES equipment_assets(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS equipment_calibrations (
  id BIGINT PRIMARY KEY,
  station_id INT NOT NULL,
  asset_id BIGINT,
  legacy_equipment_type VARCHAR(40),
  legacy_equipment_id INT,
  performed_on DATE,
  expires_on DATE,
  certificate_number VARCHAR(255),
  notes TEXT,
  is_voided BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3),
  created_by VARCHAR(255),
  KEY calibration_asset_idx (asset_id,performed_on),
  CONSTRAINT calibration_station_fk FOREIGN KEY (station_id) REFERENCES projects(id),
  CONSTRAINT calibration_asset_fk FOREIGN KEY (asset_id) REFERENCES equipment_assets(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS desktop_import_runs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  source_path VARCHAR(1000) NOT NULL,
  source_size BIGINT NOT NULL,
  source_modified_at DATETIME(3),
  stations_count INT NOT NULL,
  clients_count INT NOT NULL,
  assets_count INT NOT NULL,
  calibrations_count INT NOT NULL,
  imported_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  status VARCHAR(30) NOT NULL
) ENGINE=InnoDB;

INSERT IGNORE INTO schema_migrations(name) VALUES ('mysql-foundation-v1');
