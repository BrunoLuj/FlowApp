import api from "../libs/apiCall.js";

export const getInventory = () => api.get("/inventory");
export const getAvailableInventory = () => api.get("/inventory/available");
export const createInventoryItem = (item) => api.post("/inventory/items", item);
export const updateInventoryItem = (id, item) => api.put(`/inventory/items/${id}`, item);
export const createWarehouse = (warehouse) => api.post("/inventory/warehouses", warehouse);
export const createInventoryMovement = (movement) => api.post("/inventory/movements", movement);
