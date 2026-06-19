import { pool } from "../libs/database.js";

const scopeClause = (clientId, alias = "mi", startIndex = 1) =>
    clientId ? { sql: `AND ${alias}.client_id=$${startIndex}`, values: [clientId] } : { sql: "", values: [] };

export const getOverview = async (clientId = null) => {
    const scope = scopeClause(clientId);
    const [summary, dueAssets, recent] = await Promise.all([
        pool.query(
            `SELECT
                COUNT(*) FILTER (WHERE ea.metrology_required AND ea.metrology_enabled)::int required_assets,
                COUNT(*) FILTER (WHERE ea.metrology_required AND ea.metrology_enabled AND ea.calibration_expires_at<CURRENT_DATE)::int expired,
                COUNT(*) FILTER (WHERE ea.metrology_required AND ea.metrology_enabled AND ea.calibration_expires_at BETWEEN CURRENT_DATE AND CURRENT_DATE+30)::int due_30_days,
                COUNT(*) FILTER (WHERE mi.status IN ('draft','in_progress'))::int open_inspections,
                COUNT(*) FILTER (WHERE mi.result='failed' AND mi.status IN ('completed','approved'))::int failed
             FROM equipment_assets ea
             LEFT JOIN metrology_inspections mi ON mi.id=(
                SELECT latest.id FROM metrology_inspections latest
                WHERE latest.asset_id=ea.id AND latest.status<>'cancelled'
                ORDER BY latest.created_at DESC LIMIT 1
             )
             WHERE 1=1 ${clientId ? "AND ea.client_id=$1" : ""}`,
            scope.values
        ),
        pool.query(
            `SELECT ea.id,ea.asset_code,ea.name,ea.category,ea.manufacturer,ea.model,
                    ea.serial_number,ea.official_mark,ea.calibration_expires_at,
                    ea.verification_interval_months,ea.metrology_standard,
                    p.name station_name,c.company_name client_name,
                    (ea.calibration_expires_at-CURRENT_DATE)::int days_remaining
             FROM equipment_assets ea
             LEFT JOIN projects p ON p.id=ea.station_id
             JOIN clients c ON c.id=ea.client_id
             WHERE ea.metrology_required AND ea.metrology_enabled ${clientId ? "AND ea.client_id=$1" : ""}
             ORDER BY ea.calibration_expires_at NULLS FIRST,c.company_name,p.name,ea.name`,
            scope.values
        ),
        pool.query(
            `SELECT mi.*,ea.name asset_name,ea.asset_code,p.name station_name,
                    c.company_name client_name,
                    CONCAT(inspector.firstname,' ',inspector.lastname) inspector_name,
                    COUNT(mm.id)::int measurement_count,
                    COUNT(mm.id) FILTER (WHERE NOT mm.passed)::int failed_measurements
             FROM metrology_inspections mi
             JOIN equipment_assets ea ON ea.id=mi.asset_id
             LEFT JOIN projects p ON p.id=mi.station_id
             JOIN clients c ON c.id=mi.client_id
             LEFT JOIN users inspector ON inspector.id=mi.inspector_id
             LEFT JOIN metrology_measurements mm ON mm.inspection_id=mi.id
             WHERE 1=1 ${scope.sql}
             GROUP BY mi.id,ea.name,ea.asset_code,p.name,c.company_name,
                      inspector.firstname,inspector.lastname
             ORDER BY mi.created_at DESC LIMIT 100`,
            scope.values
        ),
    ]);
    return { summary: summary.rows[0], dueAssets: dueAssets.rows, inspections: recent.rows };
};

export const getAssets = async (clientId = null) => {
    const values = clientId ? [clientId] : [];
    const result = await pool.query(
        `SELECT ea.id,ea.client_id,ea.station_id,ea.asset_code,ea.name,ea.category,
                ea.manufacturer,ea.model,ea.serial_number,ea.official_mark,
                ea.calibration_expires_at,ea.verification_interval_months,
                ea.metrology_required,ea.metrology_standard,
                ea.metrology_auto_order,ea.metrology_lead_days,
                p.name station_name,c.company_name client_name
         FROM equipment_assets ea
         LEFT JOIN projects p ON p.id=ea.station_id
         JOIN clients c ON c.id=ea.client_id
         WHERE 1=1 ${clientId ? "AND ea.client_id=$1" : ""}
         ORDER BY c.company_name,p.name,ea.name`,
        values
    );
    return result.rows;
};

