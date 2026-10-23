import "dotenv/config";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import mysql from "mysql2/promise";

const defaultSource = "C:\\Users\\Caljkusic1\\Desktop\\Word\\Data\\BenzinskaWorkflow-20260901-recovered.db";
const sourcePath = process.argv[2] || process.env.DESKTOP_SQLITE_PATH || defaultSource;
const connectionString = process.env.MYSQL_URI;
if (!connectionString) throw new Error("MYSQL_URI is required");
if (!fs.existsSync(sourcePath)) throw new Error(`Desktop database not found: ${sourcePath}`);

const sqlite = new Database(sourcePath, { readonly: true, fileMustExist: true });
const target = await mysql.createConnection(connectionString);
const rows = (sql, params = []) => sqlite.prepare(sql).all(...params);
const text = (value) => value == null ? null : String(value).trim() || null;
const isoDate = (value) => text(value)?.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null;
const dateTime = (value) => {
  const raw = text(value);
  if (!raw) return null;
  const match = raw.match(/(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?/);
  if (match) return `${match[1]} ${match[2]}.${(match[3] || "0").padEnd(3, "0").slice(0, 3)}`;
  const day = isoDate(raw);
  return day ? `${day} 00:00:00.000` : null;
};
const normalizeType = (type) => ({ MeasuringRods: "Rods" }[type] ?? type);
const activeValue=value=>String(value??"1").toLowerCase()!=="0"&&!/neaktivan|inactive/.test(String(value??"").toLowerCase());
const statusForProject = (stage, active) => {
  const key = (text(stage) || "").toLocaleLowerCase("bs");
  if (!active || /zavr|gotov|arhiv|zatvor/.test(key)) return "Completed";
  if (/teren|izvr|obrada|pregled/.test(key)) return "In Progress";
  if (/otkaz/.test(key)) return "Cancelled";
  return "Planned";
};
const requestStatus = (closed, last) => {
  if (closed) return "resolved";
  const value = `${last?.EquipmentStatus || ""} ${last?.EventType || ""}`.toLocaleLowerCase("bs");
  if (/čeka|ceka|dio|nastav/.test(value)) return "in_progress";
  return "open";
};
const priority = (value) => {
  const key = (text(value) || "").toLocaleLowerCase("bs");
  if (/hit|krit|urgent/.test(key)) return "urgent";
  if (/visok|high/.test(key)) return "high";
  if (/nizak|low/.test(key)) return "low";
  return "normal";
};
const resultValue = (value) => {
  const key = (text(value) || "").toLocaleLowerCase("bs");
  if (/ispravno|zadovoljava|prolaz|pass/.test(key) && !/neispravno|ne zadovoljava/.test(key)) return "passed";
  if (/neispravno|ne zadovoljava|fail/.test(key)) return "failed";
  return "pending";
};
const mimeType = (name) => ({
  ".pdf": "application/pdf", ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
}[path.extname(name || "").toLowerCase()] || "application/octet-stream");

const moduleLabel = (value) => ({
  AMN: "Automatska mjerila", Volumeters: "Volumetri", VolumeMeters: "Volumetri",
  Tanks: "Rezervoari", Rods: "Mjerne letve", MeasuringRods: "Mjerne letve",
}[value] || text(value) || "Inspekcija");

const ensureSchema = async () => {
  await target.query("ALTER TABLE work_orders MODIFY inspection_project_id INT NULL");
  const additions = [
    ["service_requests", "desktop_service_case_id", "BIGINT NULL"],
    ["metrology_inspections", "desktop_result_id", "BIGINT NULL"],
    ["metrology_inspections", "field_data", "JSON NULL"],
    ["documents", "desktop_attachment_id", "BIGINT NULL"],
    ["compliance_deadlines", "desktop_calibration_id", "BIGINT NULL"],
  ];
  for (const [table, column, definition] of additions) {
    const [existing] = await target.execute("SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=?", [table, column]);
    if (!existing.length) await target.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
  const statements = [
    "CREATE UNIQUE INDEX service_requests_desktop_case_uq ON service_requests(desktop_service_case_id)",
    "CREATE UNIQUE INDEX metrology_inspections_desktop_result_uq ON metrology_inspections(desktop_result_id)",
    "CREATE UNIQUE INDEX documents_desktop_attachment_uq ON documents(desktop_attachment_id)",
    "CREATE UNIQUE INDEX compliance_deadlines_desktop_calibration_uq ON compliance_deadlines(desktop_calibration_id)",
  ];
  for (const sql of statements) {
    try { await target.query(sql); }
    catch (error) {
      if (![1060, 1061].includes(error.errno)) throw error;
    }
  }
};

const syncStations=async()=>{
  const sourceStations=rows('SELECT * FROM "Lista_Pumpi" ORDER BY ID');const clientIds=new Map();
  for(const station of sourceStations){
    const rawTax=text(station.IDbroj);const tax=rawTax&&rawTax.replace(/\D/g,"").length>=6?rawTax:null;
    const key=tax||`name:${(text(station.Narucitelj)||station.ID).toLocaleLowerCase("hr")}`;if(clientIds.has(key))continue;
    const company=text(station.Narucitelj)||`Klijent stanice ${station.ID}`;
    let [found]=tax?await target.execute("SELECT id FROM clients WHERE tax_id=? ORDER BY id LIMIT 1",[tax]):await target.execute("SELECT id FROM clients WHERE tax_id IS NULL AND LOWER(TRIM(company_name))=LOWER(TRIM(?)) ORDER BY id LIMIT 1",[company]);
    if(!found.length){await target.execute("INSERT INTO clients(company_name,tax_id,phone,email,active) VALUES(?,?,?,?,?)",[company,tax,text(station.Telefon),text(station.Email),activeValue(station.Status)]);[found]=await target.execute("SELECT id FROM clients WHERE tax_id <=> ? AND LOWER(TRIM(company_name))=LOWER(TRIM(?)) ORDER BY id DESC LIMIT 1",[tax,company]);}
    else await target.execute("UPDATE clients SET company_name=?,phone=?,email=?,active=? WHERE id=?",[company,text(station.Telefon),text(station.Email),activeValue(station.Status),found[0].id]);
    clientIds.set(key,Number(found[0].id));
  }
  for(const station of sourceStations){const rawTax=text(station.IDbroj);const tax=rawTax&&rawTax.replace(/\D/g,"").length>=6?rawTax:null;const key=tax||`name:${(text(station.Narucitelj)||station.ID).toLocaleLowerCase("hr")}`;
    await target.execute(`UPDATE projects SET client_id=?,name=?,station_code=?,phone=?,email=?,address=?,status=?,notes=?,updated_at=CURRENT_TIMESTAMP(3) WHERE desktop_station_id=?`,[clientIds.get(key),text(station.Mjesto_izvrsenja_usluge)||text(station.Narucitelj)||`Stanica ${station.ID}`,text(station.FMT_STTN_broj),text(station.Telefon),text(station.Email),text(station.Mjesto_izvrsenja_usluge),activeValue(station.Status)?"active":"inactive",text(station.Napomena),station.ID]);
  }
  return sourceStations.length;
};

await syncStations();

const [assetRows] = await target.query("SELECT id,legacy_type,legacy_id,client_id,station_id,name FROM equipment_assets");
const assets = new Map(assetRows.map((item) => [`${item.legacy_type}:${item.legacy_id}`, item]));
const assetFor = (type, id) => assets.get(`${normalizeType(type)}:${id}`) || null;
const [projectRows] = await target.query("SELECT id,station_id,project_number,inspection_module,customer_name,created_at,is_active,workflow_stage FROM inspection_projects");
const projects = new Map(projectRows.map((item) => [Number(item.id), item]));
const [stationRows] = await target.query("SELECT p.id,p.client_id,c.company_name FROM projects p JOIN clients c ON c.id=p.client_id");
const stations = new Map(stationRows.map((item) => [Number(item.id), item]));
const personKey = (input) => (text(input) || "").toLocaleLowerCase("bs").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
const [userRows] = await target.query("SELECT id,firstname,lastname,email FROM users WHERE status=TRUE");
const userIds = new Map();
for (const user of userRows) {
  for (const candidate of [`${user.firstname || ""} ${user.lastname || ""}`, user.firstname, user.lastname, user.email?.split("@")[0]]) {
    const normalized = personKey(candidate);
    if (normalized && !userIds.has(normalized)) userIds.set(normalized, Number(user.id));
  }
}

const syncWorkOrders = async () => {
  let count = 0;
  for (const item of rows('SELECT * FROM "WorkOrders"')) {
    const project = projects.get(Number(item.ProjectID));
    if (!project?.station_id) continue;
    const station = stations.get(Number(project.station_id));
    const workerNames = (text(item.Workers) || "").split(/[,;]+/).map((x) => x.trim()).filter(Boolean);
    const workers = [...new Set(workerNames.map((name) => userIds.get(personKey(name))).filter(Boolean))];
    const title = `${moduleLabel(project.inspection_module || item.InspectionType)} — ${station?.company_name || project.customer_name || project.project_number || item.ProjectID}`;
    await target.execute(`UPDATE work_orders SET project_id=?,station_id=?,work_order_number=COALESCE(NULLIF(document_number,''),?),type=?,title=?,description=?,status=?,assigned_to=?,planned_date=COALESCE(service_date,service_deadline,request_date,DATE(created_at)),start_date=COALESCE(start_date,request_date),end_date=COALESCE(end_date,service_date),created_at=COALESCE(created_at,?),updated_at=CURRENT_TIMESTAMP(3) WHERE id=?`,
      [project.station_id, project.station_id, `RN-${item.WorkOrderID}`, text(item.InspectionType) || project.inspection_module || "inspection", title, `Desktop projekt ${project.project_number || item.ProjectID}`, statusForProject(project.workflow_stage, project.is_active), JSON.stringify(workers), dateTime(project.created_at) || new Date(), item.WorkOrderID]);
    count++;
  }
  return count;
};

const syncAssetsAndDeadlines = async () => {
  const latestService = new Map(rows('SELECT EquipmentType,EquipmentId,MAX(EventDate) LastService FROM "EquipmentServiceEvents" GROUP BY EquipmentType,EquipmentId').map((x) => [`${normalizeType(x.EquipmentType)}:${x.EquipmentId}`, isoDate(x.LastService)]));
  const calibrations = rows('SELECT * FROM "EquipmentCalibrations" WHERE COALESCE(IsVoided,0)=0 ORDER BY CalibrationId');
  const latest = new Map();
  for (const calibration of calibrations) {
    const key = `${normalizeType(calibration.EquipmentType)}:${calibration.EquipmentId}`;
    const previous = latest.get(key);
    if (!previous || (isoDate(calibration.ExpiresOn) || "") >= (isoDate(previous.ExpiresOn) || "")) latest.set(key, calibration);
  }
  for (const [key, asset] of assets) {
    const calibration = latest.get(key);
    const code = text(asset.asset_code) || `${key.split(":")[0]}-${key.split(":")[1]}`;
    await target.execute("UPDATE equipment_assets SET asset_code=?,metrology_required=?,metrology_enabled=?,calibration_expires_at=?,last_service_at=?,updated_at=CURRENT_TIMESTAMP(3) WHERE id=?",
      [code, Boolean(calibration), true, isoDate(calibration?.ExpiresOn), latestService.get(key) || null, asset.id]);
  }
  let deadlineCount = 0;
  for (const calibration of latest.values()) {
    const asset = assetFor(calibration.EquipmentType, calibration.EquipmentId);
    const station = stations.get(Number(calibration.StationId));
    if (!asset || !station || !isoDate(calibration.ExpiresOn)) continue;
    const status = isoDate(calibration.ExpiresOn) < new Date().toISOString().slice(0, 10) ? "overdue" : "open";
    await target.execute(`INSERT INTO compliance_deadlines(client_id,station_id,asset_id,deadline_type,title,due_date,warning_days,status,notes,created_at,updated_at,reminder_days,desktop_calibration_id) VALUES(?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3),?,?) ON DUPLICATE KEY UPDATE client_id=VALUES(client_id),station_id=VALUES(station_id),asset_id=VALUES(asset_id),title=VALUES(title),due_date=VALUES(due_date),status=VALUES(status),notes=VALUES(notes),reminder_days=VALUES(reminder_days),updated_at=CURRENT_TIMESTAMP(3)`,
      [station.client_id, calibration.StationId, asset.id, "calibration", `Rok umjeravanja — ${asset.name}`, isoDate(calibration.ExpiresOn), 30, status, text(calibration.Notes), JSON.stringify([30, 14, 7]), calibration.CalibrationId]);
    deadlineCount++;
  }
  return { assets: assets.size, deadlines: deadlineCount };
};

const syncServiceRequests = async () => {
  const eventRows = rows('SELECT e.*,ce.CaseId FROM "EquipmentServiceEvents" e LEFT JOIN "ServiceCaseEvents" ce ON ce.ServiceEventId=e.ServiceEventId ORDER BY e.EventDate,e.ServiceEventId');
  const byCase = new Map();
  for (const event of eventRows) if (event.CaseId != null) (byCase.get(Number(event.CaseId)) || byCase.set(Number(event.CaseId), []).get(Number(event.CaseId))).push(event);
  let count = 0;
  for (const item of rows('SELECT * FROM "ServiceCases"')) {
    const station = stations.get(Number(item.StationId));
    if (!station) continue;
    const events = byCase.get(Number(item.CaseId)) || [];
    const first = events[0] || {};
    const last = events.at(-1) || first;
    const asset = assetFor(item.EquipmentType, item.EquipmentId);
    const description = [first.Symptom, first.Notes, last.Diagnosis && `Dijagnoza: ${last.Diagnosis}`, last.WorkPerformed && `Izvršeni radovi: ${last.WorkPerformed}`].filter(Boolean).join("\n") || "Servisni slučaj preuzet iz desktop aplikacije.";
    await target.execute(`INSERT INTO service_requests(request_number,client_id,station_id,asset_id,requested_by,assigned_to,category,priority,status,subject,description,desired_date,scheduled_at,resolved_at,created_at,updated_at,sla_paused_seconds,escalation_level,desktop_service_case_id) VALUES(?,?,?,?,NULL,NULL,?,?,?,?,?,?,?,?,?,?,0,0,?) ON DUPLICATE KEY UPDATE client_id=VALUES(client_id),station_id=VALUES(station_id),asset_id=VALUES(asset_id),priority=VALUES(priority),status=VALUES(status),subject=VALUES(subject),description=VALUES(description),scheduled_at=VALUES(scheduled_at),resolved_at=VALUES(resolved_at),updated_at=VALUES(updated_at)`,
      [`SR-DESK-${item.CaseId}`, station.client_id, item.StationId, asset?.id || null, text(last.EventType) || "service", priority(last.Priority), requestStatus(item.IsClosed, last), `${asset?.name || moduleLabel(item.EquipmentType)} — ${text(first.Symptom) || text(first.EventType) || "servis"}`, description, isoDate(first.EventDate), dateTime(first.CreatedAt) || isoDate(first.EventDate), item.IsClosed ? (dateTime(last.CreatedAt) || isoDate(last.EventDate)) : null, dateTime(first.CreatedAt) || isoDate(first.EventDate) || new Date(), dateTime(last.CreatedAt) || isoDate(last.EventDate) || new Date(), item.CaseId]);
    count++;
  }
  return count;
};

const syncInspections = async () => {
  const [orders] = await target.query("SELECT id,inspection_project_id FROM work_orders WHERE inspection_project_id IS NOT NULL");
  const orderByProject = new Map(orders.map((x) => [Number(x.inspection_project_id), Number(x.id)]));
  let count = 0;
  for (const item of rows('SELECT * FROM "EquipmentInspectionResults"')) {
    const project = projects.get(Number(item.ProjectID));
    const asset = assetFor(item.EquipmentType, item.EquipmentId);
    const station = project?.station_id ? stations.get(Number(project.station_id)) : null;
    if (!asset || !station) continue;
    const result = resultValue(item.ResultStatus);
    const status = result === "pending" ? "draft" : "completed";
    const [cal] = await target.execute("SELECT expires_on FROM equipment_calibrations WHERE asset_id=? AND is_voided=0 ORDER BY performed_on DESC,id DESC LIMIT 1", [asset.id]);
    await target.execute(`INSERT INTO metrology_inspections(inspection_number,client_id,station_id,asset_id,work_order_id,inspection_type,status,result,inspected_at,next_due_date,installation_check,label_check,integrity_check,notes,corrective_action,created_at,updated_at,desktop_result_id) VALUES(?,?,?,?,?,'verification',?,?,?,?,FALSE,FALSE,FALSE,?,?,?,?,?) ON DUPLICATE KEY UPDATE client_id=VALUES(client_id),station_id=VALUES(station_id),asset_id=VALUES(asset_id),work_order_id=VALUES(work_order_id),status=VALUES(status),result=VALUES(result),inspected_at=VALUES(inspected_at),next_due_date=VALUES(next_due_date),notes=VALUES(notes),corrective_action=VALUES(corrective_action),updated_at=VALUES(updated_at)`,
      [`${project.project_number || `P-${item.ProjectID}`}-${item.ResultId}`, station.client_id, project.station_id, asset.id, orderByProject.get(Number(item.ProjectID)) || null, status, result, dateTime(item.RecordedAt) || project.created_at, cal[0]?.expires_on || null, [text(item.Finding), text(item.DetailedResultsJson)].filter(Boolean).join("\n") || null, text(item.ActionTaken), dateTime(item.RecordedAt) || project.created_at || new Date(), dateTime(item.RecordedAt) || project.created_at || new Date(), item.ResultId]);
    count++;
  }
  return count;
};

const syncDocuments = async () => {
  const uploadsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../uploads");
  fs.mkdirSync(uploadsRoot, { recursive: true });
  let count = 0;
  for (const item of rows('SELECT * FROM "Attachments" WHERE COALESCE(IsCurrent,1)=1')) {
    const project = projects.get(Number(item.ProjectID));
    const station = project?.station_id ? stations.get(Number(project.station_id)) : null;
    if (!station || !item.AttachmentData) continue;
    const original = text(item.FileName) || `dokument-${item.ID}.bin`;
    const extension = path.extname(original).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".bin";
    const storageKey = `desktop-${item.ID}-${(text(item.Sha256) || crypto.createHash("sha256").update(item.AttachmentData).digest("hex")).slice(0, 16)}${extension}`;
    const destination = path.join(uploadsRoot, storageKey);
    if (!fs.existsSync(destination)) fs.writeFileSync(destination, item.AttachmentData);
    await target.execute(`INSERT INTO documents(client_id,station_id,document_type,title,document_number,file_name,storage_key,mime_type,file_size,issued_at,visible_to_client,uploaded_by,created_at,updated_at,version_number,is_current,tags,desktop_attachment_id) VALUES(?,?,?,?,?,?,?,?,?,?,TRUE,NULL,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE client_id=VALUES(client_id),station_id=VALUES(station_id),document_type=VALUES(document_type),title=VALUES(title),file_name=VALUES(file_name),storage_key=VALUES(storage_key),mime_type=VALUES(mime_type),file_size=VALUES(file_size),created_at=VALUES(created_at),updated_at=CURRENT_TIMESTAMP(3),version_number=VALUES(version_number),is_current=VALUES(is_current),tags=VALUES(tags)`,
      [station.client_id, project.station_id, text(project.inspection_module) || "desktop_document", original, text(project.project_number), original, storageKey, mimeType(original), item.FileSize || item.AttachmentData.length, isoDate(item.CreatedAt), dateTime(item.CreatedAt) || new Date(), dateTime(item.CreatedAt) || new Date(), item.VersionNumber || 1, Boolean(item.IsCurrent ?? 1), JSON.stringify(["desktop", `project:${item.ProjectID}`]), item.ID]);
    count++;
  }
  return count;
};

try {
  await ensureSchema();
  const summary = {};
  summary.stations = stations.size;
  summary.workOrders = await syncWorkOrders();
  Object.assign(summary, await syncAssetsAndDeadlines());
  summary.serviceRequests = await syncServiceRequests();
  summary.inspections = await syncInspections();
  summary.documents = await syncDocuments();
  console.log(JSON.stringify({ sourcePath, ...summary }));
} catch (error) {
  throw error;
} finally {
  sqlite.close();
  await target.end();
}
