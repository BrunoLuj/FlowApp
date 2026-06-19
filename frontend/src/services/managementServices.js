import api from "../libs/apiCall.js";

export const getManagementOverview = () => api.get("/management/overview");
export const getPlanner = (from, to) =>
    api.get("/management/planner", { params: { from, to } });
export const updateWorkOrderSchedule = (id, changes) =>
    api.patch(`/work-orders/${id}/schedule`, changes);
export const saveTechnicianAvailability = (data) =>
    api.post("/management/availability", data);
export const deleteTechnicianAvailability = (id) =>
    api.delete(`/management/availability/${id}`);
