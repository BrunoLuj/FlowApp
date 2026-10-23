import mysql from "mysql2/promise";

export const createMySqlPool = (connectionString) => mysql.createPool({
    uri: connectionString,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
    queueLimit: 0,
    charset: "utf8mb4",
    timezone: "Z",
    decimalNumbers: true,
});

export const isMySqlProvider = () =>
    (process.env.DB_PROVIDER || "postgres").trim().toLowerCase() === "mysql";
