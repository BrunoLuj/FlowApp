import { pool } from "../libs/database.js";

export const SERVICE_RULES = {
    volumeter: {
        label: "Volumetri",
        intervalMonths: 12,
        method: "RU-19.01",
        standard: "OIML R117",
        requiredItem: "volumeter",
    },
    dipstick: {
        label: "Mjerna letva",
        intervalMonths: 24,
        method: "RU-19.02",
        standard: "OIML R35-1, OIML R35-2, OIML R35-3",
        requiredItem: "dipstick",
    },
    tank: {
        label: "Rezervoar",
        intervalMonths: 72,
        method: "RU-19.03",
        standard: "OIML R71",
        requiredItem: "tank",
    },
    amn: {
        label: "AMN",
        intervalMonths: 24,
        method: "RU-19.04",
        standard: "OIML R85-1",
        requiredItem: "amn_probe",
    },
};

const scope = (clientId, alias = "mc", index = 1) =>
    clientId ? { clause: `AND ${alias}.client_id=$${index}`, values: [clientId] } : { clause: "", values: [] };

export const listCases = async (clientId = null) => {
    const tenant = scope(clientId);
    const result = await pool.query(
        `SELECT mc.*,c.company_name,p.name station_name,
                COUNT(DISTINCT i.id)::int item_count,
                COUNT(DISTINCT d.id)::int document_count
         FROM metrology_cases mc
         JOIN clients c ON c.id=mc.client_id
         LEFT JOIN projects p ON p.id=mc.station_id
         LEFT JOIN metrology_case_items i ON i.case_id=mc.id
         LEFT JOIN metrology_case_documents d ON d.case_id=mc.id
         WHERE 1=1 ${tenant.clause}
         GROUP BY mc.id,c.company_name,p.name
         ORDER BY mc.created_at DESC`,
        tenant.values
    );
    return result.rows;
};

export const getOptions = async (clientId = null) => {
    const values = clientId ? [clientId] : [];
    const where = clientId ? "WHERE c.id=$1" : "";
    const [clients, stations, users, equipment] = await Promise.all([
        pool.query(`SELECT c.id,c.company_name,c.address,c.phone,c.contact_person,c.idbroj,c.pdvbroj FROM clients c ${where} ORDER BY c.company_name`, values),
        pool.query(`SELECT p.id,p.client_id,p.name,p.address,p.city FROM projects p ${clientId ? "WHERE p.client_id=$1" : ""} ORDER BY p.name`, values),
        pool.query("SELECT id,firstname,lastname FROM users ORDER BY firstname,lastname"),
        pool.query(
            `SELECT ea.*,p.name station_name,parent.name parent_name,
                    parent.serial_number parent_serial_number,
                    parent.metrology_type parent_metrology_type
             FROM equipment_assets ea
             LEFT JOIN projects p ON p.id=ea.station_id
             LEFT JOIN equipment_assets parent ON parent.id=ea.parent_asset_id
             WHERE ea.metrology_type IS NOT NULL AND ea.metrology_enabled=TRUE
             ${clientId ? "AND ea.client_id=$1" : ""}
             ORDER BY p.name,ea.metrology_type,ea.name`,
            values
        ),
    ]);
    return {
        rules: SERVICE_RULES,
        clients: clients.rows,
        stations: stations.rows,
        users: users.rows,
        equipment: equipment.rows,
        probes: equipment.rows.filter((item) => item.metrology_type === "amn_probe"),
        volumeters: equipment.rows.filter((item) => item.metrology_type === "volumeter"),
        tanks: equipment.rows.filter((item) => item.metrology_type === "tank"),
        dipsticks: equipment.rows.filter((item) => item.metrology_type === "dipstick"),
        dispensers: equipment.rows.filter((item) => item.metrology_type === "dispenser"),
    };
};