export const configureAsset = async (id, data, clientId = null) => {
    const values = [
        Boolean(data.metrology_required),
        Math.max(Number(data.verification_interval_months) || 12,1),
        data.metrology_standard || null,
        data.metrology_auto_order !== false,
        Math.max(Number(data.metrology_lead_days) || 30,0),
        id,
    ];
    let scope="";
    if(clientId){
        values.push(clientId);
        scope=`AND client_id=$${values.length}`;
    }
    const result=await pool.query(
        `UPDATE equipment_assets SET metrology_required=$1,
            verification_interval_months=$2,metrology_standard=$3,
            metrology_auto_order=$4,metrology_lead_days=$5,updated_at=NOW()
         WHERE id=$6 ${scope} RETURNING *`,
        values
    );
    return result.rows[0];
};

export const generateDueMetrologyOrders = async (user = { userId: null, clientId: null }) => {
    const values=user.clientId?[user.clientId]:[];
    const result=await pool.query(
        `SELECT ea.*,c.company_name,p.name station_name
         FROM equipment_assets ea
         JOIN clients c ON c.id=ea.client_id
         JOIN projects p ON p.id=ea.station_id
         WHERE ea.metrology_required AND ea.metrology_enabled AND ea.metrology_auto_order
           AND ea.calibration_expires_at IS NOT NULL
           AND ea.calibration_expires_at<=CURRENT_DATE+ea.metrology_lead_days
           ${user.clientId?"AND ea.client_id=$1":""}
           AND NOT EXISTS (
             SELECT 1 FROM work_orders wo WHERE wo.asset_id=ea.id
             AND wo.type IN ('Calibration','Inspection')
             AND wo.status NOT IN ('Completed','Cancelled')
           )
         ORDER BY ea.calibration_expires_at`,
        values
    );
    const generated=[];
    for(const asset of result.rows){
        const connection=await pool.connect();
        try{
            await connection.query("BEGIN");
            const order=(await connection.query(
                `INSERT INTO work_orders (
                    project_id,station_id,asset_id,type,title,description,
                    assigned_to,planned_date,status
                 ) VALUES ($1,$1,$2,'Calibration',$3,$4,'[]'::jsonb,$5,'Open')
                 RETURNING *`,
                [
                    asset.station_id,asset.id,`Ovjera / kalibracija: ${asset.name}`,
                    `Automatski nalog zbog isteka ovjere ${asset.calibration_expires_at}.`,
                    asset.calibration_expires_at,
                ]
            )).rows[0];
            const inspection=(await connection.query(
                `INSERT INTO metrology_inspections (
                    inspection_number,client_id,station_id,asset_id,work_order_id,
                    inspection_type,status,standard_reference,inspector_id,created_by
                 ) VALUES (NULL,$1,$2,$3,$4,'verification','draft',$5,NULL,$6)
                 RETURNING *`,
                [asset.client_id,asset.station_id,asset.id,order.id,asset.metrology_standard,user.userId]
            )).rows[0];
            await connection.query(
                `INSERT INTO audit_logs (
                    user_id,client_id,entity_type,entity_id,action,summary,changes
                 ) VALUES ($1,$2,'work_order',$3,'metrology_auto_created',$4,$5::jsonb)`,
                [
                    user.userId,asset.client_id,String(order.id),
                    `Automatski kreiran nalog za ovjeru opreme ${asset.name}`,
                    JSON.stringify({inspection_id:inspection.id,asset_id:asset.id}),
                ]
            );
            await connection.query("COMMIT");
            generated.push({order,inspection});
        }catch(error){
            await connection.query("ROLLBACK");
            throw error;
        }finally{connection.release();}
    }
    return generated;
};

