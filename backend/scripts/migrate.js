import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../libs/database.js";

const currentFile = fileURLToPath(import.meta.url);
const migrationsDirectory = path.resolve(path.dirname(currentFile), "../migrations");

const run = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id BIGSERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    const files = (await fs.readdir(migrationsDirectory))
        .filter((file) => file.endsWith(".sql"))
        .sort();

    for (const file of files) {
        const alreadyApplied = await pool.query(
            "SELECT 1 FROM schema_migrations WHERE name = $1",
            [file]
        );

        if (alreadyApplied.rowCount > 0) {
            console.log(`Skipping ${file}`);
            continue;
        }

        const sql = await fs.readFile(path.join(migrationsDirectory, file), "utf8");
        await pool.query(sql);
        await pool.query(
            "INSERT INTO schema_migrations(name) VALUES ($1)",
            [file]
        );
        console.log(`Applied ${file}`);
    }
};

run()
    .then(() => pool.end())
    .catch(async (error) => {
        console.error("Migration failed:", error);
        await pool.end();
        process.exit(1);
    });
