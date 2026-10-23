import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { fileURLToPath } from "url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const syncScript = path.resolve(currentDirectory, "../scripts/synchronizeDesktopOperationalData.js");
const defaultDatabase = "C:\\Users\\Caljkusic1\\Desktop\\Word\\Data\\BenzinskaWorkflow-20260901-recovered.db";

export const startDesktopSyncWorker = () => {
  if (process.env.DB_PROVIDER?.toLowerCase() !== "mysql") return null;
  if (process.env.DESKTOP_SYNC_ENABLED === "false") return null;

  const databasePath = process.env.DESKTOP_SQLITE_PATH || defaultDatabase;
  const intervalMs = Math.max(Number(process.env.DESKTOP_SYNC_INTERVAL_MS) || 60000, 15000);
  let lastSuccessfulModifiedAt = 0;
  let running = false;

  const synchronize = () => {
    if (running || !fs.existsSync(databasePath)) return;
    const modifiedAt = fs.statSync(databasePath).mtimeMs;
    if (modifiedAt <= lastSuccessfulModifiedAt) return;
    running = true;
    execFile(process.execPath, [syncScript, databasePath], {
      cwd: path.resolve(currentDirectory, ".."),
      env: process.env,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    }, (error, stdout, stderr) => {
      running = false;
      if (error) {
        console.error("Desktop/MySQL synchronization failed:", stderr || error.message);
        return;
      }
      lastSuccessfulModifiedAt = modifiedAt;
      console.log("Desktop/MySQL synchronization completed:", stdout.trim());
    });
  };

  const timer = setInterval(synchronize, intervalMs);
  timer.unref();
  setTimeout(synchronize, 3000).unref();
  return timer;
};