export const createInspection = async (data, user) => {
    const values = [data.asset_id];
    let scope = "";
    if (user.clientId) {
        values.push(user.clientId);
        scope = `AND ea.client_id=$${values.length}`;
    }
    const asset = (await pool.query(
        `SELECT ea.*,p.client_id station_client_id FROM equipment_assets ea
         LEFT JOIN projects p ON p.id=ea.station_id WHERE ea.id=$1 ${scope}`,
        values
    )).rows[0];
    if (!asset) return null;
    if(data.work_order_id){
        const workOrder=(await pool.query(
            `SELECT wo.id,wo.asset_id,p.client_id FROM work_orders wo
             JOIN projects p ON p.id=COALESCE(wo.station_id,wo.project_id)
             WHERE wo.id=$1`,
            [data.work_order_id]
        )).rows[0];
        if(!workOrder || Number(workOrder.asset_id)!==Number(asset.id) || Number(workOrder.client_id)!==Number(asset.client_id)){
            const problem=new Error("Invalid work order");
            problem.code="INVALID_WORK_ORDER";
            throw problem;
        }
        const active=(await pool.query(
            "SELECT id FROM metrology_inspections WHERE work_order_id=$1 AND status<>'cancelled'",
            [data.work_order_id]
        )).rows[0];
        if(active){
            const problem=new Error("Inspection already exists");
            problem.code="ACTIVE_INSPECTION";
            problem.inspectionId=active.id;
            throw problem;
        }
    }
    const result = await pool.query(
        `INSERT INTO metrology_inspections (
            inspection_number,client_id,station_id,asset_id,work_order_id,
            inspection_type,status,standard_reference,procedure_reference,
            temperature,humidity,notes,inspector_id,created_by
         ) VALUES (NULL,$1,$2,$3,$4,$5,'draft',$6,$7,$8,$9,$10,$11,$11)
         RETURNING *`,
        [
            asset.client_id,asset.station_id,asset.id,data.work_order_id || null,
            data.inspection_type || "verification",
            data.standard_reference || asset.metrology_standard || null,
            data.procedure_reference || null,data.temperature || null,
            data.humidity || null,data.notes || null,user.userId,
        ]
    );
    return result.rows[0];
};

export const getInspection = async (id, clientId = null) => {
    const values = [id];
    let scope = "";
    if (clientId) {
        values.push(clientId);
        scope = `AND mi.client_id=$${values.length}`;
    }
    const inspection = (await pool.query(
        `SELECT mi.*,ea.name asset_name,ea.asset_code,ea.category,ea.manufacturer,
                ea.model,ea.serial_number,ea.official_mark,
                ea.verification_interval_months,p.name station_name,p.address,p.city,
                c.company_name client_name,wo.work_order_number,
                CONCAT(inspector.firstname,' ',inspector.lastname) inspector_name,
                CONCAT(approver.firstname,' ',approver.lastname) approved_by_name
         FROM metrology_inspections mi
         JOIN equipment_assets ea ON ea.id=mi.asset_id
         LEFT JOIN projects p ON p.id=mi.station_id
         JOIN clients c ON c.id=mi.client_id
         LEFT JOIN work_orders wo ON wo.id=mi.work_order_id
         LEFT JOIN users inspector ON inspector.id=mi.inspector_id
         LEFT JOIN users approver ON approver.id=mi.approved_by
         WHERE mi.id=$1 ${scope}`,
        values
    )).rows[0];
    if (!inspection) return null;
    inspection.measurements = (await pool.query(
        "SELECT * FROM metrology_measurements WHERE inspection_id=$1 ORDER BY sequence_no,id",
        [id]
    )).rows;
    return inspection;
};

const normalizeMeasurement = (item, index) => {
    const reference = Number(item.reference_value);
    const measured = Number(item.measured_value);
    const error = measured - reference;
    const min = item.tolerance_min === "" || item.tolerance_min == null ? null : Number(item.tolerance_min);
    const max = item.tolerance_max === "" || item.tolerance_max == null ? null : Number(item.tolerance_max);
    if (![reference, measured].every(Number.isFinite) || (min !== null && !Number.isFinite(min)) || (max !== null && !Number.isFinite(max))) {
        const problem = new Error("Invalid measurement");
        problem.code = "INVALID_MEASUREMENT";
        throw problem;
    }
    return {
        sequence: index + 1,
        point: item.measurement_point || `Mjerna točka ${index + 1}`,
        reference, measured, error, min, max,
        unit: item.unit || "-",
        passed: (min === null || error >= min) && (max === null || error <= max),
        note: item.note || null,
    };
};

