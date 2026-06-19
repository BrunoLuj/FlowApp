import api from "../libs/apiCall.js";

export const getFleetOverview=()=>api.get("/fleet");
export const getFleetOptions=()=>api.get("/fleet/options");
export const getFleetVehicle=id=>api.get(`/fleet/vehicles/${id}`);
export const createFleetVehicle=data=>api.post("/fleet/vehicles",data);
export const updateFleetVehicle=(id,data)=>api.put(`/fleet/vehicles/${id}`,data);
export const createFleetRecord=(vehicleId,data)=>api.post(`/fleet/vehicles/${vehicleId}/records`,data);
export const updateFleetRecord=(id,data)=>api.put(`/fleet/records/${id}`,data);
export const deleteFleetRecord=id=>api.delete(`/fleet/records/${id}`);
