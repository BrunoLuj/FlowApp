import express from "express";
import { pool, mysqlMode } from "../libs/database.js";

const router = express.Router();

router.get("/health", async (_req, res) => {
  try {
    const result = await pool.query(`SELECT
      (SELECT COUNT(*) FROM clients) clients,
      (SELECT COUNT(*) FROM projects) stations,
      (SELECT COUNT(*) FROM equipment_assets) equipment,
      (SELECT COUNT(*) FROM inspection_projects) inspection_projects,
      (SELECT COUNT(*) FROM service_events) service_events`);
    res.json({ status: "ok", database: mysqlMode ? "mysql" : "postgres", ...result.rows[0] });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(503).json({ status: "unavailable", database: mysqlMode ? "mysql" : "postgres" });
  }
});

export default router;
