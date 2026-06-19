import { pool } from "../libs/database.js";

export const getOverview = async () => {
    const [stats, vehicles, dueRecords, costs] = await Promise.all([
        pool.query(
            `SELECT
                COUNT(*) FILTER (WHERE status='active')::int active_vehicles,
                COUNT(*) FILTER (WHERE status='in_service')::int vehicles_in_service,
                (SELECT COUNT(*)::int FROM fleet_vehicle_records
                 WHERE status='active' AND due_date<CURRENT_DATE) overdue_records,
                (SELECT COUNT(*)::int FROM fleet_vehicle_records
                 WHERE status='active' AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE+30) due_next_30_days
             FROM fleet_vehicles`
        ),
        pool.query(
            `SELECT v.*,CONCAT(u.firstname,' ',u.lastname) assigned_user_name,
                    next_record.title next_deadline_title,next_record.record_type next_deadline_type,
                    next_record.due_date next_due_date,
                    (next_record.due_date-CURRENT_DATE)::int next_days_remaining
             FROM fleet_vehicles v
             LEFT JOIN users u ON u.id=v.assigned_user_id
             LEFT JOIN LATERAL (
                SELECT r.title,r.record_type,r.due_date
                FROM fleet_vehicle_records r
                WHERE r.vehicle_id=v.id AND r.status='active' AND r.due_date IS NOT NULL
                ORDER BY r.due_date LIMIT 1
             ) next_record ON TRUE
             ORDER BY v.status,v.registration_number`
        ),
        pool.query(
            `SELECT r.*,v.registration_number,v.make,v.model,
                    (r.due_date-CURRENT_DATE)::int days_remaining
             FROM fleet_vehicle_records r
             JOIN fleet_vehicles v ON v.id=r.vehicle_id
             WHERE r.status='active' AND r.due_date<=CURRENT_DATE+60
             ORDER BY r.due_date,r.record_type`
        ),
        pool.query(
            `SELECT TO_CHAR(DATE_TRUNC('month',performed_at),'YYYY-MM') month,
                    COALESCE(SUM(cost),0)::numeric total
             FROM fleet_vehicle_records
             WHERE performed_at>=DATE_TRUNC('month',CURRENT_DATE)-INTERVAL '5 months'
               AND cost IS NOT NULL
             GROUP BY DATE_TRUNC('month',performed_at)
             ORDER BY DATE_TRUNC('month',performed_at)`
        ),
    ]);
    return {
        stats: stats.rows[0],
        vehicles: vehicles.rows,
        dueRecords: dueRecords.rows,
        monthlyCosts: costs.rows,
    };
};

export const getOptions = async () => {
    const users = await pool.query(
        `SELECT id,firstname,lastname FROM users
         WHERE COALESCE(status,TRUE)=TRUE ORDER BY firstname,lastname`
    );
    return { users: users.rows };
};

export const getVehicle = async (id) => {
    const vehicle = (await pool.query(
        `SELECT v.*,CONCAT(u.firstname,' ',u.lastname) assigned_user_name
         FROM fleet_vehicles v LEFT JOIN users u ON u.id=v.assigned_user_id
         WHERE v.id=$1`,
        [id]
    )).rows[0];
    if (!vehicle) return null;
    const records = await pool.query(
        `SELECT r.*,(r.due_date-CURRENT_DATE)::int days_remaining
         FROM fleet_vehicle_records r WHERE r.vehicle_id=$1
         ORDER BY COALESCE(r.due_date,r.performed_at) DESC,r.created_at DESC`,
        [id]
    );
    return { ...vehicle, records: records.rows };
};

export const createVehicle = async (data,userId) => {
    const result = await pool.query(
        `INSERT INTO fleet_vehicles (
            registration_number,make,model,vehicle_type,vin,manufacture_year,
            first_registration_date,current_odometer,fuel_type,assigned_user_id,
            status,notes,created_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [
            data.registration_number?.trim().toUpperCase(),data.make?.trim(),data.model?.trim(),
            data.vehicle_type || "service_van",data.vin || null,data.manufacture_year || null,
            data.first_registration_date || null,Number(data.current_odometer) || 0,
            data.fuel_type || null,data.assigned_user_id || null,data.status || "active",
            data.notes || null,userId,
        ]
    );
    return result.rows[0];
};

export const updateVehicle = async (id,data) => {
    const result = await pool.query(
        `UPDATE fleet_vehicles SET
            registration_number=$1,make=$2,model=$3,vehicle_type=$4,vin=$5,
            manufacture_year=$6,first_registration_date=$7,current_odometer=$8,
            fuel_type=$9,assigned_user_id=$10,status=$11,notes=$12,updated_at=NOW()
         WHERE id=$13 RETURNING *`,
        [
            data.registration_number?.trim().toUpperCase(),data.make?.trim(),data.model?.trim(),
            data.vehicle_type || "service_van",data.vin || null,data.manufacture_year || null,
            data.first_registration_date || null,Number(data.current_odometer) || 0,
            data.fuel_type || null,data.assigned_user_id || null,data.status || "active",
            data.notes || null,id,
        ]
    );
    return result.rows[0];
};

export const createRecord = async (vehicleId,data,userId) => {
    const connection = await pool.connect();
    try {
        await connection.query("BEGIN");
        const vehicle = (await connection.query(
            "SELECT id,current_odometer FROM fleet_vehicles WHERE id=$1 FOR UPDATE",
            [vehicleId]
        )).rows[0];
        if (!vehicle) {
            await connection.query("ROLLBACK");
            return null;
        }
        const result = await connection.query(
            `INSERT INTO fleet_vehicle_records (
                vehicle_id,record_type,title,performed_at,due_date,odometer,next_odometer,
                provider,document_number,cost,currency,status,notes,created_by
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
            [
                vehicleId,data.record_type,data.title?.trim(),data.performed_at || null,
                data.due_date || null,data.odometer || null,data.next_odometer || null,
                data.provider || null,data.document_number || null,data.cost || null,
                data.currency || "BAM",data.status || "active",data.notes || null,userId,
            ]
        );
        if (Number(data.odometer) > Number(vehicle.current_odometer)) {
            await connection.query(
                "UPDATE fleet_vehicles SET current_odometer=$1,updated_at=NOW() WHERE id=$2",
                [data.odometer,vehicleId]
            );
        }
        await connection.query("COMMIT");
        return result.rows[0];
    } catch (error) {
        await connection.query("ROLLBACK");
        throw error;
    } finally {
        connection.release();
    }
};

export const updateRecord = async (id,data) => {
    const result = await pool.query(
        `UPDATE fleet_vehicle_records SET
            record_type=$1,title=$2,performed_at=$3,due_date=$4,odometer=$5,
            next_odometer=$6,provider=$7,document_number=$8,cost=$9,currency=$10,
            status=$11,notes=$12,updated_at=NOW()
         WHERE id=$13 RETURNING *`,
        [
            data.record_type,data.title?.trim(),data.performed_at || null,data.due_date || null,
            data.odometer || null,data.next_odometer || null,data.provider || null,
            data.document_number || null,data.cost || null,data.currency || "BAM",
            data.status || "active",data.notes || null,id,
        ]
    );
    return result.rows[0];
};

export const deleteRecord = async (id) => {
    const result = await pool.query(
        "DELETE FROM fleet_vehicle_records WHERE id=$1 RETURNING id",
        [id]
    );
    return result.rows[0];
};
