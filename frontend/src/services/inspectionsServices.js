import api from '../libs/apiCall.js';

export const saveAllInspectionsResults = async (data) => {
  return await api.post("/inspections/", data);
};
