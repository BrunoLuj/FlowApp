import api from '../libs/apiCall.js';

export const getProjects = async () => {
    return await api.get("/projects/");
};

export const addProject = async (data) => {
    return await api.post("/projects/", data);
};