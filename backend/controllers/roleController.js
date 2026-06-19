import * as roleModel from "../models/roleModel.js";

export const getRoles = async (_req, res) => {
    try {
        res.json(await roleModel.getRolesWithPermissions());
    } catch (error) {
        console.error("Error fetching roles:", error);
        res.status(500).json({ error: "Error fetching roles and permissions" });
    }
};

export const addRole = async (req, res) => {
    if (!req.body.name?.trim()) return res.status(400).json({ error: "Role name is required" });
    try {
        res.status(201).json(await roleModel.createRole(req.body));
    } catch (error) {
        if (error.code === "INVALID_ROLE_NAME") return res.status(400).json({ error: error.message });
        if (error.code === "23505") return res.status(409).json({ error: "Role name already exists" });
        console.error("Error creating role:", error);
        res.status(500).json({ error: "Error creating role" });
    }
};

export const saveRolePermissions = async (req, res) => {
    const permissionIds = [...new Set(
        (Array.isArray(req.body.permission_ids) ? req.body.permission_ids : [])
            .map(Number)
            .filter(Number.isInteger)
    )];
    try {
        const role = await roleModel.updateRolePermissions(
            req.params.id,
            permissionIds,
            req.user.userId
        );
        if (!role) return res.status(404).json({ error: "Role not found" });
        res.json({ message: "Role permissions updated", role });
    } catch (error) {
        if (error.code === "ADMIN_ROLE_PROTECTED") {
            return res.status(409).json({ error: error.message });
        }
        console.error("Error updating role permissions:", error);
        res.status(500).json({ error: "Error updating role permissions" });
    }
};
