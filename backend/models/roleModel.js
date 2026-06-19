import { pool } from "../libs/database.js";

export const getRolesWithPermissions = async () => {
    const [roles, permissions] = await Promise.all([
        pool.query(`
            SELECT r.id, r.name, r.description, r.system_role, r.active,
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'id', p.id, 'name', p.name, 'module', p.module,
                               'action', p.action, 'description', p.description
                           ) ORDER BY p.module, p.name
                       ) FILTER (WHERE p.id IS NOT NULL),
                       '[]'::json
                   ) AS permissions
            FROM roles r
            LEFT JOIN role_permissions rp ON rp.role_id = r.id
            LEFT JOIN permissions p ON p.id = rp.permission_id
            GROUP BY r.id
            ORDER BY r.system_role DESC, r.name
        `),
        pool.query(`
            SELECT id, name, module, action, description
            FROM permissions
            ORDER BY module, name
        `),
    ]);
    return { roles: roles.rows, permissions: permissions.rows };
};

export const createRole = async (data) => {
    const name = data.name.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
    if (!name) {
        const error = new Error("Invalid role name");
        error.code = "INVALID_ROLE_NAME";
        throw error;
    }
    const result = await pool.query(
        `INSERT INTO roles(name, description, system_role, active)
         VALUES ($1, $2, FALSE, TRUE)
         RETURNING *`,
        [name, data.description || null]
    );
    return result.rows[0];
};

export const updateRolePermissions = async (roleId, permissionIds, userId) => {
    const connection = await pool.connect();
    try {
        await connection.query("BEGIN");
        const roleResult = await connection.query(
            "SELECT id, name FROM roles WHERE id = $1 FOR UPDATE",
            [roleId]
        );
        const role = roleResult.rows[0];
        if (!role) {
            await connection.query("ROLLBACK");
            return null;
        }
        if (role.name === "admin") {
            const error = new Error("Administrator permissions cannot be reduced");
            error.code = "ADMIN_ROLE_PROTECTED";
            throw error;
        }

        await connection.query("DELETE FROM role_permissions WHERE role_id = $1", [roleId]);
        if (permissionIds.length) {
            await connection.query(
                `INSERT INTO role_permissions(role_id, permission_id)
                 SELECT $1, id FROM permissions WHERE id = ANY($2::int[])`,
                [roleId, permissionIds]
            );
        }
        await connection.query(
            `INSERT INTO audit_logs(user_id, entity_type, entity_id, action, summary, changes)
             VALUES ($1, 'role', $2, 'permissions_updated', $3, $4::jsonb)`,
            [
                userId,
                String(roleId),
                `Ažurirane permisije role ${role.name}`,
                JSON.stringify({ permission_ids: permissionIds }),
            ]
        );
        await connection.query("COMMIT");
        return role;
    } catch (error) {
        await connection.query("ROLLBACK");
        throw error;
    } finally {
        connection.release();
    }
};
