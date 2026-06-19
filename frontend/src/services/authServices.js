import api from '../libs/apiCall.js';

export const signIn = async (data) => {
  return await api.post("/auth/sign-in", data);
};

export const getSession = () => api.get("/auth/session");

