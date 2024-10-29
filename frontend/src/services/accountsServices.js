import api from '../libs/apiCall.js';

export const getAccounts = async () => {
    return await api.get("/account/");
};

export const saveAccount = async (accountData) => {
    console.log(accountData);
    if (accountData.id) {
        return await api.put(`/account/${accountData.id}`, accountData);
    } else {
        return await api.post('/account/', accountData);
    }
};

export const deleteAccount = async (account_id) => {
    return await api.delete(`/account/${account_id}`);
}