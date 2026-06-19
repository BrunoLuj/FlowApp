import api from "../libs/apiCall.js";

export const getDocumentCenter = (params = {}) =>
  api.get("/document-center", { params });

export const getDocumentVersions = (id) =>
  api.get(`/document-center/${id}/versions`);

export const uploadDocumentVersion = (id, data) => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== "" && value != null) formData.append(key, value);
  });
  return api.post(`/document-center/${id}/versions`, formData);
};
