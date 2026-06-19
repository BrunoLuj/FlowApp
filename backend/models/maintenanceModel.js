import crypto from "crypto";
import { pool } from "../libs/database.js";

const nextDateExpression = (unit) => {
    const units = {
        days: "($1::date + ($2 || ' days')::interval)::date",
        weeks: "($1::date + ($2 || ' weeks')::interval)::date",
        months: "($1::date + ($2 || ' months')::interval)::date",
        years: "($1::date + ($2 || ' years')::interval)::date",
    };
    return units[unit];
};

export const ensureAssetToken = async (assetId, clientId = null) => {
    const values = [crypto.randomUUID(), assetId];
    let clientCondition = "";
    if (clientId) {
        values.push(clientId);
        clientCondition = `AND client_id = $${values.length}`;
    }
    const result = await pool.query(
        `UPDATE equipment_assets
         SET public_token = COALESCE(public_token, $1::uuid), updated_at = NOW()
         WHERE id = $2 ${clientCondition}
         RETURNING id, public_token, qr_enabled`,
        values
    );
    return result.rows[0];
};

export const getPublicAsset = async (token) => {
    const result = await pool.query(
        `SELECT ea.id, ea.asset_code, ea.category, ea.name, ea.manufacturer,
                ea.model, ea.serial_number, ea.official_mark, ea.status,
                ea.location_description, ea.next_service_at,
                ea.calibration_expires_at, ea.last_service_at,
                p.name AS station_name, p.city, c.company_name AS client_name
         FROM equipment_assets ea
         JOIN projects p ON p.id = ea.station_id
         JOIN clients c ON c.id = ea.client_id
         WHERE ea.public_token = $1 AND ea.qr_enabled = TRUE`,
        [token]
    );
    return result.rows[0];
};

export const getPlans = async (clientId = null) => {
    const values = [];
    let clientCondition = "";
    if (clientId) {
        values.push(clientId);
        clientCondition = `WHERE mp.client_id = $1`;
    }
    const result = await pool.query(
        `SELECT mp.*, TO_CHAR(mp.next_due_date,'YYYY-MM-DD') AS next_due_date,
                ea.name AS asset_name, ea.asset_code, ea.meter_value, ea.meter_unit,
                p.name AS station_name, c.company_name AS client_name,
                CASE WHEN mp.next_due_date IS NULL THEN NULL
                     ELSE (mp.next_due_date - CURRENT_DATE)::int END AS days_remaining,
                CASE WHEN mp.next_due_meter IS NULL OR ea.meter_value IS NULL THEN NULL
                     ELSE mp.next_due_meter - ea.meter_value END AS meter_remaining,
                (SELECT COUNT(*)::int FROM maintenance_occurrences mo
                 WHERE mo.maintenance_plan_id=mp.id AND mo.status='completed') AS completed_cycles,
                (SELECT wo.id FROM work_orders wo
                 WHERE wo.maintenance_plan_id=mp.id
                   AND wo.status NOT IN ('Completed','Cancelled')
                 ORDER BY wo.created_at DESC LIMIT 1) AS active_work_order_id
         FROM maintenance_plans mp
         JOIN equipment_assets ea ON ea.id = mp.asset_id
         JOIN projects p ON p.id = mp.station_id
         JOIN clients c ON c.id = mp.client_id
         ${clientCondition}
         ORDER BY mp.active DESC, mp.next_due_date ASC`,
        values
    );
    return result.rows;
};

export const getMaintenanceAssets = async (clientId = null) => {
    const values = [];
    let clientCondition = "";
    if (clientId) {
        values.push(clientId);
        clientCondition = "WHERE ea.client_id = $1";
    }
    const result = await pool.query(
        `SELECT ea.id, ea.asset_code, ea.name, ea.category, ea.public_token,
                ea.meter_value, ea.meter_unit, ea.meter_updated_at,
                ea.status, p.name AS station_name, c.company_name AS client_name
         FROM equipment_assets ea
         JOIN projects p ON p.id = ea.station_id
         JOIN clients c ON c.id = ea.client_id
         ${clientCondition}
         ORDER BY c.company_name, p.name, ea.name`,
        values
    );
    return result.rows;
};

