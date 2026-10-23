import mysql from "mysql2/promise";

const connectionString = process.env.MYSQL_URI;
if (!connectionString) throw new Error("MYSQL_URI is required");

const connection = await mysql.createConnection(connectionString);
try {
  const checks = [
    ["stations_without_client", "SELECT COUNT(*) count FROM projects WHERE client_id IS NULL", 0],
    ["assets_without_station", "SELECT COUNT(*) count FROM equipment_assets WHERE station_id IS NULL", 0],
    ["assets_without_client", "SELECT COUNT(*) count FROM equipment_assets WHERE client_id IS NULL", 0],
    ["calibrations_without_asset", "SELECT COUNT(*) count FROM equipment_calibrations WHERE asset_id IS NULL", 0],
    ["inspection_projects_without_station", "SELECT COUNT(*) count FROM inspection_projects WHERE station_id IS NULL", 0],
    ["work_orders_without_project", "SELECT COUNT(*) count FROM work_orders w LEFT JOIN inspection_projects p ON p.id=w.inspection_project_id WHERE p.id IS NULL", 0],
    ["inspection_results_without_asset", "SELECT COUNT(*) count FROM inspection_results WHERE asset_id IS NULL", 0],
    ["verification_marks_without_asset", "SELECT COUNT(*) count FROM verification_mark_usage WHERE asset_id IS NULL", 0],
    ["verification_marks_without_project", "SELECT COUNT(*) count FROM verification_mark_usage v LEFT JOIN inspection_projects p ON p.id=v.inspection_project_id WHERE p.id IS NULL", 0],
  ];
  let failed = false;
  for (const [name, sql, expected] of checks) {
    const [result] = await connection.query(sql);
    const actual = Number(result[0].count);
    const ok = actual === expected;
    console.log(`${ok ? "PASS" : "FAIL"}\t${name}\t${actual}`);
    failed ||= !ok;
  }
  const [counts] = await connection.query(`SELECT
    (SELECT COUNT(*) FROM clients) clients,
    (SELECT COUNT(*) FROM projects) stations,
    (SELECT COUNT(*) FROM equipment_assets) assets,
    (SELECT COUNT(*) FROM equipment_calibrations) calibrations,
    (SELECT COUNT(*) FROM inspection_projects) inspection_projects,
    (SELECT COUNT(*) FROM work_orders) work_orders,
    (SELECT COUNT(*) FROM inspection_results) inspection_results,
    (SELECT COUNT(*) FROM service_cases) service_cases,
    (SELECT COUNT(*) FROM service_events) service_events,
    (SELECT COUNT(*) FROM verification_mark_usage) verification_marks`);
  console.log(JSON.stringify(counts[0]));
  if (failed) process.exitCode = 1;
} finally {
  await connection.end();
}
