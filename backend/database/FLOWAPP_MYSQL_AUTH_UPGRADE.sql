ALTER TABLE users
  ADD COLUMN username VARCHAR(120) UNIQUE AFTER email,
  ADD COLUMN password_scheme VARCHAR(30) NOT NULL DEFAULT 'bcrypt' AFTER password;

INSERT IGNORE INTO schema_migrations(name) VALUES ('mysql-auth-upgrade-v1');
