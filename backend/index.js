import cors from "cors";
import express from "express";
import dotenv from  "dotenv";
import routes from "./routes/index.js"
import {
    generateScheduledEmails,
    processEmailQueue,
} from "./models/emailNotificationModel.js";
import { generateDuePlans } from "./models/maintenanceModel.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
}));
app.disable("x-powered-by");
app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
});
app.use(express.json({limit: "10mb"}));
app.use(express.urlencoded({extended: true, limit: "2mb"}));

app.use("/api-v1", routes);

app.use("*", (req, res) =>{
    res.status(404).json({
        status: "404 Not found",
        message: "Route not exist",
    });
});

app.use((error, _req, res, _next) => {
    console.error("Unhandled request error:", error);
    res.status(500).json({ status: "error", message: "Internal server error" });
});

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
    } catch (error) {
        console.error("Preventive maintenance worker failed:", error);
    }
};
const maintenanceWorker = setInterval(runMaintenanceWorker, 60 * 60 * 1000);
maintenanceWorker.unref();
setTimeout(runMaintenanceWorker, 30 * 1000).unref();


