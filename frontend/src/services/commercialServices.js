import api from "../libs/apiCall.js";

export const getCommercialOverview = () => api.get("/commercial");
export const getContract = (id) => api.get(`/commercial/contracts/${id}`);
export const createContract = (data) => api.post("/commercial/contracts", data);
export const updateContract = (id, data) => api.put(`/commercial/contracts/${id}`, data);
export const getQuotation = (id) => api.get(`/commercial/quotations/${id}`);
export const createQuotation = (data) => api.post("/commercial/quotations", data);
export const updateQuotation = (id, data) => api.put(`/commercial/quotations/${id}`, data);
export const createQuotationFromWorkOrder = (id) =>
    api.post(`/commercial/quotations/from-work-order/${id}`);
export const getPublicQuotation = (token) =>
    api.get(`/commercial/public/quotations/${token}`);
export const decidePublicQuotation = (token, data) =>
    api.post(`/commercial/public/quotations/${token}/decision`, data);
