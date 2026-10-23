import Database from "better-sqlite3";
import mysql from "mysql2/promise";

const sourcePath = process.argv[2];
const connectionString = process.env.MYSQL_URI;
if (!sourcePath || !connectionString) throw new Error("Usage: MYSQL_URI=... node scripts/importDesktopOperationsToMySql.js <sqlite-path>");

const sqlite = new Database(sourcePath, { readonly: true, fileMustExist: true });
const target = await mysql.createConnection(connectionString);
const rows = (sql) => sqlite.prepare(sql).all();
const value = (input) => input == null ? null : String(input).trim() || null;
const date = (input) => value(input)?.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null;
const dateTime = (input) => {
  const match = value(input)?.match(/(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?/);
  return match ? `${match[1]} ${match[2]}.${(match[3] ?? "0").padEnd(3, "0")}` : null;
};
const normalizeType = (type) => ({ MeasuringRods: "Rods" }[type] ?? type);
const key = (input) => (value(input) ?? "").toLocaleLowerCase("bs")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

const legacyStations = rows('SELECT * FROM "Lista_Pumpi"');
const resolveStationId = (project) => {
  const projectTaxId = key(project.ID);
  const projectCustomer = key(project.Customer);
  const projectLocation = key(project.ServiceLocation);
  let best = null;
  let bestScore = 0;
  let tied = false;
  for (const station of legacyStations) {
    let score = 0;
    if (projectTaxId && projectTaxId === key(station.IDbroj)) score += 100;
    if (projectCustomer && projectCustomer === key(station.Narucitelj)) score += 60;
    if (projectLocation && projectLocation === key(station.Mjesto_izvrsenja_usluge)) score += 90;
    if (/^\d+$/.test(String(project.ID ?? "")) && Number(project.ID) === Number(station.ID)) score += 20;
    if (score > bestScore) { best = station.ID; bestScore = score; tied = false; }
    else if (score === bestScore && score > 0) tied = true;
  }
  return bestScore >= 90 && !tied ? Number(best) : null;
};

const [assets] = await target.query("SELECT id,legacy_type,legacy_id FROM equipment_assets");
const assetIds = new Map(assets.map((item) => [`${item.legacy_type}:${item.legacy_id}`, Number(item.id)]));
const assetId = (type, id) => type === "Station" ? null : assetIds.get(`${normalizeType(type)}:${id}`) ?? null;

try {
  await target.beginTransaction();
  const stationIds = new Set((await target.query("SELECT id FROM projects"))[0].map((item) => Number(item.id)));

  for (const item of rows('SELECT * FROM "Projects"')) {
    const stationId = resolveStationId(item);
    await target.execute(`INSERT INTO inspection_projects(id,station_id,project_number,certificate_number,folder_name,inspection_module,customer_name,service_location,phone,customer_reference,created_at,is_active,workflow_stage)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE station_id=VALUES(station_id),project_number=VALUES(project_number),certificate_number=VALUES(certificate_number),folder_name=VALUES(folder_name),inspection_module=VALUES(inspection_module),customer_name=VALUES(customer_name),service_location=VALUES(service_location),phone=VALUES(phone),customer_reference=VALUES(customer_reference),created_at=VALUES(created_at),is_active=VALUES(is_active),workflow_stage=VALUES(workflow_stage)`,
      [item.ProjectID, stationId && stationIds.has(stationId) ? stationId : null, value(item.ProjectNumber), value(item.CertificateNumber), value(item.FolderName), value(item.TitleInspections), value(item.Customer), value(item.ServiceLocation), value(item.Phone), value(item.ID), dateTime(item.CreatedDate), Boolean(item.Status), value(item.WorkflowStage)]);
  }

  for (const item of rows('SELECT * FROM "WorkOrders"')) {
    await target.execute(`INSERT INTO work_orders(id,inspection_project_id,document_number,customer_reference,inspection_type,request_date,service_deadline,service_date,start_time,end_time,workers)
      VALUES(?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE inspection_project_id=VALUES(inspection_project_id),document_number=VALUES(document_number),customer_reference=VALUES(customer_reference),inspection_type=VALUES(inspection_type),request_date=VALUES(request_date),service_deadline=VALUES(service_deadline),service_date=VALUES(service_date),start_time=VALUES(start_time),end_time=VALUES(end_time),workers=VALUES(workers)`,
      [item.WorkOrderID, item.ProjectID, value(item.DocumentNumber), value(item.ID), value(item.InspectionType), date(item.RequestDate), date(item.ServiceDeadline), date(item.ServiceDate), value(item.StartDate), value(item.EndDate), value(item.Workers)]);
  }

  for (const item of rows('SELECT * FROM "EquipmentInspectionResults"')) {
    await target.execute(`INSERT INTO inspection_results(id,inspection_project_id,asset_id,module,legacy_equipment_type,legacy_equipment_id,result_status,measured_value,deviation,finding,action_taken,detailed_results,certificate_required,recorded_at,recorded_by)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE inspection_project_id=VALUES(inspection_project_id),asset_id=VALUES(asset_id),module=VALUES(module),result_status=VALUES(result_status),measured_value=VALUES(measured_value),deviation=VALUES(deviation),finding=VALUES(finding),action_taken=VALUES(action_taken),detailed_results=VALUES(detailed_results),certificate_required=VALUES(certificate_required),recorded_at=VALUES(recorded_at),recorded_by=VALUES(recorded_by)`,
      [item.ResultId, item.ProjectID, assetId(item.EquipmentType, item.EquipmentId), value(item.Module), value(item.EquipmentType), item.EquipmentId, value(item.ResultStatus), value(item.MeasuredValue), value(item.Deviation), value(item.Finding), value(item.ActionTaken), value(item.DetailedResultsJson), Boolean(item.IsCertificateRequired), dateTime(item.RecordedAt), value(item.RecordedBy)]);
  }

  for (const item of rows('SELECT * FROM "ServiceCases"')) {
    await target.execute(`INSERT INTO service_cases(id,station_id,asset_id,legacy_equipment_type,legacy_equipment_id,is_closed)
      VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE station_id=VALUES(station_id),asset_id=VALUES(asset_id),legacy_equipment_type=VALUES(legacy_equipment_type),legacy_equipment_id=VALUES(legacy_equipment_id),is_closed=VALUES(is_closed)`,
      [item.CaseId, stationIds.has(Number(item.StationId)) ? item.StationId : null, assetId(item.EquipmentType, item.EquipmentId), value(item.EquipmentType), item.EquipmentId, Boolean(item.IsClosed)]);
  }

  const caseByEvent = new Map(rows('SELECT * FROM "ServiceCaseEvents"').map((item) => [item.ServiceEventId, item.CaseId]));
  for (const item of rows('SELECT * FROM "EquipmentServiceEvents"')) {
    await target.execute(`INSERT INTO service_events(id,service_case_id,station_id,asset_id,legacy_equipment_type,legacy_equipment_id,event_date,event_type,equipment_status,symptom,diagnosis,work_performed,replaced_parts,technician,notes,priority,external_customer,external_location,external_contact,created_at,created_by)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE service_case_id=VALUES(service_case_id),station_id=VALUES(station_id),asset_id=VALUES(asset_id),event_date=VALUES(event_date),event_type=VALUES(event_type),equipment_status=VALUES(equipment_status),symptom=VALUES(symptom),diagnosis=VALUES(diagnosis),work_performed=VALUES(work_performed),replaced_parts=VALUES(replaced_parts),technician=VALUES(technician),notes=VALUES(notes),priority=VALUES(priority),external_customer=VALUES(external_customer),external_location=VALUES(external_location),external_contact=VALUES(external_contact),created_at=VALUES(created_at),created_by=VALUES(created_by)`,
      [item.ServiceEventId, caseByEvent.get(item.ServiceEventId) ?? null, stationIds.has(Number(item.StationId)) ? item.StationId : null, assetId(item.EquipmentType, item.EquipmentId), value(item.EquipmentType), item.EquipmentId, date(item.EventDate), value(item.EventType), value(item.EquipmentStatus), value(item.Symptom), value(item.Diagnosis), value(item.WorkPerformed), value(item.ReplacedParts), value(item.Technician), value(item.Notes), value(item.Priority), value(item.ExternalCustomer), value(item.ExternalLocation), value(item.ExternalContact), dateTime(item.CreatedAt), value(item.CreatedBy)]);
  }

  for (const item of rows('SELECT * FROM "VerificationMarkUsage"')) {
    await target.execute(`INSERT INTO verification_mark_usage(id,inspection_project_id,asset_id,legacy_equipment_type,legacy_equipment_id,module,equipment_label,customer_name,service_location,used_on,sticker_number,sticker_count,stamp_code,stamp_count,worker,notes,updated_at,updated_by)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE inspection_project_id=VALUES(inspection_project_id),asset_id=VALUES(asset_id),module=VALUES(module),equipment_label=VALUES(equipment_label),customer_name=VALUES(customer_name),service_location=VALUES(service_location),used_on=VALUES(used_on),sticker_number=VALUES(sticker_number),sticker_count=VALUES(sticker_count),stamp_code=VALUES(stamp_code),stamp_count=VALUES(stamp_count),worker=VALUES(worker),notes=VALUES(notes),updated_at=VALUES(updated_at),updated_by=VALUES(updated_by)`,
      [item.UsageId, item.ProjectId, assetId(item.EquipmentType, item.EquipmentId), value(item.EquipmentType), item.EquipmentId, value(item.Module), value(item.EquipmentLabel), value(item.Customer), value(item.Location), date(item.UsedOn), value(item.StickerNumber), item.StickerCount ?? 0, value(item.StampCode), item.StampCount ?? 0, value(item.Worker), value(item.Notes), dateTime(item.UpdatedAt), value(item.UpdatedBy)]);
  }

  await target.commit();
  const [counts] = await target.query(`SELECT (SELECT COUNT(*) FROM inspection_projects) inspectionProjects,(SELECT COUNT(*) FROM work_orders) workOrders,(SELECT COUNT(*) FROM inspection_results) inspectionResults,(SELECT COUNT(*) FROM service_cases) serviceCases,(SELECT COUNT(*) FROM service_events) serviceEvents,(SELECT COUNT(*) FROM verification_mark_usage) verificationMarks`);
  console.log(JSON.stringify(counts[0]));
} catch (error) {
  await target.rollback();
  throw error;
} finally {
  sqlite.close();
  await target.end();
}
