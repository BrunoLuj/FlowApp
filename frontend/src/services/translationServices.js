import api from '../libs/apiCall.js';

export const fetchTranslations = async (lang) => {
    const response = await api.get(`/translations/${lang}`);
    return response.data;
};