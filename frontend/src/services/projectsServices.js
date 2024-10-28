import api from '../libs/apiCall.js';

export const getProjects = async () => {
    return await api.get("/projects/");
};

export const saveProject = async (projectData) => {
    console.log(projectData);
    if (projectData.id) {
        return await api.put(`/projects/${projectData.id}`, projectData);
    } else {
        return await api.post('/projects', projectData);
    }
};

export const deleteProject = async (project_id) => {
    return await api.delete(`/projects/${project_id}`);
}