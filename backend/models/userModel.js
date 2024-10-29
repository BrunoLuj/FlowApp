import { pool } from "../libs/database.js";
import { hashPassword} from "../libs/index.js";

export const getAllUsers = async () => {
  const result = await pool.query('SELECT * FROM users');
  return result.rows;
};

export const getUsersRoles = async () => {
  const result = await pool.query('SELECT * FROM roles');
  return result.rows;
};

export const getUserById = async (userId) => {
  const result = await pool.query({
    text: `SELECT * FROM users WHERE id = $1`,
    values: [userId],
  });
  return result.rows[0];
};

export const updateUserById = async (userId, userData) => {
  const { firstname, lastname, country, currency, contact } = userData;
  const result = await pool.query({
    text: `UPDATE users SET firstname = $1, lastname = $2, country = $3, currency = $4, contact = $5, updatedat = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *`,
    values: [firstname, lastname, country, currency, contact, userId],
  });
  return result.rows[0];
};

export const changeUserPassword = async (userId, newPassword) => {
  const hashedPassword = await hashPassword(newPassword);
  await pool.query({
    text: `UPDATE users SET password = $1 WHERE id = $2`,
    values: [hashedPassword, userId],
  });
};