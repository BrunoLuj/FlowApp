import api from '../libs/apiCall.js';

export const signIn = async (data) => {
  return await api.post("/auth/sign-in", data);
};

export const signUp = async (data) => {
    return await api.post("/auth/sign-up", data);
};