export const createPlan = async (data, user) => {
    const values = [data.asset_id];
    let clientCondition = "";
    if (user.clientId) {
        values.push(user.clientId);
        clientCondition = `AND ea.client_id = $${values.length}`;
    }
    const assetResult = await pool.query(
        `SELECT ea.id, ea.client_id, ea.station_id
         FROM equipment_assets ea
         WHERE ea.id = $1 ${clientCondition}`,
        values
    );
    const asset = assetResult.rows[0];
    if (!asset) return null;

    const result = await pool.query(
        `INSERT INTO maintenance_plans (
            client_id, station_id, asset_id, name, work_order_type, description,
            interval_value, interval_unit, lead_days, next_due_date,
            assigned_to, checklist_template, created_by, trigger_type,
            meter_interval, meter_lead, next_due_meter, auto_generate,
            generation_horizon_days
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13,
                   $14,$15,$16,$17,$18,$19)
         RETURNING *`,
        [
            asset.client_id,
            asset.station_id,
            asset.id,
            data.name,
            data.work_order_type || "Preventive",
            data.description || null,
            Number(data.interval_value) || 1,
            data.interval_unit || "months",
            Number(data.lead_days) || 0,
            data.next_due_date,
            JSON.stringify(data.assigned_to || []),
            JSON.stringify(data.checklist_template || []),
            user.userId,
            data.trigger_type || "calendar",
            data.meter_interval || null,
            data.meter_lead || 0,
            data.next_due_meter || null,
            data.auto_generate !== false,
            Number(data.generation_horizon_days) || 30,
        ]
    );
    return result.rows[0];
};

export const updatePlan = async (id, data, clientId = null) => {
    const values = [
        data.name,
        data.work_order_type,
        data.description || null,
        Number(data.interval_value) || 1,
        data.interval_unit || "months",
        Number(data.lead_days) || 0,
        data.next_due_date,
        JSON.stringify(data.assigned_to || []),
        JSON.stringify(data.checklist_template || []),
        data.active !== false,
        data.trigger_type || "calendar",
        data.meter_interval || null,
        data.meter_lead || 0,
        data.next_due_meter || null,
        data.auto_generate !== false,
        Number(data.generation_horizon_days) || 30,
        id,
    ];
    let clientCondition = "";
    if (clientId) {
        values.push(clientId);
        clientCondition = `AND client_id = $${values.length}`;
    }
    const result = await pool.query(
        `UPDATE maintenance_plans SET
            name=$1, work_order_type=$2, description=$3, interval_value=$4,
            interval_unit=$5, lead_days=$6, next_due_date=$7,
            assigned_to=$8::jsonb, checklist_template=$9::jsonb,
            active=$10, trigger_type=$11, meter_interval=$12,
            meter_lead=$13, next_due_meter=$14, auto_generate=$15,
            generation_horizon_days=$16, updated_at=NOW()
         WHERE id=$17 ${clientCondition} RETURNING *`,
        values
    );
    return result.rows[0];
};