export const createCase = async (data, user) => {
    const rules = SERVICE_RULES[data.service_type];
    if (!rules) {
        const error = new Error("Invalid service type");
        error.code = "INVALID_SERVICE_TYPE";
        throw error;
    }
    const clientId = user.clientId || data.client_id;
    if (!clientId) return null;
    if (data.station_id) {
        const station = await pool.query(
            "SELECT id FROM projects WHERE id=$1 AND client_id=$2",
            [data.station_id, clientId]
        );
        if (!station.rowCount) {
            const error = new Error("Invalid station");
            error.code = "INVALID_STATION";
            throw error;
        }
    }
    const result = await pool.query(
        `INSERT INTO metrology_cases (
            case_number,client_id,station_id,service_type,inspection_kind,
            requested_by_name,contact_phone,request_description,
            attachments_description,location_text,method_reference,
            verification_period_months,created_by
         ) VALUES (NULL,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [
            clientId,data.station_id || null,data.service_type,
            data.inspection_kind || "regular",data.requested_by_name || null,
            data.contact_phone || null,data.request_description || null,
            data.attachments_description || null,data.location_text || null,
            rules.method,rules.intervalMonths,user.userId,
        ]
    );
    return result.rows[0];
};

export const getCase = async (id, clientId = null) => {
    const values = [id];
    let tenant = "";
    if (clientId) {
        values.push(clientId);
        tenant = `AND mc.client_id=$${values.length}`;
    }
    const record = (await pool.query(
        `SELECT mc.*,c.company_name,c.address client_address,c.phone client_phone,
                c.contact_person,c.idbroj,c.pdvbroj,p.name station_name,
                p.address station_address,p.city station_city,
                CONCAT(manager.firstname,' ',manager.lastname) manager_name,
                CONCAT(approver.firstname,' ',approver.lastname) approver_name
         FROM metrology_cases mc
         JOIN clients c ON c.id=mc.client_id
         LEFT JOIN projects p ON p.id=mc.station_id
         LEFT JOIN users manager ON manager.id=mc.technical_manager_id
         LEFT JOIN users approver ON approver.id=mc.approved_by
         WHERE mc.id=$1 ${tenant}`,
        values
    )).rows[0];
    if (!record) return null;
    const [items, measurements, checks, standards, inspectors, documents] = await Promise.all([
        pool.query("SELECT * FROM metrology_case_items WHERE case_id=$1 ORDER BY sort_order,id", [id]),
        pool.query(
            `SELECT m.* FROM metrology_case_measurements m
             JOIN metrology_case_items i ON i.id=m.case_item_id
             WHERE i.case_id=$1 ORDER BY i.sort_order,m.measurement_group,m.sequence_no`,
            [id]
        ),
        pool.query(
            `SELECT ch.* FROM metrology_case_checks ch
             JOIN metrology_case_items i ON i.id=ch.case_item_id
             WHERE i.case_id=$1 ORDER BY i.sort_order,ch.id`,
            [id]
        ),
        pool.query("SELECT * FROM metrology_case_standards WHERE case_id=$1 ORDER BY sort_order,id", [id]),
        pool.query(
            `SELECT u.id,u.firstname,u.lastname FROM metrology_case_inspectors ci
             JOIN users u ON u.id=ci.user_id WHERE ci.case_id=$1`,
            [id]
        ),
        pool.query(
            `SELECT d.*,a.file_name FROM metrology_case_documents d
             LEFT JOIN entity_attachments a ON a.id=d.attachment_id
             WHERE d.case_id=$1 ORDER BY d.generated_at DESC`,
            [id]
        ),
    ]);
    record.items = items.rows.map((item) => ({
        ...item,
        measurements: measurements.rows.filter((measurement) => Number(measurement.case_item_id) === Number(item.id)),
        checks: checks.rows.filter((check) => Number(check.case_item_id) === Number(item.id)),
    }));
    record.standards = standards.rows;
    record.inspectors = inspectors.rows;
    record.documents = documents.rows;
    record.rules = SERVICE_RULES[record.service_type];
    return record;
};

const validateItem = (serviceType, item) => {
    if (serviceType === "amn" && !item.tank_reference) {
        const error = new Error("AMN probe requires tank");
        error.code = "AMN_TANK_REQUIRED";
        throw error;
    }
    if (serviceType === "volumeter" && !item.apparatus_serial_number) {
        const error = new Error("Volumeter requires dispenser");
        error.code = "DISPENSER_REQUIRED";
        throw error;
    }
};

const measurementPass = (serviceType, measurement, amnSpreadPassed = true) => {
    const values = measurement.values || {};
    if (serviceType === "amn") {
        const reference = Number(values.reference_mm);
        const measured = Number(values.amn_mm);
        const error = Number.isFinite(Number(values.error_mm))
            ? Number(values.error_mm)
            : measured - reference;
        const gdg = Number(values.gdg_mm || 4);
        values.error_mm = error;
        return amnSpreadPassed && [reference,measured,error,gdg].every(Number.isFinite) && Math.abs(error) <= Math.abs(gdg);
    }
    if (serviceType === "volumeter") {
        const error = Number(values.error_percent);
        return Number.isFinite(error) && Math.abs(error) <= 0.5;
    }
    if (serviceType === "dipstick") {
        const nominal = Number(values.nominal_mm);
        const measured = Number(values.measured_mm);
        const error = Number.isFinite(Number(values.error_mm))
            ? Number(values.error_mm)
            : measured - nominal;
        const tolerance = Number(values.tolerance_mm);
        values.error_mm = error;
        return [nominal,measured,error,tolerance].every(Number.isFinite) && Math.abs(error) <= Math.abs(tolerance);
    }
    return measurement.passed !== false;
};

export const saveCase = async (id, data, user) => {
    const connection = await pool.connect();
    try {
        await connection.query("BEGIN");
        const values = [id];
        let tenant = "";
        if (user.clientId) {
            values.push(user.clientId);
            tenant = `AND client_id=$${values.length}`;
        }
        const current = (await connection.query(
            `SELECT * FROM metrology_cases WHERE id=$1 ${tenant} FOR UPDATE`,
            values
        )).rows[0];
        if (!current) {
            await connection.query("ROLLBACK");
            return null;
        }
        if (["approved","cancelled"].includes(current.status)) {
            const error = new Error("Case locked");
            error.code = "CASE_LOCKED";
            throw error;
        }
        const items = data.items || [];
        items.forEach((item) => validateItem(current.service_type, item));
        for (const item of items) {
            const references = current.service_type === "amn"
                ? (item.measurements || []).map((measurement) => Number(measurement.values?.reference_mm)).filter(Number.isFinite)
                : [];
            const spreadPassed = references.length < 2 || Math.max(...references) - Math.min(...references) <= 1;
            for (const measurement of item.measurements || []) {
                measurement.passed = measurementPass(current.service_type, measurement, spreadPassed);
            }
        }
        if (current.service_type === "volumeter") {
            const seals = new Map();
            for (const item of items) {
                const key = item.apparatus_serial_number;
                const seal = `${item.verification_mark || ""}|${item.seal_number || ""}`;
                if (seals.has(key) && seals.get(key) !== seal) {
                    const error = new Error("One seal per dispenser");
                    error.code = "DISPENSER_SEAL_CONFLICT";
                    throw error;
                }
                seals.set(key, seal);
            }
        }
        await connection.query("DELETE FROM metrology_case_items WHERE case_id=$1", [id]);
        for (let index = 0; index < items.length; index += 1) {
            const item = items[index];
            const inserted = (await connection.query(
                `INSERT INTO metrology_case_items (
                    case_id,item_type,source_table,source_id,name,manufacturer,model,
                    serial_number,official_mark,apparatus_serial_number,tank_reference,
                    fuel_type,nominal_capacity,measurement_range,verification_mark,
                    seal_number,status,notes,sort_order
                 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
                           'pending',$17,$18) RETURNING id`,
                [
                    id,item.item_type,item.source_table || null,item.source_id || null,
                    item.name || null,item.manufacturer || null,item.model || null,
                    item.serial_number || null,item.official_mark || null,
                    item.apparatus_serial_number || null,item.tank_reference || null,
                    item.fuel_type || null,item.nominal_capacity || null,
                    item.measurement_range || null,item.verification_mark || null,
                    item.seal_number || null,item.notes || null,index,
                ]
            )).rows[0];
            for (let measurementIndex = 0; measurementIndex < (item.measurements || []).length; measurementIndex += 1) {
                const measurement = item.measurements[measurementIndex];
                await connection.query(
                    `INSERT INTO metrology_case_measurements (
                        case_item_id,measurement_group,sequence_no,values,passed,notes
                     ) VALUES ($1,$2,$3,$4::jsonb,$5,$6)`,
                    [
                        inserted.id,measurement.measurement_group || "measurement",
                        measurementIndex + 1,JSON.stringify(measurement.values || {}),
                        measurement.passed ?? null,measurement.notes || null,
                    ]
                );
            }
            for (const check of item.checks || []) {
                await connection.query(
                    `INSERT INTO metrology_case_checks (
                        case_item_id,check_code,label,passed,notes
                     ) VALUES ($1,$2,$3,$4,$5)`,
                    [inserted.id,check.check_code,check.label,check.passed ?? null,check.notes || null]
                );
            }
        }
        await connection.query("DELETE FROM metrology_case_standards WHERE case_id=$1", [id]);
        for (let index = 0; index < (data.standards || []).length; index += 1) {
            const standard = data.standards[index];
            if (!standard.equipment_name) continue;
            await connection.query(
                `INSERT INTO metrology_case_standards (
                    case_id,equipment_name,manufacturer,serial_number,
                    calibration_certificate,valid_until,sort_order
                 ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                [
                    id,standard.equipment_name,standard.manufacturer || null,
                    standard.serial_number || null,standard.calibration_certificate || null,
                    standard.valid_until || null,index,
                ]
            );
        }
        await connection.query("DELETE FROM metrology_case_inspectors WHERE case_id=$1", [id]);
        for (const inspectorId of data.inspector_ids || []) {
            await connection.query(
                "INSERT INTO metrology_case_inspectors(case_id,user_id) VALUES ($1,$2)",
                [id,inspectorId]
            );
        }
        const result = await connection.query(
            `UPDATE metrology_cases SET status=$1,work_started_at=$2,work_finished_at=$3,
                inspection_date=$4,location_text=$5,request_description=$6,
                technical_manager_id=$7,updated_at=NOW() WHERE id=$8 RETURNING *`,
            [
                data.status || current.status,data.work_started_at || null,
                data.work_finished_at || null,data.inspection_date || null,
                data.location_text || null,data.request_description || null,
                data.technical_manager_id || null,id,
            ]
        );
        await connection.query("COMMIT");
        return result.rows[0];
    } catch (error) {
        await connection.query("ROLLBACK");
        throw error;
    } finally {
        connection.release();
    }
};

