import { pool } from "../libs/database.js";

export const getTranslations = async (lang) => {
    const result = await pool.query('SELECT key, text FROM translations WHERE language = $1', [lang]);
    return result.rows.reduce((acc, row) => {
        acc[row.key] = row.text;
        return acc;
    }, {});
};