export const saveInspection = async (id, data, user) => {
    const connection = await pool.connect();
    try {
        await connection.query("BEGIN");
        const values = [id];
        let scope = "";
        if (user.clientId) {
            values.push(user.clientId);
            scope = `AND client_id=$${values.length}`;
        }
        const current = (await connection.query(
            `SELECT * FROM metrology_inspections WHERE id=$1 ${scope} FOR UPDATE`,
            values
        )).rows[0];
        if (!current) {
            await connection.query("ROLLBACK");
            return null;
        }
        if (["completed","approved","cancelled"].includes(current.status)) {
            const problem = new Error("Inspection is locked");
            problem.code = "INSPECTION_LOCKED";
            throw problem;
        }
        const measurements = (data.measurements || []).map(normalizeMeasurement);
        await connection.query("DELETE FROM metrology_measurements WHERE inspection_id=$1", [id]);
        for (const item of measurements) {
            await connection.query(
                `INSERT INTO metrology_measurements (
                    inspection_id,sequence_no,measurement_point,reference_value,
                    measured_value,error_value,tolerance_min,tolerance_max,unit,passed,note
                 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
                [id,item.sequence,item.point,item.reference,item.measured,item.error,item.min,item.max,item.unit,item.passed,item.note]
            );
        }
        const result = await connection.query(
            `UPDATE metrology_inspections SET
                status='in_progress',standard_reference=$1,procedure_reference=$2,
                temperature=$3,humidity=$4,installation_check=$5,label_check=$6,
                integrity_check=$7,notes=$8,corrective_action=$9,updated_at=NOW()
             WHERE id=$10 RETURNING *`,
            [
                data.standard_reference || null,data.procedure_reference || null,
                data.temperature || null,data.humidity || null,
                Boolean(data.installation_check),Boolean(data.label_check),
                Boolean(data.integrity_check),data.notes || null,
                data.corrective_action || null,id,
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

export const completeInspection = async (id, data, user) => {
    const connection = await pool.connect();
    try {
        await connection.query("BEGIN");
        const values = [id];
        let scope = "";
        if (user.clientId) {
            values.push(user.clientId);
            scope = `AND mi.client_id=$${values.length}`;
        }
        const inspection = (await connection.query(
            `SELECT mi.*,ea.verification_interval_months FROM metrology_inspections mi
             JOIN equipment_assets ea ON ea.id=mi.asset_id
             WHERE mi.id=$1 ${scope} FOR UPDATE OF mi`,
            values
        )).rows[0];
        if (!inspection) {
            await connection.query("ROLLBACK");
            return null;
        }
        const measurement = (await connection.query(
            `SELECT COUNT(*)::int total,COUNT(*) FILTER (WHERE NOT passed)::int failed
             FROM metrology_measurements WHERE inspection_id=$1`,
            [id]
        )).rows[0];
        if (!measurement.total) {
            const problem = new Error("Measurements required");
            problem.code = "MEASUREMENTS_REQUIRED";
            throw problem;
        }
        const checksPassed = Boolean(inspection.installation_check && inspection.label_check && inspection.integrity_check);
        const resultValue = measurement.failed === 0 && checksPassed ? "passed" : "failed";
        const inspectedAt = data.inspected_at || new Date();
        const nextDue = resultValue === "passed"
            ? (await connection.query(
                "SELECT ($1::date + ($2 || ' months')::interval)::date next_due",
                [inspectedAt,inspection.verification_interval_months || 12]
            )).rows[0].next_due
            : null;
        const completed = (await connection.query(
            `UPDATE metrology_inspections SET status=$1::varchar,result=$2::varchar,inspected_at=$3::timestamptz,
                next_due_date=$4::date,approved_by=$5,approved_at=CASE WHEN $1::varchar='approved' THEN NOW() ELSE NULL END,
                updated_at=NOW() WHERE id=$6 RETURNING *`,
            [data.approve ? "approved" : "completed",resultValue,inspectedAt,nextDue,data.approve ? user.userId : null,id]
        )).rows[0];
        await connection.query(
            `UPDATE equipment_assets SET last_calibration_at=$1::date,
                calibration_expires_at=CASE WHEN $2::varchar='passed' THEN $3::date ELSE calibration_expires_at END,
                status=CASE WHEN $2::varchar='failed' THEN 'out_of_service' ELSE status END,
                updated_at=NOW() WHERE id=$4`,
            [inspectedAt,resultValue,nextDue,inspection.asset_id]
        );
        await connection.query("COMMIT");
        return completed;
    } catch (error) {
        await connection.query("ROLLBACK");
        throw error;
    } finally {
        connection.release();
    }
};

export const assertWorkOrderMetrologyComplete = async (connection, order) => {
    if (!order.asset_id || !["Calibration","Inspection"].includes(order.type)) return;
    const asset = (await connection.query(
        "SELECT metrology_required FROM equipment_assets WHERE id=$1",
        [order.asset_id]
    )).rows[0];
    const inspection = (await connection.query(
        `SELECT status,result FROM metrology_inspections
         WHERE work_order_id=$1 AND status<>'cancelled'
         ORDER BY created_at DESC LIMIT 1`,
        [order.id]
    )).rows[0];
    if (asset?.metrology_required && !inspection) {
        const problem = new Error("Metrology inspection required");
        problem.code = "METROLOGY_REQUIRED";
        throw problem;
    }
    if (inspection && !["completed","approved"].includes(inspection.status)) {
        const problem = new Error("Metrology inspection incomplete");
        problem.code = "METROLOGY_INCOMPLETE";
        throw problem;
    }
};

export const getNextCertificateVersion = async (id) => {
    const result = await pool.query(
        "SELECT COALESCE(certificate_version,0)+1 version FROM metrology_inspections WHERE id=$1",
        [id]
    );
    return result.rows[0]?.version;
};

export const registerCertificate = async (id, file, user) => {
    const connection = await pool.connect();
    try {
        await connection.query("BEGIN");
        const values = [id];
        let scope = "";
        if (user.clientId) {
            values.push(user.clientId);
            scope = `AND client_id=$${values.length}`;
        }
        const inspection = (await connection.query(
            `SELECT * FROM metrology_inspections WHERE id=$1 ${scope} FOR UPDATE`,
            values
        )).rows[0];
        if (!inspection) {
            await connection.query("ROLLBACK");
            return null;
        }
        if (!["completed","approved"].includes(inspection.status)) {
            const problem = new Error("Inspection is not completed");
            problem.code = "INSPECTION_NOT_COMPLETED";
            throw problem;
        }
        const version = Number(inspection.certificate_version || 0) + 1;
        const certificateNumber = `${inspection.inspection_number}-V${version}`;
        const attachment = (await connection.query(
            `INSERT INTO entity_attachments (
                client_id,station_id,asset_id,work_order_id,title,file_name,
                storage_key,mime_type,file_size,visible_to_client,uploaded_by,
                document_type,version_no,system_generated
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,'application/pdf',$8,TRUE,$9,
                       'metrology_certificate',$10,TRUE) RETURNING *`,
            [
                inspection.client_id,inspection.station_id,inspection.asset_id,
                inspection.work_order_id || null,`Mjeriteljski certifikat ${certificateNumber}`,
                file.fileName,file.storageKey,file.fileSize,user.userId,version,
            ]
        )).rows[0];
        const previousDocument=(await connection.query(
            `SELECT id FROM documents WHERE asset_id=$1
             AND document_type='metrology_certificate' AND is_current=TRUE
             ORDER BY version_number DESC LIMIT 1 FOR UPDATE`,
            [inspection.asset_id]
        )).rows[0];
        if(previousDocument){
            await connection.query(
                "UPDATE documents SET is_current=FALSE,archived_at=NOW(),updated_at=NOW() WHERE id=$1",
                [previousDocument.id]
            );
        }
        const document=(await connection.query(
            `INSERT INTO documents (
                client_id,station_id,asset_id,document_type,title,document_number,
                file_name,storage_key,mime_type,file_size,issued_at,valid_until,
                visible_to_client,uploaded_by,parent_document_id,version_number,
                is_current,tags
             ) VALUES ($1,$2,$3,'metrology_certificate',$4,$5,$6,$7,
                       'application/pdf',$8,CURRENT_DATE,$9,TRUE,$10,$11,$12,TRUE,
                       ARRAY['mjeriteljstvo','certifikat'])
             RETURNING *`,
            [
                inspection.client_id,inspection.station_id,inspection.asset_id,
                `Mjeriteljski certifikat ${certificateNumber}`,certificateNumber,
                file.fileName,file.storageKey,file.fileSize,inspection.next_due_date,
                user.userId,previousDocument?.id || null,version,
            ]
        )).rows[0];
        if(inspection.next_due_date){
            await connection.query(
                `INSERT INTO compliance_deadlines (
                    client_id,station_id,asset_id,document_id,deadline_type,title,
                    due_date,warning_days,reminder_days,notes
                 ) VALUES ($1,$2,$3,$4,'calibration_expiry',$5,$6,60,
                           ARRAY[60,30,15,7],$7)`,
                [
                    inspection.client_id,inspection.station_id,inspection.asset_id,
                    document.id,`Istek ovjere: ${certificateNumber}`,
                    inspection.next_due_date,inspection.inspection_number,
                ]
            );
        }
        await connection.query(
            `UPDATE metrology_inspections SET certificate_number=$1,
                certificate_version=$2,certificate_attachment_id=$3,updated_at=NOW()
             WHERE id=$4`,
            [certificateNumber,version,attachment.id,id]
        );
        await connection.query("COMMIT");
        return { ...attachment, certificate_number: certificateNumber, document_id: document.id };
    } catch (error) {
        await connection.query("ROLLBACK");
        throw error;
    } finally {
        connection.release();
    }
};
