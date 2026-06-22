import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkPermission from "../middleware/permissionsMiddleware.js";
import {uploadSingleFile} from "../middleware/uploadMiddleware.js";
import {
    createRecord,createVehicle,deleteRecord,getOptions,getOverview,getVehicle,
    updateRecord,updateVehicle,
} from "../controllers/fleetController.js";

const router=express.Router();
router.get("/",authMiddleware,checkPermission("view_fleet"),getOverview);
router.get("/options",authMiddleware,checkPermission("view_fleet"),getOptions);
router.get("/vehicles/:id",authMiddleware,checkPermission("view_fleet"),getVehicle);
router.post("/vehicles",authMiddleware,checkPermission("manage_fleet_vehicles"),createVehicle);
router.put("/vehicles/:id",authMiddleware,checkPermission("manage_fleet_vehicles"),updateVehicle);
router.post("/vehicles/:vehicleId/records",authMiddleware,checkPermission("manage_fleet_records"),uploadSingleFile,createRecord);
router.put("/records/:id",authMiddleware,checkPermission("manage_fleet_records"),updateRecord);
router.delete("/records/:id",authMiddleware,checkPermission("delete_fleet_records"),deleteRecord);
export default router;
