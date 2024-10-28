import api from '../libs/apiCall.js';

export const getProjects = async () => {
    return await api.get("/projects/");
};