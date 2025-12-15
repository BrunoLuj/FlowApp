import api from '../libs/apiCall.js';

export const getWorkOrders = async () => {
    return await api.get("/work-orders/");
};

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
