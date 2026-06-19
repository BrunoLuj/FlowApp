import api from "../libs/apiCall.js";

export const getMetrologyCases=()=>api.get("/metrology-cases");
export const getMetrologyCaseOptions=()=>api.get("/metrology-cases/options");
export const getMetrologyCase=id=>api.get(`/metrology-cases/${id}`);
export const createMetrologyCase=data=>api.post("/metrology-cases",data);
export const saveMetrologyCase=(id,data)=>api.put(`/metrology-cases/${id}`,data);
export const completeMetrologyCase=id=>api.post(`/metrology-cases/${id}/complete`);
export const generateMetrologyCaseDocument=(id,type)=>api.post(`/metrology-cases/${id}/documents/${type}`);
