import "dotenv/config";
import app from "./app.js";
import {
    generateScheduledEmails,
    processEmailQueue,
} from "./models/emailNotificationModel.js";
import { generateDuePlans } from "./models/maintenanceModel.js";
import { generateDueMetrologyOrders } from "./models/metrologyModel.js";

const PORT = process.env.PORT || 5000;
if(!process.env.JWT_SECRET){
    throw new Error("JWT_SECRET is required");
}
if(process.env.NODE_ENV==="production"&&process.env.JWT_SECRET.length<32){
    throw new Error("JWT_SECRET must contain at least 32 characters in production");
}
app.listen(PORT, () =>{
    console.log(`Server running on ${PORT}`);
});

const runEmailWorker = async () => {
    try {
        await generateScheduledEmails();
        await processEmailQueue(25);
    } catch (error) {
        console.error("Email worker failed:", error);
    }
};
const emailWorker = setInterval(runEmailWorker, 5 * 60 * 1000);
emailWorker.unref();
setTimeout(runEmailWorker, 15 * 1000).unref();

const runMaintenanceWorker = async () => {
    try {
        await generateDuePlans({ userId: null, clientId: null });
        await generateDueMetrologyOrders({ userId: null, clientId: null });
    } catch (error) {
        console.error("Preventive maintenance worker failed:", error);
    }
};
const maintenanceWorker = setInterval(runMaintenanceWorker, 60 * 60 * 1000);
maintenanceWorker.unref();
setTimeout(runMaintenanceWorker, 30 * 1000).unref();


