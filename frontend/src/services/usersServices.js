import api from '../libs/apiCall.js';

export const getUsers = async () => {
    return await api.get("/user/all");
};

export const saveUser = async (userData) => {
    if (userData.id) {
        return await api.put(`/user/${userData.id}`, userData);
    } else {
        return await api.post('/user/', userData);
    }
};

export const saveUserProfile = async (userData) => {
    if (userData.id) {
        return await api.put(`/user/profile/${userData.id}`, userData);
    }
};

export const deleteUser = async (user_id) => {
    return await api.delete(`/user/${user_id}`);
}

export const getRoles = async () => {
    return await api.get(`/user/roles/`);
}

export const changePassword = async (userData) => {
    if (userData.id) {
        return await api.put(`/user/change-password/${userData.id}`, userData);
    }
};