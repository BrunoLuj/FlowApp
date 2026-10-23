import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URI, ssl: { rejectUnauthorized: false } });
try {
  const tables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  for (const { tablename } of tables.rows) {
    const quoted = `"${tablename.replaceAll('"', '""')}"`;
    const result = await pool.query(`SELECT COUNT(*)::int count FROM ${quoted}`);
    console.log(`${tablename}\t${result.rows[0].count}`);
  }
} finally {
  await pool.end();
}
