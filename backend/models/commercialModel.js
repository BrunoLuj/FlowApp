import { pool } from "../libs/database.js";

const calculateQuotation = (items, discountPercent = 0, taxPercent = 0) => {
    const normalized = items.map((item, index) => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unit_price) || 0;
        const itemDiscount = Number(item.discount_percent) || 0;
        const lineTotal = quantity * unitPrice * (1 - itemDiscount / 100);
        return {
            ...item,
            quantity,
            unit_price: unitPrice,
            discount_percent: itemDiscount,
            line_total: Math.round(lineTotal * 100) / 100,
            sort_order: item.sort_order ?? index,
        };
    });
    const subtotal = normalized.reduce((sum, item) => sum + item.line_total, 0);
    const discountAmount = subtotal * (Number(discountPercent) || 0) / 100;
    const taxable = subtotal - discountAmount;
    const taxAmount = taxable * (Number(taxPercent) || 0) / 100;
    return {
        items: normalized,
        subtotal: Math.round(subtotal * 100) / 100,
        discount_amount: Math.round(discountAmount * 100) / 100,
        tax_amount: Math.round(taxAmount * 100) / 100,
        total: Math.round((taxable + taxAmount) * 100) / 100,
    };
};

export const getCommercialOverview = async (clientId = null) => {
    const values = clientId ? [clientId] : [];
    const clientCondition = clientId ? "WHERE c.id = $1" : "";
    const quoteClientCondition = clientId ? "AND q.client_id = $1" : "";
    const contractClientCondition = clientId ? "AND sc.client_id = $1" : "";

    const [contracts, quotations, clients, stations, workOrders, summary] = await Promise.all([
        pool.query(
            `SELECT sc.*, c.company_name,
                    COUNT(cs.station_id)::int AS covered_stations
             FROM service_contracts sc
             JOIN clients c ON c.id = sc.client_id
             LEFT JOIN contract_stations cs ON cs.contract_id = sc.id
             WHERE 1=1 ${contractClientCondition}
             GROUP BY sc.id, c.company_name
             ORDER BY sc.status = 'active' DESC, sc.end_date NULLS LAST`,
            values
        ),
        pool.query(
            `SELECT q.*, c.company_name, p.name AS station_name
             FROM quotations q
             JOIN clients c ON c.id = q.client_id
             LEFT JOIN projects p ON p.id = q.station_id
             WHERE 1=1 ${quoteClientCondition}
             ORDER BY q.created_at DESC`,
            values
        ),
        pool.query(
            `SELECT c.id, c.company_name FROM clients c
             ${clientCondition} ORDER BY c.company_name`,
            values
        ),
        pool.query(
            `SELECT p.id, p.client_id, p.name, c.company_name
             FROM projects p JOIN clients c ON c.id = p.client_id
             ${clientId ? "WHERE p.client_id = $1" : ""}
             ORDER BY c.company_name, p.name`,
            values
        ),
        pool.query(
            `SELECT wo.id, wo.title, p.client_id, c.company_name,
                    COALESCE(wo.station_id, wo.project_id) AS station_id
             FROM work_orders wo
             JOIN projects p ON p.id = COALESCE(wo.station_id, wo.project_id)
             JOIN clients c ON c.id = p.client_id
             ${clientId ? "WHERE p.client_id = $1" : ""}
             ORDER BY wo.created_at DESC LIMIT 100`,
            values
        ),
        pool.query(
            `SELECT
                (SELECT COUNT(*)::int FROM service_contracts sc
                 WHERE sc.status='active' ${contractClientCondition}) AS active_contracts,
                (SELECT COUNT(*)::int FROM service_contracts sc
                 WHERE sc.status='active' AND sc.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 60
                 ${contractClientCondition}) AS expiring_contracts,
                (SELECT COUNT(*)::int FROM quotations q
                 WHERE q.status='sent' ${quoteClientCondition}) AS awaiting_approval,
                (SELECT COALESCE(SUM(q.total),0) FROM quotations q
                 WHERE q.status='accepted'
                   AND q.accepted_at >= DATE_TRUNC('month', CURRENT_DATE)
                 ${quoteClientCondition}) AS accepted_this_month`,
            values
        ),
    ]);

    return {
        contracts: contracts.rows,
        quotations: quotations.rows,
        clients: clients.rows,
        stations: stations.rows,
        workOrders: workOrders.rows,
        summary: summary.rows[0],
    };
};

