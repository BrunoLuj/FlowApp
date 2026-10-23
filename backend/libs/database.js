import pg from "pg";
import dotenv from "dotenv";
import { createMySqlPool, isMySqlProvider } from "./mysqlDatabase.js";

dotenv.config();

export const mysqlMode = isMySqlProvider();
const mysqlPool = mysqlMode ? createMySqlPool(process.env.MYSQL_URI) : null;
const postgresPool = mysqlMode ? null : new pg.Pool({
    connectionString: process.env.DATABASE_URI,
    ssl: process.env.PG_SSL === "false" ? false : { rejectUnauthorized: false },
});

const mysqlQuery = async (query, suppliedValues = [], executor = mysqlPool) => {
    const original = typeof query === "string" ? query : query.text;
    const sourceValues = typeof query === "string" ? suppliedValues : (query.values ?? []);
    const orderedValues = [];
    let sql = original.replace(/\$(\d+)/g, (_match, number) => {
        orderedValues.push(sourceValues[Number(number) - 1]);
        return "?";
    });
    sql = sql.replace(/::(?:timestamptz|timestamp|bigint|integer|numeric|boolean|date|text|int)(?:\[\])?/gi, "");
    sql = sql.replace(/\s+NULLS\s+(?:FIRST|LAST)/gi, "");
    sql = sql.replace(/INTERVAL\s+'(\d+)\s+(day|days|hour|hours|month|months|year|years)'/gi, (_m,n,u) => `INTERVAL ${n} ${u.replace(/s$/i, "").toUpperCase()}`);
    const returning = /\s+RETURNING\s+\*\s*;?$/i.test(sql);
    sql = sql.replace(/\s+RETURNING\s+\*\s*;?$/i, "");

    if (returning && /^\s*DELETE\s+/i.test(sql)) {
        const table = sql.match(/^\s*DELETE\s+FROM\s+[`"]?([a-zA-Z0-9_]+)/i)?.[1];
        const id = orderedValues.at(-1);
        const [before] = table ? await executor.query(`SELECT * FROM \`${table}\` WHERE id=?`, [id]) : [[]];
        const [result] = await executor.query(sql, orderedValues);
        return { rows: before, rowCount: result.affectedRows ?? 0 };
    }

    if (/^\s*BEGIN\s*$/i.test(sql)) { await executor.beginTransaction(); return { rows: [], rowCount: 0 }; }
    if (/^\s*COMMIT\s*$/i.test(sql)) { await executor.commit(); return { rows: [], rowCount: 0 }; }
    if (/^\s*ROLLBACK\s*$/i.test(sql)) { await executor.rollback(); return { rows: [], rowCount: 0 }; }
    const [result] = await executor.query(sql, orderedValues);
    if (Array.isArray(result)) return { rows: result, rowCount: result.length };
    if (!returning) return { rows: [], rowCount: result.affectedRows ?? 0, insertId: result.insertId };

    const table = sql.match(/^\s*(?:INSERT\s+INTO|UPDATE)\s+[`"]?([a-zA-Z0-9_]+)/i)?.[1];
    const id = /^\s*INSERT/i.test(sql) ? result.insertId : orderedValues.at(-1);
    const [rows] = table && id != null ? await executor.query(`SELECT * FROM \`${table}\` WHERE id=?`, [id]) : [[]];
    return { rows, rowCount: result.affectedRows ?? rows.length };
};

export const pool = mysqlMode ? {
    query: mysqlQuery,
    end: () => mysqlPool.end(),
    connect: async () => {
        const connection = await mysqlPool.getConnection();
        return {
            query: (query, values = []) => mysqlQuery(query, values, connection),
            release: () => connection.release(),
        };
    },
    getConnection: () => mysqlPool.getConnection(),
} : postgresPool;

