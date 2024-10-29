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

export const createUser = async (email, firstname, lastname, address, country, currency, contact, roles_id, status, password ) => {
  const result = await pool.query(
      'INSERT INTO users (email, firstname, lastname, address, country, currency, contact, roles_id, status, password) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [email, firstname, lastname, address, country, currency, contact, roles_id, status, password ]
  );
  return result.rows[0];
};

// export const updateUserById = async (userId, userData) => {
//   console.log(userId);
//   const { firstname, lastname, address, country, currency, contact, roles_id, status } = userData;
//   const result = await pool.query({
//     text: `UPDATE users SET firstname = $1, lastname = $2, address = $3, country = $4, currency = $5, contact = $6, roles_id = $7, status = $8, updatedat = CURRENT_TIMESTAMP WHERE id = $9 RETURNING *`,
//     values: [firstname, lastname, address, country, currency, contact, roles_id, status, userId],
//   });
//   return result.rows[0];
// };

export const updateUserById = async (id, firstname, lastname, address, country, currency, contact, roles_id, status ) => {
  try {
    const result = await pool.query({
          text: `UPDATE users SET firstname = $1, lastname = $2, address = $3, country = $4, currency = $5, contact = $6, roles_id = $7, status = $8, updatedat = CURRENT_TIMESTAMP WHERE id = $9 RETURNING *`,
          values: [firstname, lastname, address, country, currency, contact, roles_id, status, id],
        });
      return result.rows[0];
  } catch (error) {
      console.error('Error updating project:', error);
      throw error;
  }
};

export const updateUserProfileById = async (id, firstname, lastname, address, country, currency, contact ) => {
  try {
    const result = await pool.query({
          text: `UPDATE users SET firstname = $1, lastname = $2, address = $3, country = $4, currency = $5, contact = $6, updatedat = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *`,
          values: [firstname, lastname, address, country, currency, contact, id],
        });
      return result.rows[0];
  } catch (error) {
      console.error('Error updating project:', error);
      throw error;
  }
};

export const changeUserPassword = async (userId, newPassword) => {
  const hashedPassword = await hashPassword(newPassword);
  await pool.query({
    text: `UPDATE users SET password = $1 WHERE id = $2`,
    values: [hashedPassword, userId],
  });
};

export const deleteUser = async (id) => {
  const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
  return result.rows[0];
};