const generatePlanOrder = async (connection, plan, userId) => {
    const duplicate = await connection.query(
        `SELECT id FROM work_orders
         WHERE maintenance_plan_id = $1
           AND status NOT IN ('Completed', 'Cancelled')
           AND (
                ($2::date IS NOT NULL AND planned_date = $2)
                OR ($2::date IS NULL AND maintenance_occurrence_id IS NOT NULL)
           )`,
        [plan.id, plan.next_due_date || null]
    );
    if (duplicate.rowCount) return { skipped: true, workOrderId: duplicate.rows[0].id };

    const occurrenceResult = await connection.query(
        `INSERT INTO maintenance_occurrences (
            maintenance_plan_id, due_date, due_meter, status, generated_at
         ) VALUES ($1,$2,$3,'generated',NOW())
         RETURNING id`,
        [plan.id, plan.next_due_date || null, plan.next_due_meter || null]
    );
    const occurrenceId = occurrenceResult.rows[0].id;

    const orderResult = await connection.query(
        `INSERT INTO work_orders (
            project_id, station_id, asset_id, maintenance_plan_id, maintenance_occurrence_id,
            type, title, description, assigned_to, planned_date, status
         ) VALUES ($1,$1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,'Open')
         RETURNING *`,
        [
            plan.station_id,
            plan.asset_id,
            plan.id,
            occurrenceId,
            plan.work_order_type,
            plan.name,
            plan.description,
            JSON.stringify(plan.assigned_to || []),
            plan.next_due_date,
        ]
    );
    const order = orderResult.rows[0];
    await connection.query(
        "UPDATE maintenance_occurrences SET work_order_id=$1 WHERE id=$2",
        [order.id, occurrenceId]
    );

    const checklist = Array.isArray(plan.checklist_template) ? plan.checklist_template : [];
    for (let index = 0; index < checklist.length; index += 1) {
        const item = typeof checklist[index] === "string"
            ? { label: checklist[index], required: false }
            : checklist[index];
        if (!item?.label) continue;
        await connection.query(
            `INSERT INTO work_order_checklist_items
                (work_order_id, label, required, sort_order)
             VALUES ($1,$2,$3,$4)`,
            [order.id, item.label, Boolean(item.required), index]
        );
    }

    await connection.query(
        `UPDATE maintenance_plans
         SET last_generated_date = CURRENT_DATE,
             updated_at = NOW()
         WHERE id = $1`,
        [plan.id]
    );

    await connection.query(
        `INSERT INTO audit_logs
            (user_id, client_id, entity_type, entity_id, action, summary, changes)
         VALUES ($1,$2,'maintenance_plan',$3,'generated_work_order',$4,$5::jsonb)`,
        [
            userId,
            plan.client_id,
            String(plan.id),
            `Generated work order ${order.work_order_number || order.id}`,
            JSON.stringify({ work_order_id: order.id, occurrence_id: occurrenceId }),
        ]
    );
    return { skipped: false, workOrder: order };
};

export const generatePlan = async (id, user) => {
    const connection = await pool.connect();
    try {
        await connection.query("BEGIN");
        const values = [id];
        let clientCondition = "";
        if (user.clientId) {
            values.push(user.clientId);
            clientCondition = `AND client_id = $${values.length}`;
        }
        const planResult = await connection.query(
            `SELECT * FROM maintenance_plans
             WHERE id = $1 ${clientCondition} FOR UPDATE`,
            values
        );
        if (!planResult.rows[0]) {
            await connection.query("ROLLBACK");
            return null;
        }
        const generated = await generatePlanOrder(connection, planResult.rows[0], user.userId);
        await connection.query("COMMIT");
        return generated;
    } catch (error) {
        await connection.query("ROLLBACK");
        throw error;
    } finally {
        connection.release();
    }
};

export const generateDuePlans = async (user) => {
    const values = [];
    let clientCondition = "";
    if (user.clientId) {
        values.push(user.clientId);
        clientCondition = `AND client_id = $1`;
    }
    const plans = await pool.query(
        `SELECT * FROM maintenance_plans
         WHERE active = TRUE AND auto_generate = TRUE
           AND (
                (trigger_type IN ('calendar','hybrid')
                 AND next_due_date <= CURRENT_DATE + GREATEST(lead_days,generation_horizon_days))
                OR
                (trigger_type IN ('meter','hybrid')
                 AND next_due_meter IS NOT NULL
                 AND EXISTS (
                    SELECT 1 FROM equipment_assets ea
                    WHERE ea.id=maintenance_plans.asset_id
                      AND ea.meter_value >= next_due_meter-meter_lead
                 ))
           )
           ${clientCondition}
         ORDER BY next_due_date`,
        values
    );
    const results = [];
    for (const plan of plans.rows) {
        results.push(await generatePlan(plan.id, user));
    }
    return results;
};

