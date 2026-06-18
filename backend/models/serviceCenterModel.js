import { pool } from "../libs/database.js";

const scope = (clientId, alias = "") => {
    const column = alias ? `${alias}.client_id` : "client_id";
    return clientId ? { clause: `WHERE ${column} = $1`, values: [clientId] } : { clause: "", values: [] };
};

export const getDashboard = async (clientId = null) => {
    const clientScope = scope(clientId);
    const deadlineScope = scope(clientId, "d");
    const requestScope = scope(clientId, "sr");
    const stationScope = scope(clientId, "p");

    const [
        clientsResult,
        stationsResult,
        assetsResult,
        requestsResult,
        workOrdersResult,
        deadlinesResult,
        recentRequestsResult,
        stationListResult,
    ] = await Promise.all([
        clientId
            ? pool.query("SELECT COUNT(*)::int AS count FROM clients WHERE id = $1", [clientId])
            : pool.query("SELECT COUNT(*)::int AS count FROM clients WHERE status = TRUE"),
        pool.query(
            `SELECT COUNT(*)::int AS count FROM projects p ${stationScope.clause}
             ${stationScope.clause ? "AND" : "WHERE"} COALESCE(p.active, TRUE) = TRUE`,
            stationScope.values
        ),
        pool.query(
            `SELECT (
                (SELECT COUNT(*) FROM equipment_assets ${clientScope.clause}) +
                (SELECT COUNT(*) FROM sonda ${clientScope.clause}) +
                (SELECT COUNT(*) FROM volumeters ${clientScope.clause}) +
                (SELECT COUNT(*) FROM rezervoar ${clientScope.clause}) +
                (SELECT COUNT(*) FROM mjerna_letva ${clientScope.clause})
            )::int AS count`,
            clientScope.values
        ),
        pool.query(
            `SELECT COUNT(*)::int AS count
             FROM service_requests sr
             ${requestScope.clause}
             ${requestScope.clause ? "AND" : "WHERE"} sr.status NOT IN ('resolved', 'cancelled')`,
            requestScope.values
        ),
        pool.query(
            `SELECT COUNT(*)::int AS count
             FROM work_orders wo
             JOIN projects p ON p.id = COALESCE(wo.station_id, wo.project_id)
             ${stationScope.clause}
             ${stationScope.clause ? "AND" : "WHERE"} LOWER(COALESCE(wo.status, '')) NOT IN ('completed', 'završen', 'zavrsen')`,
            stationScope.values
        ),
        pool.query(
            `SELECT d.id, d.title, d.deadline_type, d.due_date, d.warning_days,
                    c.company_name AS client_name, p.name AS station_name,
                    (d.due_date - CURRENT_DATE)::int AS days_remaining
             FROM compliance_deadlines d
             JOIN clients c ON c.id = d.client_id
             LEFT JOIN projects p ON p.id = d.station_id
             ${deadlineScope.clause}
             ${deadlineScope.clause ? "AND" : "WHERE"} d.status = 'active'
             AND d.due_date <= CURRENT_DATE + GREATEST(d.warning_days, 60)
             ORDER BY d.due_date ASC
             LIMIT 12`,
            deadlineScope.values
        ),
        pool.query(
            `SELECT sr.id, sr.request_number, sr.subject, sr.priority, sr.status, sr.created_at,
                    c.company_name AS client_name, p.name AS station_name
             FROM service_requests sr
             JOIN clients c ON c.id = sr.client_id
             LEFT JOIN projects p ON p.id = sr.station_id
             ${requestScope.clause}
             ORDER BY sr.created_at DESC
             LIMIT 8`,
            requestScope.values
        ),
        pool.query(
            `SELECT p.id, p.name, p.city, p.address, p.active, p.station_code,
                    c.company_name AS client_name,
                    COUNT(ea.id)::int AS registered_assets
             FROM projects p
             JOIN clients c ON c.id = p.client_id
             LEFT JOIN equipment_assets ea ON ea.station_id = p.id
             ${stationScope.clause}
             GROUP BY p.id, c.company_name
             ORDER BY c.company_name, p.name
             LIMIT 8`,
            stationScope.values
        ),
    ]);

    const deadlines = deadlinesResult.rows;

    return {
        stats: {
            clients: clientsResult.rows[0].count,
            stations: stationsResult.rows[0].count,
            assets: assetsResult.rows[0].count,
            openRequests: requestsResult.rows[0].count,
            activeWorkOrders: workOrdersResult.rows[0].count,
            overdueDeadlines: deadlines.filter((item) => item.days_remaining < 0).length,
        },
        deadlines,
        recentRequests: recentRequestsResult.rows,
        stations: stationListResult.rows,
    };
};

export const getStations = async (clientId = null) => {
    const stationScope = scope(clientId, "p");
    const result = await pool.query(
        `SELECT p.*, c.company_name AS client_name,
                COUNT(ea.id)::int AS registered_assets
         FROM projects p
         JOIN clients c ON c.id = p.client_id
         LEFT JOIN equipment_assets ea ON ea.station_id = p.id
         ${stationScope.clause}
         GROUP BY p.id, c.company_name
         ORDER BY c.company_name, p.name`,
        stationScope.values
    );
    return result.rows;
};