export const getContractById = async (id, clientId = null) => {
    const values = [id];
    let clientCondition = "";
    if (clientId) {
        values.push(clientId);
        clientCondition = `AND sc.client_id = $${values.length}`;
    }
    const [contract, stations] = await Promise.all([
        pool.query(
            `SELECT sc.*, c.company_name FROM service_contracts sc
             JOIN clients c ON c.id=sc.client_id
             WHERE sc.id=$1 ${clientCondition}`,
            values
        ),
        pool.query(
            `SELECT p.id, p.name FROM contract_stations cs
             JOIN projects p ON p.id=cs.station_id
             JOIN service_contracts sc ON sc.id=cs.contract_id
             WHERE cs.contract_id=$1 ${clientId ? `AND sc.client_id=$${values.length}` : ""}`,
            values
        ),
    ]);
    if (!contract.rows[0]) return null;
    return { ...contract.rows[0], stations: stations.rows };
};

export const saveContract = async (id, data, user) => {
    const connection = await pool.connect();
    try {
        await connection.query("BEGIN");
        let result;
        if (id) {
            const values = [
                data.contract_number, user.clientId || data.client_id, data.title, data.status,
                data.start_date, data.end_date || null, data.monthly_fee || 0,
                data.currency || "EUR", data.billing_cycle || "monthly",
                data.response_hours_normal || null, data.response_hours_high || null,
                data.response_hours_urgent || null, data.resolution_hours_normal || null,
                data.resolution_hours_high || null, data.resolution_hours_urgent || null,
                JSON.stringify(data.included_services || []), data.notes || null, id,
            ];
            let scope = "";
            if (user.clientId) {
                values.push(user.clientId);
                scope = `AND client_id=$${values.length}`;
            }
            result = await connection.query(
                `UPDATE service_contracts SET
                    contract_number=$1, client_id=$2, title=$3, status=$4,
                    start_date=$5, end_date=$6, monthly_fee=$7, currency=$8,
                    billing_cycle=$9, response_hours_normal=$10,
                    response_hours_high=$11, response_hours_urgent=$12,
                    resolution_hours_normal=$13, resolution_hours_high=$14,
                    resolution_hours_urgent=$15, included_services=$16::jsonb,
                    notes=$17, updated_at=NOW()
                 WHERE id=$18 ${scope} RETURNING *`,
                values
            );
        } else {
            result = await connection.query(
                `INSERT INTO service_contracts (
                    contract_number, client_id, title, status, start_date, end_date,
                    monthly_fee, currency, billing_cycle, response_hours_normal,
                    response_hours_high, response_hours_urgent, resolution_hours_normal,
                    resolution_hours_high, resolution_hours_urgent, included_services,
                    notes, created_by
                 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17,$18)
                 RETURNING *`,
                [
                    data.contract_number, user.clientId || data.client_id, data.title,
                    data.status || "draft", data.start_date, data.end_date || null,
                    data.monthly_fee || 0, data.currency || "EUR",
                    data.billing_cycle || "monthly", data.response_hours_normal || null,
                    data.response_hours_high || null, data.response_hours_urgent || null,
                    data.resolution_hours_normal || null, data.resolution_hours_high || null,
                    data.resolution_hours_urgent || null,
                    JSON.stringify(data.included_services || []), data.notes || null, user.userId,
                ]
            );
        }
        const contract = result.rows[0];
        if (!contract) {
            await connection.query("ROLLBACK");
            return null;
        }
        await connection.query("DELETE FROM contract_stations WHERE contract_id=$1", [contract.id]);
        for (const stationId of data.station_ids || []) {
            await connection.query(
                `INSERT INTO contract_stations(contract_id, station_id)
                 SELECT $1, p.id FROM projects p
                 WHERE p.id=$2 AND p.client_id=$3
                 ON CONFLICT DO NOTHING`,
                [contract.id, stationId, contract.client_id]
            );
        }
        await connection.query("COMMIT");
        return contract;
    } catch (error) {
        await connection.query("ROLLBACK");
        throw error;
    } finally {
        connection.release();
    }
};

