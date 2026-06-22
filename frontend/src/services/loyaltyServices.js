import api from "../libs/apiCall.js";

export const getLoyaltyOverview = (clientId = "") =>
  api.get("/loyalty", { params: clientId ? { client_id: clientId } : {} });
export const saveLoyaltyProgram = (data) => api.post("/loyalty/programs", data);
export const createLoyaltyMember = (data) => api.post("/loyalty/members", data);
export const addLoyaltyTransaction = (data) => api.post("/loyalty/transactions", data);
export const createLoyaltyReward = (data) => api.post("/loyalty/rewards", data);
export const createLoyaltyCampaign = (data) => api.post("/loyalty/campaigns", data);
