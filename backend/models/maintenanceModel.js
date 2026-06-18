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
        `SELECT mp.*, ea.name AS asset_name, ea.asset_code,
                p.name AS station_name, c.company_name AS client_name,
                (mp.next_due_date - CURRENT_DATE)::int AS days_remaining
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
            assigned_to, checklist_template, created_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13)
         RETURNING *`,
        [
            asset.client_id,
            asset.station_id,
            asset.id,
            data.name,
            data.work_order_type || "Preventive",
            data.description || null,
            Number(data.interval_value),
            data.interval_unit,
            Number(data.lead_days) || 0,
            data.next_due_date,
            JSON.stringify(data.assigned_to || []),
            JSON.stringify(data.checklist_template || []),
            user.userId,
        ]
    );
    return result.rows[0];
};

export const updatePlan = async (id, data, clientId = null) => {
    const values = [
        data.name,
        data.work_order_type,
        data.description || null,
        Number(data.interval_value),
        data.interval_unit,
        Number(data.lead_days) || 0,
        data.next_due_date,
        JSON.stringify(data.assigned_to || []),
        JSON.stringify(data.checklist_template || []),
        data.active !== false,
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
            active=$10, updated_at=NOW()
         WHERE id=$11 ${clientCondition} RETURNING *`,
        values
    );
    return result.rows[0];
};

const generatePlanOrder = async (connection, plan, userId) => {
    const duplicate = await connection.query(
        `SELECT id FROM work_orders
         WHERE maintenance_plan_id = $1
           AND status NOT IN ('Completed', 'Cancelled')
           AND planned_date = $2`,
        [plan.id, plan.next_due_date]
    );
    if (duplicate.rowCount) return { skipped: true, workOrderId: duplicate.rows[0].id };

    const orderResult = await connection.query(
        `INSERT INTO work_orders (
            project_id, station_id, asset_id, maintenance_plan_id,
            type, title, description, assigned_to, planned_date, status
         ) VALUES ($1,$1,$2,$3,$4,$5,$6,$7::jsonb,$8,'Open')
         RETURNING *`,
        [
            plan.station_id,
            plan.asset_id,
            plan.id,
            plan.work_order_type,
            plan.name,
            plan.description,
            JSON.stringify(plan.assigned_to || []),
            plan.next_due_date,
        ]
    );
    const order = orderResult.rows[0];

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

    const expression = nextDateExpression(plan.interval_unit);
    const nextResult = await connection.query(
        `SELECT ${expression} AS next_due_date`,
        [plan.next_due_date, plan.interval_value]
    );
    await connection.query(
        `UPDATE maintenance_plans
         SET last_generated_date = CURRENT_DATE,
             next_due_date = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [nextResult.rows[0].next_due_date, plan.id]
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
            JSON.stringify({ work_order_id: order.id }),
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
         WHERE active = TRUE
           AND next_due_date <= CURRENT_DATE + lead_days
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