export const getQuotationById = async (id, clientId = null) => {
    const values = [id];
    let clientCondition = "";
    if (clientId) {
        values.push(clientId);
        clientCondition = `AND q.client_id=$${values.length}`;
    }
    const [quotation, items] = await Promise.all([
        pool.query(
            `SELECT q.*, c.company_name, c.address AS client_address,
                    c.email AS client_email, p.name AS station_name
             FROM quotations q JOIN clients c ON c.id=q.client_id
             LEFT JOIN projects p ON p.id=q.station_id
             WHERE q.id=$1 ${clientCondition}`,
            values
        ),
        pool.query(
            `SELECT qi.* FROM quotation_items qi
             JOIN quotations q ON q.id=qi.quotation_id
             WHERE qi.quotation_id=$1 ${clientId ? `AND q.client_id=$${values.length}` : ""}
             ORDER BY qi.sort_order, qi.id`,
            values
        ),
    ]);
    if (!quotation.rows[0]) return null;
    return { ...quotation.rows[0], items: items.rows };
};

export const getPublicQuotation = async (token) => {
    const quotation = await pool.query(
        `SELECT q.*, c.company_name, c.address AS client_address,
                c.email AS client_email, p.name AS station_name
         FROM quotations q JOIN clients c ON c.id=q.client_id
         LEFT JOIN projects p ON p.id=q.station_id
         WHERE q.approval_token=$1 AND q.status IN ('sent','accepted','rejected')`,
        [token]
    );
    if (!quotation.rows[0]) return null;
    const items = await pool.query(
        `SELECT * FROM quotation_items WHERE quotation_id=$1 ORDER BY sort_order,id`,
        [quotation.rows[0].id]
    );
    return { ...quotation.rows[0], items: items.rows };
};

