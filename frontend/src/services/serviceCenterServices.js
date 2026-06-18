import api from "../libs/apiCall.js";

export const getServiceCenterDashboard = () => api.get("/service-center/dashboard");
export const getStations = () => api.get("/service-center/stations");
export const getStation = (id) => api.get(`/service-center/stations/${id}`);

export const createAsset = (stationId, asset) =>
    api.post(`/service-center/stations/${stationId}/assets`, asset);

export const updateAsset = (assetId, asset) =>
    api.put(`/service-center/assets/${assetId}`, asset);

export const deleteAsset = (assetId) =>
    api.delete(`/service-center/assets/${assetId}`);

export const getServiceRequests = (params = {}) =>
    api.get("/service-requests", { params });

export const createServiceRequest = (request) =>
    api.post("/service-requests", request);

export const updateServiceRequest = (id, changes) =>
    api.patch(`/service-requests/${id}`, changes);

export const getServiceRequest = (id) =>
    api.get(`/service-requests/${id}`);

export const addServiceRequestMessage = (id, message) =>
    api.post(`/service-requests/${id}/messages`, message);

export const convertServiceRequestToWorkOrder = (id, workOrder) =>
    api.post(`/service-requests/${id}/convert-to-work-order`, workOrder);
