import { pool } from "../libs/database.js";

const checkPermission = (permission) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                status: "auth_failed",
                message: "Authentication failed",
            });
        }

        try {
            const result = await pool.query(`
                SELECT p.name 
                FROM role_permissions rp
                JOIN permissions p ON rp.permission_id = p.id
                WHERE rp.role_id = $1 AND p.name = $2`, 
                [req.user.rolesId, permission]);
            
            if (result.rows.length === 0) {
                return res.status(403).json({
                    status: "forbidden",
                    message: "You do not have permission to perform this action",
                });
            }

            return next();
        } catch (error) {
            console.error("Permission check failed:", error);
            return res.status(500).json({
                status: "error",
                message: "Permission check failed",
            });    
        }
    };
};

export const checkAnyPermission = (permissions) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ status: "auth_failed", message: "Authentication failed" });
        }
        try {
            const result = await pool.query(
                `SELECT 1
                 FROM role_permissions rp
                 JOIN permissions p ON p.id = rp.permission_id
                 WHERE rp.role_id = $1 AND p.name = ANY($2::text[])
                 LIMIT 1`,
                [req.user.rolesId, permissions]
            );
            if (!result.rowCount) {
                return res.status(403).json({
                    status: "forbidden",
                    message: "You do not have permission to perform this action",
                });
            }
            next();
        } catch (error) {
            console.error("Permission check failed:", error);
            res.status(500).json({ status: "error", message: "Permission check failed" });
        }
    };
};

export default checkPermission;
