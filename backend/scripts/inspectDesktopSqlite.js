import Database from "better-sqlite3";

const databasePath = process.argv[2];
if (!databasePath) throw new Error("SQLite database path is required");
const database = new Database(databasePath, { readonly: true, fileMustExist: true });
for (const { name } of database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all()) {
    const quoted = `"${name.replaceAll('"', '""')}"`;
    const count = database.prepare(`SELECT COUNT(*) AS count FROM ${quoted}`).get().count;
    const columns = database.prepare(`PRAGMA table_info(${quoted})`).all().map((column) => column.name).join(",");
    console.log(`${name}\t${count}\t${columns}`);
}
database.close();
