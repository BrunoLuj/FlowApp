import api from "../libs/apiCall.js";

export const getMaintenancePlans = () => api.get("/maintenance/plans");
export const getMaintenanceAssets = () => api.get("/maintenance/assets");
export const createMaintenancePlan = (plan) => api.post("/maintenance/plans", plan);
export const updateMaintenancePlan = (id, plan) => api.put(`/maintenance/plans/${id}`, plan);
export const generateMaintenancePlan = (id) => api.post(`/maintenance/plans/${id}/generate`);
export const generateDueMaintenance = () => api.post("/maintenance/generate-due");
export const ensureAssetToken = (assetId) => api.post(`/maintenance/assets/${assetId}/token`);
export const getPublicAsset = (token) => api.get(`/maintenance/public/assets/${token}`);