export const saveQuotation = async (id, data, user) => {
    const calculation = calculateQuotation(
        data.items || [],
        data.discount_percent,
        data.tax_percent
    );
    const connection = await pool.connect();
    try {
        await connection.query("BEGIN");
        let result;
        if (id) {
            const values = [
                user.clientId || data.client_id, data.station_id || null, data.service_request_id || null,
                data.work_order_id || null, data.contract_id || null, data.title,
                data.status || "draft", data.issue_date, data.valid_until || null,
                data.currency || "EUR", calculation.subtotal,
                Number(data.discount_percent) || 0, calculation.discount_amount,
                Number(data.tax_percent) || 0, calculation.tax_amount, calculation.total,
                data.notes || null, data.internal_notes || null, id,
            ];
            let scope = "";
            if (user.clientId) {
                values.push(user.clientId);
                scope = `AND client_id=$${values.length}`;
            }
            result = await connection.query(
                `UPDATE quotations SET client_id=$1, station_id=$2,
                    service_request_id=$3, work_order_id=$4, contract_id=$5,
                    title=$6, status=$7, issue_date=$8, valid_until=$9,
                    currency=$10, subtotal=$11, discount_percent=$12,
                    discount_amount=$13, tax_percent=$14, tax_amount=$15,
                    total=$16, notes=$17, internal_notes=$18, updated_at=NOW()
                 WHERE id=$19 ${scope} RETURNING *`,
                values
            );
        } else {
            result = await connection.query(
                `INSERT INTO quotations (
                    quotation_number, client_id, station_id, service_request_id,
                    work_order_id, contract_id, title, status, issue_date,
                    valid_until, currency, subtotal, discount_percent,
                    discount_amount, tax_percent, tax_amount, total, notes,
                    internal_notes, created_by
                 ) VALUES (NULL,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
                 RETURNING *`,
                [
                    user.clientId || data.client_id, data.station_id || null,
                    data.service_request_id || null, data.work_order_id || null,
                    data.contract_id || null, data.title, data.status || "draft",
                    data.issue_date, data.valid_until || null, data.currency || "EUR",
                    calculation.subtotal, Number(data.discount_percent) || 0,
                    calculation.discount_amount, Number(data.tax_percent) || 0,
                    calculation.tax_amount, calculation.total, data.notes || null,
                    data.internal_notes || null, user.userId,
                ]
            );
        }
        const quotation = result.rows[0];
        if (!quotation) {
            await connection.query("ROLLBACK");
            return null;
        }
        await connection.query("DELETE FROM quotation_items WHERE quotation_id=$1", [quotation.id]);
        for (const item of calculation.items) {
            await connection.query(
                `INSERT INTO quotation_items (
                    quotation_id,item_type,description,quantity,unit,unit_price,
                    discount_percent,line_total,inventory_item_id,sort_order
                 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
                [
                    quotation.id, item.item_type || "service", item.description,
                    item.quantity, item.unit || "kom", item.unit_price,
                    item.discount_percent, item.line_total,
                    item.inventory_item_id || null, item.sort_order,
                ]
            );
        }
        await connection.query("COMMIT");
        return { ...quotation, items: calculation.items };
    } catch (error) {
        await connection.query("ROLLBACK");
        throw error;
    } finally {
        connection.release();
    }
};

export const createQuotationFromWorkOrder = async (workOrderId, user) => {
    const order = await pool.query(
        `SELECT wo.*, p.client_id, COALESCE(wo.station_id,wo.project_id) station_id,
                c.company_name FROM work_orders wo
         JOIN projects p ON p.id=COALESCE(wo.station_id,wo.project_id)
         JOIN clients c ON c.id=p.client_id
         WHERE wo.id=$1 ${user.clientId ? "AND p.client_id=$2" : ""}`,
        user.clientId ? [workOrderId, user.clientId] : [workOrderId]
    );
    if (!order.rows[0]) return null;
    const [activities, materials] = await Promise.all([
        pool.query(
            `SELECT COALESCE(SUM(duration_minutes),0)::numeric AS minutes
             FROM work_order_activities WHERE work_order_id=$1`,
            [workOrderId]
        ),
        pool.query(
            `SELECT item_name, quantity, unit, COALESCE(unit_cost,0) unit_cost
             FROM work_order_materials WHERE work_order_id=$1`,
            [workOrderId]
        ),
    ]);
    const items = [];
    const minutes = Number(activities.rows[0].minutes);
    if (minutes > 0) {
        items.push({
            item_type: "labor",
            description: `Servisni rad: ${order.rows[0].title}`,
            quantity: Math.round((minutes / 60) * 100) / 100,
            unit: "sat",
            unit_price: 0,
        });
    }
    for (const material of materials.rows) {
        items.push({
            item_type: "material",
            description: material.item_name,
            quantity: material.quantity,
            unit: material.unit,
            unit_price: material.unit_cost,
        });
    }
    if (!items.length) {
        items.push({
            item_type: "service",
            description: order.rows[0].title,
            quantity: 1,
            unit: "usluga",
            unit_price: 0,
        });
    }
    return saveQuotation(null, {
        client_id: order.rows[0].client_id,
        station_id: order.rows[0].station_id,
        work_order_id: workOrderId,
        title: `Ponuda za ${order.rows[0].title}`,
        status: "draft",
        issue_date: new Date().toISOString().slice(0,10),
        valid_until: null,
        currency: "EUR",
        discount_percent: 0,
        tax_percent: 0,
        items,
    }, user);
};

export const decideQuotation = async (token, data) => {
    const status = data.decision === "accept" ? "accepted" : "rejected";
    const result = await pool.query(
        `UPDATE quotations SET status=$1,
            accepted_by_name=CASE WHEN $1='accepted' THEN $2 ELSE accepted_by_name END,
            accepted_by_email=CASE WHEN $1='accepted' THEN $3 ELSE accepted_by_email END,
            accepted_at=CASE WHEN $1='accepted' THEN NOW() ELSE NULL END,
            rejected_at=CASE WHEN $1='rejected' THEN NOW() ELSE NULL END,
            rejection_reason=CASE WHEN $1='rejected' THEN $4 ELSE NULL END,
            updated_at=NOW()
         WHERE approval_token=$5 AND status='sent'
           AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
         RETURNING *`,
        [status, data.name || null, data.email || null, data.reason || null, token]
    );
    return result.rows[0];
};