export const completeCase = async (id, user) => {
    const connection = await pool.connect();
    try {
        await connection.query("BEGIN");
        const values = [id];
        let tenant = "";
        if (user.clientId) {
            values.push(user.clientId);
            tenant = `AND client_id=$${values.length}`;
        }
        const current = (await connection.query(
            `SELECT * FROM metrology_cases WHERE id=$1 ${tenant} FOR UPDATE`,
            values
        )).rows[0];
        if (!current) {
            await connection.query("ROLLBACK");
            return null;
        }
        const items = (await connection.query(
            `SELECT i.id,COUNT(DISTINCT m.id)::int measurement_count,
                    BOOL_AND(COALESCE(m.passed,TRUE)) measurements_passed,
                    BOOL_AND(COALESCE(ch.passed,TRUE)) checks_passed
             FROM metrology_case_items i
             LEFT JOIN metrology_case_measurements m ON m.case_item_id=i.id
             LEFT JOIN metrology_case_checks ch ON ch.case_item_id=i.id
             WHERE i.case_id=$1 GROUP BY i.id`,
            [id]
        )).rows;
        if (!items.length) {
            const error = new Error("Items required");
            error.code = "CASE_ITEMS_REQUIRED";
            throw error;
        }
        if (items.some((item) => item.measurement_count < 1)) {
            const error = new Error("Measurements required");
            error.code = "CASE_MEASUREMENTS_REQUIRED";
            throw error;
        }
        const passed = items.every((item) => item.measurements_passed && item.checks_passed);
        const nextDate = passed
            ? (await connection.query(
                "SELECT (COALESCE($1::date,CURRENT_DATE)+($2 || ' months')::interval)::date next_date",
                [current.inspection_date,current.verification_period_months]
            )).rows[0].next_date
            : null;
        await connection.query(
            `UPDATE metrology_case_items i SET status=CASE WHEN result.passed THEN 'passed' ELSE 'failed' END
             FROM (
                SELECT item.id,BOOL_AND(COALESCE(m.passed,TRUE)) AND BOOL_AND(COALESCE(ch.passed,TRUE)) passed
                FROM metrology_case_items item
                LEFT JOIN metrology_case_measurements m ON m.case_item_id=item.id
                LEFT JOIN metrology_case_checks ch ON ch.case_item_id=item.id
                WHERE item.case_id=$1 GROUP BY item.id
             ) result WHERE i.id=result.id`,
            [id]
        );
        const completed = (await connection.query(
            `UPDATE metrology_cases SET status='approved',result=$1,
                approval_date=CURRENT_DATE,approved_by=$2,next_verification_date=$3,
                updated_at=NOW() WHERE id=$4 RETURNING *`,
            [passed ? "passed" : "failed",user.userId,nextDate,id]
        )).rows[0];
        await connection.query("COMMIT");
        return completed;
    } catch (error) {
        await connection.query("ROLLBACK");
        throw error;
    } finally {
        connection.release();
    }
};

