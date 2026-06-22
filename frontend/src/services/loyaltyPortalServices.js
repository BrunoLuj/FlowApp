import api from "../libs/apiCall.js";
export const getMyLoyalty=()=>api.get("/loyalty-portal/me");
export const redeemMyReward=(reward_id)=>api.post("/loyalty-portal/redeem",{reward_id});
