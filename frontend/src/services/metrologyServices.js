import api from "../libs/apiCall.js";

export const getMetrologyOverview=()=>api.get("/metrology/overview");
export const getMetrologyAssets=()=>api.get("/metrology/assets");
export const configureMetrologyAsset=(id,data)=>api.put(`/metrology/assets/${id}`,data);
export const createMetrologyInspection=(data)=>api.post("/metrology/inspections",data);
export const getMetrologyInspection=(id)=>api.get(`/metrology/inspections/${id}`);
export const saveMetrologyInspection=(id,data)=>api.put(`/metrology/inspections/${id}`,data);
export const completeMetrologyInspection=(id,data)=>api.post(`/metrology/inspections/${id}/complete`,data);
export const generateMetrologyCertificate=(id)=>api.post(`/metrology/inspections/${id}/certificate`);
