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

export const createDocument = (stationId, document) =>
    api.post(`/service-center/stations/${stationId}/documents`, document);

export const uploadDocument = (stationId, document) => {
    const formData = new FormData();
    Object.entries(document).forEach(([key, value]) => {
        if (value !== "" && value != null) formData.append(key, value);
    });
    return api.post(`/service-center/stations/${stationId}/documents/upload`, formData);
};

export const downloadDocument = (documentId) =>
    api.get(`/service-center/documents/${documentId}/download`, { responseType: "blob" });

export const deleteDocument = (documentId) =>
    api.delete(`/service-center/documents/${documentId}`);

export const createDeadline = (stationId, deadline) =>
    api.post(`/service-center/stations/${stationId}/deadlines`, deadline);

export const updateDeadline = (deadlineId, changes) =>
    api.patch(`/service-center/deadlines/${deadlineId}`, changes);

export const deleteDeadline = (deadlineId) =>
    api.delete(`/service-center/deadlines/${deadlineId}`);

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

export const uploadAttachment = (type, parentId, attachment) => {
    const formData = new FormData();
    Object.entries(attachment).forEach(([key, value]) => {
        if (value !== "" && value != null) formData.append(key, value);
    });
    return api.post(`/attachments/${type}/${parentId}`, formData);
};

export const downloadAttachment = (attachmentId) =>
    api.get(`/attachments/${attachmentId}/download`, { responseType: "blob" });
