import "dotenv/config";
import JWT from "jsonwebtoken";
import mysql from "mysql2/promise";

const db = await mysql.createConnection(process.env.MYSQL_URI);
try {
  const [users] = await db.query("SELECT u.id,u.roles_id FROM users u JOIN roles r ON r.id=u.roles_id WHERE r.name='admin' AND u.status=1 LIMIT 1");
  if (!users.length) throw new Error("Nema aktivnog administratora");
  const [permissions] = await db.query("SELECT p.name FROM role_permissions rp JOIN permissions p ON p.id=rp.permission_id WHERE rp.role_id=?", [users[0].roles_id]);
  const token = JWT.sign({ userId: users[0].id, roles_id: users[0].roles_id, permissions: permissions.map(item => item.name), client_id: null, loyalty_portal_only: false }, process.env.JWT_SECRET, { expiresIn: "5m", algorithm: "HS256" });
  const [inspectionOrders] = await db.query("SELECT work_order_id FROM metrology_inspections WHERE work_order_id IS NOT NULL LIMIT 1");
  const inspectionOrderPath = inspectionOrders.length ? `metrology/work-orders/${inspectionOrders[0].work_order_id}/inspections` : "metrology/work-orders/478/inspections";
  let failed = false;
  for (const path of ["translations/hr", "clients", "projects", "projects/active", "user/all", "roles", "service-center/dashboard", "service-center/stations", "service-requests", "work-orders", "work-orders/active", "work-orders/478/history", "work-orders/mobile/mine", inspectionOrderPath, "inventory", "inventory/available", "maintenance/overview", "maintenance/plans", "maintenance/assets", "commercial", "management/overview", "management/planner?from=2026-01-01&to=2026-12-31", "document-center", "email-center", "metrology/overview", "metrology/assets", "metrology-cases", "metrology-cases/options", "fleet", "fleet/options", "loyalty", "notifications"]) {
    const response = await fetch(`http://localhost:${process.env.PORT || 5000}/api-v1/${path}`, { headers: { Authorization: `Bearer ${token}` } });
    const body = await response.json().catch(() => null);
    console.log(`${response.ok ? "PASS" : "FAIL"}\t${path}\t${response.status}\t${Array.isArray(body) ? body.length : body?.message ?? body?.error ?? ""}`);
    failed ||= !response.ok;
  }
  if (failed) process.exitCode = 1;
} finally {
  await db.end();
}
