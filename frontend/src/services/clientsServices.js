import api from '../libs/apiCall.js';

export const getClients = async () => {
    return await api.get("/clients/");
};

export const getClient = async (clientId) => {
    return await api.get(`/clients/${clientId}`);
};

export const saveClient = async (clientData) => {
    console.log(clientData);
    if (clientData.id) {
        return await api.put(`/clients/${clientData.id}`, clientData);
    } else {
        return await api.post('/clients/', clientData);
    }
};

export const deleteClient = async (client_id) => {
    return await api.delete(`/clients/${client_id}`);
}