import api from "../libs/apiCall.js";

export const getEmailCenter = () => api.get("/email-center");
export const saveEmailSetting = (eventType, data) =>
  api.put(`/email-center/settings/${eventType}`, data);
export const retryEmail = (id) => api.post(`/email-center/retry/${id}`);
export const processEmailQueue = () => api.post("/email-center/process");
