import api from "../libs/apiCall.js";

export const getRolesAndPermissions = () => api.get("/roles");
export const createRole = (role) => api.post("/roles", role);
export const updateRolePermissions = (roleId, permissionIds) =>
  api.put(`/roles/${roleId}/permissions`, { permission_ids: permissionIds });
