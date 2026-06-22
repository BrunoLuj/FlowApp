import api from "../libs/apiCall.js";
export const getMyLoyalty=()=>api.get("/loyalty-portal/me");
