import api from "../libs/apiCall.js";

export const getMetrologyCases=()=>api.get("/metrology-cases");
export const getMetrologyCaseOptions=()=>api.get("/metrology-cases/options");
export const getMetrologyCase=id=>api.get(`/metrology-cases/${id}`);
export const createMetrologyCase=data=>api.post("/metrology-cases",data);
export const saveMetrologyCase=(id,data)=>api.put(`/metrology-cases/${id}`,data);
export const completeMetrologyCase=id=>api.post(`/metrology-cases/${id}/complete`);
export const generateMetrologyCaseDocument=(id,type)=>api.post(`/metrology-cases/${id}/documents/${type}`);

export const getMetrologyWorkflow=id=>api.get(`/metrology-cases/${id}/workflow`);
export const saveMetrologyPreparation=(id,data)=>api.put(`/metrology-cases/${id}/preparation`,data);
export const emailMetrologyRequest=(id,data)=>api.post(`/metrology-cases/${id}/email-request`,data);
export const returnMetrologyRequest=(id,file,note)=>{const data=new FormData();data.append('file',file);data.append('note',note||'');return api.post(`/metrology-cases/${id}/returned-request`,data);};
export const generateMetrologyPackage=(id,kind)=>api.post(`/metrology-cases/${id}/packages/${kind}`);
export const closeMetrologyCase=(id,note)=>api.post(`/metrology-cases/${id}/close`,{note});
export const downloadMetrologyFile=(id,fileId)=>api.get(`/metrology-cases/${id}/files/${fileId}`,{responseType:'blob'});
