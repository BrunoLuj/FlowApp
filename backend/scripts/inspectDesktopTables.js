import Database from "better-sqlite3";

const databasePath = process.argv[2];
const tableNames = process.argv.slice(3);
if (!databasePath || tableNames.length === 0) {
  throw new Error("Usage: node scripts/inspectDesktopTables.js <sqlite-path> <table> [...table]");
}

const database = new Database(databasePath, { readonly: true, fileMustExist: true });
try {
  for (const tableName of tableNames) {
    const quoted = `"${tableName.replaceAll('"', '""')}"`;
    const columns = database.prepare(`PRAGMA table_info(${quoted})`).all();
    const foreignKeys = database.prepare(`PRAGMA foreign_key_list(${quoted})`).all();
    const samples = database.prepare(`SELECT * FROM ${quoted} LIMIT 3`).all();
    console.log(JSON.stringify({ tableName, columns, foreignKeys, samples }, null, 2));
  }
} finally {
  database.close();
}
