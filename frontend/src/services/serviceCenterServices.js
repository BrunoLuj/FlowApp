import api from "../libs/apiCall.js";

export const getServiceCenterDashboard = () => api.get("/service-center/dashboard");
export const getStations = () => api.get("/service-center/stations");

export const getServiceRequests = (params = {}) =>
    api.get("/service-requests", { params });

export const createServiceRequest = (request) =>
    api.post("/service-requests", request);

export const updateServiceRequest = (id, changes) =>
    api.patch(`/service-requests/${id}`, changes);