export const recordAssetMeter = async (assetId, data, user) => {
    const values = [assetId];
    let scope = "";
    if (user.clientId) {
        values.push(user.clientId);
        scope = `AND client_id=$${values.length}`;
    }
    const connection = await pool.connect();
    try {
        await connection.query("BEGIN");
        const assetResult = await connection.query(
            `SELECT * FROM equipment_assets WHERE id=$1 ${scope} FOR UPDATE`,
            values
        );
        const asset = assetResult.rows[0];
        if (!asset) {
            await connection.query("ROLLBACK");
            return null;
        }
        const reading = Number(data.reading_value);
        if (!Number.isFinite(reading) || reading < 0) {
            const error = new Error("Invalid meter reading");
            error.code = "INVALID_READING";
            throw error;
        }
        if (asset.meter_value !== null && reading < Number(asset.meter_value)) {
            const error = new Error("Meter reading cannot decrease");
            error.code = "METER_DECREASE";
            throw error;
        }
        const unit = data.reading_unit || asset.meter_unit || "hours";
        const result = await connection.query(
            `INSERT INTO asset_meter_readings (
                asset_id,reading_value,reading_unit,reading_at,source,
                work_order_id,note,recorded_by
             ) VALUES ($1,$2,$3,COALESCE($4,NOW()),$5,$6,$7,$8) RETURNING *`,
            [
                assetId, reading, unit, data.reading_at || null,
                data.source || "manual", data.work_order_id || null,
                data.note || null, user.userId,
            ]
        );
        await connection.query(
            `UPDATE equipment_assets SET meter_value=$1,meter_unit=$2,
                meter_updated_at=COALESCE($3,NOW()),updated_at=NOW()
             WHERE id=$4`,
            [reading, unit, data.reading_at || null, assetId]
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

export const getMaintenanceOverview = async (clientId = null) => {
    const values = clientId ? [clientId] : [];
    const scope = clientId ? "AND mp.client_id=$1" : "";
    const [summary, calendar, readings, history] = await Promise.all([
        pool.query(
            `SELECT COUNT(*) FILTER (WHERE mp.active)::int active_plans,
                    COUNT(*) FILTER (WHERE mp.active AND mp.next_due_date<CURRENT_DATE)::int overdue,
                    COUNT(*) FILTER (WHERE mp.active AND mp.next_due_date BETWEEN CURRENT_DATE AND CURRENT_DATE+30)::int due_30_days,
                    COUNT(*) FILTER (WHERE mp.active AND mp.next_due_meter IS NOT NULL
                        AND ea.meter_value>=mp.next_due_meter-mp.meter_lead)::int meter_due
             FROM maintenance_plans mp
             JOIN equipment_assets ea ON ea.id=mp.asset_id
             WHERE 1=1 ${scope}`,
            values
        ),
        pool.query(
            `SELECT mp.id,mp.name,TO_CHAR(mp.next_due_date,'YYYY-MM-DD') due_date,
                    mp.next_due_meter,mp.trigger_type,ea.name asset_name,
                    ea.meter_value,ea.meter_unit,p.name station_name,c.company_name client_name
             FROM maintenance_plans mp JOIN equipment_assets ea ON ea.id=mp.asset_id
             JOIN projects p ON p.id=mp.station_id JOIN clients c ON c.id=mp.client_id
             WHERE mp.active AND (
                mp.next_due_date BETWEEN CURRENT_DATE-30 AND CURRENT_DATE+120
                OR (mp.next_due_meter IS NOT NULL AND ea.meter_value>=mp.next_due_meter-mp.meter_lead)
             ) ${scope}
             ORDER BY mp.next_due_date NULLS LAST`,
            values
        ),
        pool.query(
            `SELECT r.*,ea.name asset_name,ea.asset_code,
                    CONCAT(u.firstname,' ',u.lastname) recorded_by_name
             FROM asset_meter_readings r JOIN equipment_assets ea ON ea.id=r.asset_id
             LEFT JOIN users u ON u.id=r.recorded_by
             WHERE 1=1 ${clientId ? "AND ea.client_id=$1" : ""}
             ORDER BY r.reading_at DESC LIMIT 50`,
            values
        ),
        pool.query(
            `SELECT mo.*,mp.name plan_name,ea.name asset_name,
                    wo.work_order_number,wo.title work_order_title
             FROM maintenance_occurrences mo
             JOIN maintenance_plans mp ON mp.id=mo.maintenance_plan_id
             JOIN equipment_assets ea ON ea.id=mp.asset_id
             LEFT JOIN work_orders wo ON wo.id=mo.work_order_id
             WHERE 1=1 ${scope}
             ORDER BY mo.created_at DESC LIMIT 100`,
            values
        ),
    ]);
    return {
        summary: summary.rows[0],
        calendar: calendar.rows,
        readings: readings.rows,
        history: history.rows,
    };
};

export const completeMaintenanceCycle = async (connection, order, completedAt, completedMeter) => {
    if (!order.maintenance_plan_id) return;
    const planResult = await connection.query(
        "SELECT * FROM maintenance_plans WHERE id=$1 FOR UPDATE",
        [order.maintenance_plan_id]
    );
    const plan = planResult.rows[0];
    if (!plan) return;
    let nextDueDate = plan.next_due_date;
    if (plan.trigger_type !== "meter" && completedAt) {
        const expression = nextDateExpression(plan.interval_unit);
        const next = await connection.query(`SELECT ${expression} next_due_date`, [
            new Date(completedAt).toISOString().slice(0, 10),
            plan.interval_value,
        ]);
        nextDueDate = next.rows[0].next_due_date;
    }
    let meter = completedMeter ?? plan.last_completed_meter;
    if (completedMeter !== null && completedMeter !== undefined) {
        if (!Number.isFinite(Number(completedMeter)) || Number(completedMeter) < 0) {
            const error = new Error("Invalid meter reading");
            error.code = "INVALID_READING";
            throw error;
        }
        const asset = await connection.query(
            "SELECT meter_value,meter_unit FROM equipment_assets WHERE id=$1 FOR UPDATE",
            [order.asset_id]
        );
        if (asset.rows[0]?.meter_value !== null && Number(completedMeter) < Number(asset.rows[0].meter_value)) {
            const error = new Error("Meter reading cannot decrease");
            error.code = "METER_DECREASE";
            throw error;
        }
        const unit = asset.rows[0]?.meter_unit || "hours";
        await connection.query(
            `INSERT INTO asset_meter_readings (
                asset_id,reading_value,reading_unit,reading_at,source,
                work_order_id,recorded_by
             ) VALUES ($1,$2,$3,$4,'work_order',$5,$6)`,
            [order.asset_id, completedMeter, unit, completedAt, order.id, order.completed_by]
        );
        await connection.query(
            `UPDATE equipment_assets SET meter_value=$1,meter_unit=$2,
                meter_updated_at=$3::timestamptz,last_service_at=$3::timestamptz,updated_at=NOW()
             WHERE id=$4`,
            [completedMeter, unit, completedAt, order.asset_id]
        );
        meter = completedMeter;
    } else {
        await connection.query(
            `UPDATE equipment_assets SET last_service_at=$1::date,updated_at=NOW()
             WHERE id=$2`,
            [completedAt, order.asset_id]
        );
    }
    const nextDueMeter = plan.trigger_type !== "calendar" && meter !== null && plan.meter_interval
        ? Number(meter) + Number(plan.meter_interval)
        : plan.next_due_meter;
    await connection.query(
        `UPDATE maintenance_plans SET last_completed_at=$1,last_completed_meter=$2,
            next_due_date=$3,next_due_meter=$4,updated_at=NOW() WHERE id=$5`,
        [completedAt, meter ?? null, nextDueDate || null, nextDueMeter ?? null, plan.id]
    );
    if (order.maintenance_occurrence_id) {
        await connection.query(
            `UPDATE maintenance_occurrences SET status='completed',completed_at=$1,
                completed_meter=$2,work_order_id=$3 WHERE id=$4`,
            [completedAt, meter ?? null, order.id, order.maintenance_occurrence_id]
        );
    }
};
