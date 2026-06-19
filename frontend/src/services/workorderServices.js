import api from '../libs/apiCall.js';

export const getWorkOrders = async () => {
    return await api.get("/work-orders/");
};

export const getWorkOrder = (id) => api.get(`/work-orders/${id}`);
export const getWorkOrderHistory = (id) => api.get(`/work-orders/${id}/history`);
export const getMyMobileWorkOrders = () => api.get("/work-orders/mobile/mine");
export const sendMobileWorkOrderEvent = (id, event) => api.post(`/work-orders/${id}/mobile-events`, event);
export const addWorkOrderActivity = (id, activity) => api.post(`/work-orders/${id}/activities`, activity);
export const addWorkOrderMaterial = (id, material) => api.post(`/work-orders/${id}/materials`, material);
export const addWorkOrderChecklist = (id, item) => api.post(`/work-orders/${id}/checklist`, item);
export const updateWorkOrderChecklist = (id, itemId, changes) => api.patch(`/work-orders/${id}/checklist/${itemId}`, changes);
export const updateWorkOrderFieldData = (id, changes) => api.patch(`/work-orders/${id}/field-data`, changes);
export const completeWorkOrder = (id, data) => api.post(`/work-orders/${id}/complete`, data);

export const saveWorkOrder = async (projectData) => {
    if (projectData.id) {
        return await api.put(`/work-orders/${projectData.id}`, projectData);
    } else {
        return await api.post('/work-orders', projectData);
    }
};

export const deleteWorkOrder = async (project_id) => {
    return await api.delete(`/work-orders/${project_id}`);
};

export const getActiveWorkOrder= async () => {
    return await api.get("/work-orders/active");
};
