SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS inspection_projects (
  id INT PRIMARY KEY,
  station_id INT,
  project_number VARCHAR(120),
  certificate_number VARCHAR(120),
  folder_name VARCHAR(500),
  inspection_module VARCHAR(120),
  customer_name VARCHAR(255),
  service_location VARCHAR(500),
  phone VARCHAR(100),
  customer_reference VARCHAR(120),
  created_at DATETIME(3),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  workflow_stage VARCHAR(120),
  KEY inspection_projects_station_idx (station_id),
  CONSTRAINT inspection_projects_station_fk FOREIGN KEY (station_id) REFERENCES projects(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS work_orders (
  id INT PRIMARY KEY,
  inspection_project_id INT NOT NULL,
  document_number VARCHAR(120),
  customer_reference VARCHAR(120),
  inspection_type VARCHAR(120),
  request_date DATE,
  service_deadline DATE,
  service_date DATE,
  start_time VARCHAR(20),
  end_time VARCHAR(20),
  workers TEXT,
  KEY work_orders_project_idx (inspection_project_id),
  CONSTRAINT work_orders_project_fk FOREIGN KEY (inspection_project_id) REFERENCES inspection_projects(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inspection_results (
  id INT PRIMARY KEY,
  inspection_project_id INT NOT NULL,
  asset_id BIGINT,
  module VARCHAR(120) NOT NULL,
  legacy_equipment_type VARCHAR(40) NOT NULL,
  legacy_equipment_id INT NOT NULL,
  result_status VARCHAR(120) NOT NULL,
  measured_value TEXT,
  deviation VARCHAR(120),
  finding TEXT,
  action_taken TEXT,
  detailed_results JSON,
  certificate_required BOOLEAN NOT NULL DEFAULT TRUE,
  recorded_at DATETIME(3),
  recorded_by VARCHAR(255),
  KEY inspection_results_project_idx (inspection_project_id),
  KEY inspection_results_asset_idx (asset_id),
  CONSTRAINT inspection_results_project_fk FOREIGN KEY (inspection_project_id) REFERENCES inspection_projects(id),
  CONSTRAINT inspection_results_asset_fk FOREIGN KEY (asset_id) REFERENCES equipment_assets(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS service_cases (
  id INT PRIMARY KEY,
  station_id INT,
  asset_id BIGINT,
  legacy_equipment_type VARCHAR(40) NOT NULL,
  legacy_equipment_id INT NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  KEY service_cases_station_idx (station_id,is_closed),
  KEY service_cases_asset_idx (asset_id),
  CONSTRAINT service_cases_station_fk FOREIGN KEY (station_id) REFERENCES projects(id),
  CONSTRAINT service_cases_asset_fk FOREIGN KEY (asset_id) REFERENCES equipment_assets(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS service_events (
  id INT PRIMARY KEY,
  service_case_id INT,
  station_id INT,
  asset_id BIGINT,
  legacy_equipment_type VARCHAR(40) NOT NULL,
  legacy_equipment_id INT NOT NULL,
  event_date DATE,
  event_type VARCHAR(160) NOT NULL,
  equipment_status VARCHAR(160) NOT NULL,
  symptom TEXT,
  diagnosis TEXT,
  work_performed TEXT,
  replaced_parts TEXT,
  technician VARCHAR(255),
  notes TEXT,
  priority VARCHAR(80),
  external_customer VARCHAR(255),
  external_location VARCHAR(500),
  external_contact VARCHAR(255),
  created_at DATETIME(3),
  created_by VARCHAR(255),
  KEY service_events_case_idx (service_case_id),
  KEY service_events_station_idx (station_id,event_date),
  KEY service_events_asset_idx (asset_id),
  CONSTRAINT service_events_case_fk FOREIGN KEY (service_case_id) REFERENCES service_cases(id),
  CONSTRAINT service_events_station_fk FOREIGN KEY (station_id) REFERENCES projects(id),
  CONSTRAINT service_events_asset_fk FOREIGN KEY (asset_id) REFERENCES equipment_assets(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS verification_mark_usage (
  id INT PRIMARY KEY,
  inspection_project_id INT NOT NULL,
  asset_id BIGINT,
  legacy_equipment_type VARCHAR(40) NOT NULL,
  legacy_equipment_id INT NOT NULL,
  module VARCHAR(120) NOT NULL,
  equipment_label VARCHAR(255),
  customer_name VARCHAR(255),
  service_location VARCHAR(500),
  used_on DATE NOT NULL,
  sticker_number VARCHAR(120),
  sticker_count INT NOT NULL DEFAULT 0,
  stamp_code VARCHAR(120),
  stamp_count INT NOT NULL DEFAULT 0,
  worker VARCHAR(255),
  notes TEXT,
  updated_at DATETIME(3),
  updated_by VARCHAR(255),
  KEY verification_project_idx (inspection_project_id,used_on),
  KEY verification_asset_idx (asset_id),
  CONSTRAINT verification_project_fk FOREIGN KEY (inspection_project_id) REFERENCES inspection_projects(id),
  CONSTRAINT verification_asset_fk FOREIGN KEY (asset_id) REFERENCES equipment_assets(id)
) ENGINE=InnoDB;

INSERT IGNORE INTO schema_migrations(name) VALUES ('mysql-operations-v1');
