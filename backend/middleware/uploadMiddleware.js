import fs from "fs";
import path from "path";
import crypto from "crypto";
import multer from "multer";
import { fileURLToPath } from "url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
export const uploadsRoot = path.resolve(currentDirectory, "../uploads");
fs.mkdirSync(uploadsRoot, { recursive: true });

const allowedMimeTypes = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const storage = multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadsRoot),
    filename: (_req, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();
        callback(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
    },
});

const uploader = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
        if (!allowedMimeTypes.has(file.mimetype)) {
            return callback(new Error("Unsupported file type"));
        }
        callback(null, true);
    },
}).single("file");

export const uploadSingleFile = (req, res, next) => {
    uploader(req, res, (error) => {
        if (!error) return next();
        if (error.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ error: "File is larger than 20 MB" });
        }
        return res.status(400).json({ error: error.message || "File upload failed" });
    });
};

export const removeUploadedFile = async (storageKey) => {
    if (!storageKey) return;
    const resolvedPath = path.resolve(uploadsRoot, storageKey);
    if (!resolvedPath.startsWith(`${uploadsRoot}${path.sep}`)) return;
    await fs.promises.unlink(resolvedPath).catch((error) => {
        if (error.code !== "ENOENT") throw error;
    });
};

export const resolveUploadedFile = (storageKey) => {
    const resolvedPath = path.resolve(uploadsRoot, storageKey);
    if (!resolvedPath.startsWith(`${uploadsRoot}${path.sep}`)) {
        throw new Error("Invalid storage key");
    }
    return resolvedPath;
};