export const registerDocument = async (caseId, type, file, user) => {
    const connection = await pool.connect();
    try {
        await connection.query("BEGIN");
        const values = [caseId];
        let tenant = "";
        if (user.clientId) {
            values.push(user.clientId);
            tenant = `AND client_id=$${values.length}`;
        }
        const record = (await connection.query(
            `SELECT * FROM metrology_cases WHERE id=$1 ${tenant} FOR UPDATE`,
            values
        )).rows[0];
        if (!record) {
            await connection.query("ROLLBACK");
            return null;
        }
        const version = (await connection.query(
            `SELECT COALESCE(MAX(version_no),0)+1 version
             FROM metrology_case_documents WHERE case_id=$1 AND document_type=$2`,
            [caseId,type]
        )).rows[0].version;
        const documentNumber = `${record.case_number}-${type.toUpperCase().replaceAll("_","-")}-V${version}`;
        const attachment = (await connection.query(
            `INSERT INTO entity_attachments (
                client_id,station_id,metrology_case_id,title,file_name,storage_key,mime_type,file_size,
                visible_to_client,uploaded_by,document_type,version_no,system_generated
             ) VALUES ($1,$2,$3,$4,$5,$6,'application/pdf',$7,TRUE,$8,$9,$10,TRUE)
             RETURNING *`,
            [
                record.client_id,record.station_id,caseId,documentNumber,file.fileName,
                file.storageKey,file.fileSize,user.userId,type,version,
            ]
        )).rows[0];
        await connection.query(
            `INSERT INTO metrology_case_documents (
                case_id,document_type,document_number,version_no,attachment_id,generated_by
             ) VALUES ($1,$2,$3,$4,$5,$6)`,
            [caseId,type,documentNumber,version,attachment.id,user.userId]
        );
        await connection.query("COMMIT");
        return { ...attachment, document_number: documentNumber, version_no: version };
    } catch (error) {
        await connection.query("ROLLBACK");
        throw error;
    } finally {
        connection.release();
    }
};
