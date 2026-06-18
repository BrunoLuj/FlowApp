import { pool } from "../libs/database.js";

export const getInventoryOverview = async () => {
    const [items, warehouses, movements, summary] = await Promise.all([
        pool.query(
            `SELECT i.*,
                    COALESCE(SUM(s.quantity), 0)::numeric AS total_quantity,
                    COALESCE(JSONB_AGG(
                        JSONB_BUILD_OBJECT(
                            'warehouse_id', w.id,
                            'warehouse_name', w.name,
                            'quantity', s.quantity
                        )
                    ) FILTER (WHERE s.id IS NOT NULL), '[]'::jsonb) AS stock
             FROM inventory_items i
             LEFT JOIN inventory_stock s ON s.item_id = i.id
             LEFT JOIN warehouse_locations w ON w.id = s.warehouse_id
             GROUP BY i.id
             ORDER BY i.active DESC, i.name`
        ),
        pool.query(
            `SELECT w.*, COUNT(s.item_id)::int AS stocked_items,
                    COALESCE(SUM(s.quantity), 0)::numeric AS total_units
             FROM warehouse_locations w
             LEFT JOIN inventory_stock s ON s.warehouse_id = w.id
             GROUP BY w.id ORDER BY w.name`
        ),
        pool.query(
            `SELECT m.*, i.sku, i.name AS item_name, i.unit,
                    w.name AS warehouse_name,
                    CONCAT(u.firstname, ' ', u.lastname) AS created_by_name
             FROM inventory_movements m
             JOIN inventory_items i ON i.id = m.item_id
             JOIN warehouse_locations w ON w.id = m.warehouse_id
             LEFT JOIN users u ON u.id = m.created_by
             ORDER BY m.created_at DESC LIMIT 100`
        ),
        pool.query(
            `SELECT
                (SELECT COUNT(*)::int FROM inventory_items WHERE active = TRUE) AS active_items,
                (SELECT COUNT(*)::int FROM inventory_items i
                 WHERE i.active = TRUE AND
                    COALESCE((SELECT SUM(s.quantity) FROM inventory_stock s WHERE s.item_id = i.id), 0)
                    <= i.minimum_quantity) AS low_stock_items,
                (SELECT COALESCE(SUM(s.quantity * COALESCE(i.purchase_price, 0)), 0)
                 FROM inventory_stock s JOIN inventory_items i ON i.id = s.item_id) AS stock_value,
                (SELECT COUNT(*)::int FROM warehouse_locations WHERE active = TRUE) AS warehouses`
        ),
    ]);

    return {
        items: items.rows,
        warehouses: warehouses.rows,
        movements: movements.rows,
        summary: summary.rows[0],
    };
};

export const getAvailableItems = async () => {
    const result = await pool.query(
        `SELECT i.id, i.sku, i.name, i.unit, i.purchase_price,
                s.warehouse_id, w.name AS warehouse_name, s.quantity
         FROM inventory_items i
         JOIN inventory_stock s ON s.item_id = i.id
         JOIN warehouse_locations w ON w.id = s.warehouse_id
         WHERE i.active = TRUE AND w.active = TRUE AND s.quantity > 0
         ORDER BY i.name, w.name`
    );
    return result.rows;
};

export const createItem = async (data) => {
    const result = await pool.query(
        `INSERT INTO inventory_items (
            sku, name, description, category, manufacturer, supplier, unit,
            purchase_price, selling_price, minimum_quantity, active
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING *`,
        [
            data.sku,
            data.name,
            data.description || null,
            data.category || null,
            data.manufacturer || null,
            data.supplier || null,
            data.unit || "kom",
            data.purchase_price || null,
            data.selling_price || null,
            Number(data.minimum_quantity) || 0,
            data.active !== false,
        ]
    );
    return result.rows[0];
};

export const updateItem = async (id, data) => {
    const result = await pool.query(
        `UPDATE inventory_items SET
            sku=$1, name=$2, description=$3, category=$4, manufacturer=$5,
            supplier=$6, unit=$7, purchase_price=$8, selling_price=$9,
            minimum_quantity=$10, active=$11, updated_at=NOW()
         WHERE id=$12 RETURNING *`,
        [
            data.sku,
            data.name,
            data.description || null,
            data.category || null,
            data.manufacturer || null,
            data.supplier || null,
            data.unit || "kom",
            data.purchase_price || null,
            data.selling_price || null,
            Number(data.minimum_quantity) || 0,
            data.active !== false,
            id,
        ]
    );
    return result.rows[0];
};

export const createWarehouse = async (data) => {
    const result = await pool.query(
        `INSERT INTO warehouse_locations(code, name, address, active)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [data.code, data.name, data.address || null, data.active !== false]
    );
    return result.rows[0];
};

export const recordMovement = async (data, userId) => {
    const connection = await pool.connect();
    try {
        await connection.query("BEGIN");
        const signedQuantity = ["receipt", "adjustment_in", "return"].includes(data.movement_type)
            ? Number(data.quantity)
            : -Number(data.quantity);

        const stockResult = await connection.query(
            `INSERT INTO inventory_stock(warehouse_id, item_id, quantity)
             VALUES ($1, $2, $3)
             ON CONFLICT (warehouse_id, item_id)
             DO UPDATE SET quantity = inventory_stock.quantity + EXCLUDED.quantity,
                           updated_at = NOW()
             RETURNING quantity`,
            [data.warehouse_id, data.item_id, signedQuantity]
        );

        if (Number(stockResult.rows[0].quantity) < 0) {
            const error = new Error("Insufficient stock");
            error.code = "INSUFFICIENT_STOCK";
            throw error;
        }

        const movementResult = await connection.query(
            `INSERT INTO inventory_movements (
                warehouse_id, item_id, movement_type, quantity,
                reference_type, reference_id, work_order_id, note, unit_cost, created_by
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             RETURNING *`,
            [
                data.warehouse_id,
                data.item_id,
                data.movement_type,
                Number(data.quantity),
                data.reference_type || null,
                data.reference_id || null,
                data.work_order_id || null,
                data.note || null,
                data.unit_cost || null,
                userId,
            ]
        );
        await connection.query("COMMIT");
        return movementResult.rows[0];
    } catch (error) {
        await connection.query("ROLLBACK");
        throw error;
    } finally {
        connection.release();
    }
};
