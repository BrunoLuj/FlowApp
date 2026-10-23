import "dotenv/config";
import pg from "pg";
import mysql from "mysql2/promise";

const source = new pg.Pool({ connectionString: process.env.DATABASE_URI, ssl: { rejectUnauthorized: false } });
const target = await mysql.createConnection(process.env.MYSQL_URI);
const qi = (name) => `\`${String(name).replaceAll("`", "``")}\``;
const mapType = (column) => {
  const type = column.data_type;
  if (type === "smallint") return "SMALLINT";
  if (type === "integer") return "INT";
  if (type === "bigint") return "BIGINT";
  if (["numeric", "decimal", "real", "double precision"].includes(type)) return "DECIMAL(20,6)";
  if (type === "boolean") return "BOOLEAN";
  if (type === "date") return "DATE";
  if (type.startsWith("timestamp")) return "DATETIME(3)";
  if (type.startsWith("time")) return "TIME";
  if (["json", "jsonb", "ARRAY"].includes(type)) return "JSON";
  if (type === "bytea") return "LONGBLOB";
  if (type === "uuid") return "CHAR(36)";
  if (["character varying", "character"].includes(type)) return `VARCHAR(${Math.min(Number(column.character_maximum_length) || 500, 4000)})`;
  return "TEXT";
};

const pgTables = (await source.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(row => row.tablename);
const skipped = new Set(["schema_migrations"]);

try {
  for (const table of pgTables) {
    if (skipped.has(table)) continue;
    const columns = (await source.query(`SELECT column_name,data_type,udt_name,character_maximum_length,is_nullable,column_default
      FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, [table])).rows;
    const primary = (await source.query(`SELECT a.attname column_name
      FROM pg_index i JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey)
      WHERE i.indrelid=$1::regclass AND i.indisprimary ORDER BY array_position(i.indkey,a.attnum)`, [`public.${table}`])).rows.map(row => row.column_name);
    const [exists] = await target.query("SELECT COUNT(*) count FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=?", [table]);
    if (!Number(exists[0].count)) {
      const definitions = columns.map(column => {
        const auto = primary.length === 1 && primary[0] === column.column_name && /nextval\(/.test(column.column_default || "") && ["integer", "bigint"].includes(column.data_type);
        return `${qi(column.column_name)} ${mapType(column)}${auto ? " AUTO_INCREMENT" : ""}${column.is_nullable === "NO" && !auto ? " NOT NULL" : ""}`;
      });
      if (primary.length) definitions.push(`PRIMARY KEY (${primary.map(qi).join(",")})`);
      await target.query(`CREATE TABLE ${qi(table)} (${definitions.join(",")}) ENGINE=InnoDB`);
    } else {
      const [targetColumns] = await target.query("SELECT column_name AS name FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=?", [table]);
      const names = new Set(targetColumns.map(column => column.name));
      for (const column of columns) if (!names.has(column.column_name)) {
        await target.query(`ALTER TABLE ${qi(table)} ADD COLUMN ${qi(column.column_name)} ${mapType(column)} NULL`);
      }
    }
  }

  const pgRoles = (await source.query("SELECT * FROM roles ORDER BY id")).rows;
  for (const role of pgRoles) await target.execute(`INSERT INTO roles(name,description,system_role,active) VALUES(?,?,?,?)
    ON DUPLICATE KEY UPDATE description=VALUES(description),system_role=VALUES(system_role),active=VALUES(active)`,
    [role.name, role.description ?? null, Boolean(role.system_role), role.active !== false]);

  const pgPermissions = (await source.query("SELECT * FROM permissions ORDER BY id")).rows;
  for (const permission of pgPermissions) await target.execute(`INSERT INTO permissions(name,module,action,description) VALUES(?,?,?,?)
    ON DUPLICATE KEY UPDATE module=VALUES(module),action=VALUES(action),description=VALUES(description)`,
    [permission.name, permission.module ?? null, permission.action ?? null, permission.description ?? null]);

  const rolePermissions = (await source.query(`SELECT r.name role_name,p.name permission_name FROM role_permissions rp
    JOIN roles r ON r.id=rp.role_id JOIN permissions p ON p.id=rp.permission_id`)).rows;
  for (const link of rolePermissions) await target.execute(`INSERT IGNORE INTO role_permissions(role_id,permission_id)
    SELECT r.id,p.id FROM roles r JOIN permissions p WHERE r.name=? AND p.name=?`, [link.role_name, link.permission_name]);

  const [mysqlRoles] = await target.query("SELECT id,name FROM roles");
  const roleIds = new Map(mysqlRoles.map(role => [role.name, role.id]));
  const pgUsers = (await source.query(`SELECT u.*,r.name role_name FROM users u JOIN roles r ON r.id=u.roles_id ORDER BY u.id`)).rows;
  for (const user of pgUsers) {
    if (!user.email || !user.password) continue;
    await target.execute(`INSERT INTO users(email,username,password,password_scheme,firstname,lastname,contact,address,country,currency,roles_id,status,client_id,loyalty_external_id)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,NULL,?) ON DUPLICATE KEY UPDATE password=VALUES(password),password_scheme='bcrypt',firstname=VALUES(firstname),lastname=VALUES(lastname),contact=VALUES(contact),address=VALUES(address),country=VALUES(country),currency=VALUES(currency),roles_id=VALUES(roles_id),status=VALUES(status),loyalty_external_id=VALUES(loyalty_external_id)`,
      [String(user.email).toLowerCase(), user.username ?? null, user.password, "bcrypt", user.firstname ?? null, user.lastname ?? null, user.contact ?? null, user.address ?? null, user.country ?? null, user.currency ?? null, roleIds.get(user.role_name), user.status !== false, user.loyalty_external_id ?? null]);
  }

  for (const table of ["translations", "email_notification_settings"]) {
    if (!pgTables.includes(table)) continue;
    const sourceRows = (await source.query(`SELECT * FROM ${qi(table).replaceAll("`", '"')}`)).rows;
    if (!sourceRows.length) continue;
    const [targetColumns] = await target.query("SELECT column_name AS name FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=?", [table]);
    const available = new Set(targetColumns.map(column => column.name));
    for (const row of sourceRows) {
      const columns = Object.keys(row).filter(column => available.has(column));
      const values = columns.map(column => row[column] instanceof Date
        ? row[column].toISOString().slice(0, 23).replace("T", " ")
        : typeof row[column] === "object" && row[column] !== null ? JSON.stringify(row[column]) : row[column]);
      await target.execute(`REPLACE INTO ${qi(table)} (${columns.map(qi).join(",")}) VALUES (${columns.map(() => "?").join(",")})`, values);
    }
  }

  await target.query("INSERT IGNORE INTO schema_migrations(name) VALUES('postgres-feature-structure-v1')");
  const [summary] = await target.query(`SELECT
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()) tables_count,
    (SELECT COUNT(*) FROM roles) roles_count,
    (SELECT COUNT(*) FROM permissions) permissions_count,
    (SELECT COUNT(*) FROM role_permissions) role_permissions_count,
    (SELECT COUNT(*) FROM users) users_count`);
  console.log(JSON.stringify(summary[0]));
} finally {
  await source.end();
  await target.end();
}
