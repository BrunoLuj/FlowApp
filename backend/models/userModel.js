import { pool } from "../libs/database.js";
import { hashPassword} from "../libs/index.js";

export const getAllUsers = async () => {
  const result = await pool.query(`
    SELECT u.id, u.email, u.firstname, u.lastname, u.address, u.country, u.currency,
           u.contact, u.roles_id, u.status, u.client_id,u.loyalty_external_id,u.createdat,u.updatedat,
           c.company_name AS client_name
    FROM users u
    LEFT JOIN clients c ON c.id = u.client_id
    ORDER BY u.firstname, u.lastname
  `);
  return result.rows;
};

export const getUsersRoles = async () => {
  const result = await pool.query('SELECT * FROM roles WHERE active = TRUE ORDER BY name');
  return result.rows;
};

export const getRoleById = async (id) => {
  const result = await pool.query("SELECT id, name FROM roles WHERE id = $1 AND active = TRUE", [id]);
  return result.rows[0];
};

export const getUserById = async (userId) => {
  const result = await pool.query({
    text: `SELECT id, email, firstname, lastname, address, country, currency,
                  contact, roles_id, status, client_id,loyalty_external_id,createdat, updatedat
           FROM users WHERE id = $1`,
    values: [userId],
  });
  return result.rows[0];
};

export const getUserCredentialsById = async (userId) => {
  const result = await pool.query(
    `SELECT id, password, status FROM users WHERE id = $1`,
    [userId]
  );
  return result.rows[0];
};

export const createUser = async (email, firstname, lastname, address, country, currency, contact, roles_id, status, password, client_id, loyalty_external_id ) => {
  const result = await pool.query(
      'INSERT INTO users (email, firstname, lastname, address, country, currency, contact, roles_id, status, password, client_id,loyalty_external_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *',
      [email, firstname, lastname, address, country, currency, contact, roles_id, status, password, client_id || null,loyalty_external_id||null]
  );
  const user = result.rows[0];
  delete user.password;
  return user;
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

export const updateUserById = async (id, firstname, lastname, address, country, currency, contact, roles_id, status, client_id,loyalty_external_id ) => {
  try {
    const result = await pool.query({
          text: `UPDATE users SET firstname=$1,lastname=$2,address=$3,country=$4,currency=$5,contact=$6,roles_id=$7,status=$8,client_id=$9,loyalty_external_id=$10,updatedat=CURRENT_TIMESTAMP WHERE id=$11 RETURNING *`,
          values: [firstname, lastname, address, country, currency, contact, roles_id, status, client_id || null,loyalty_external_id||null,id],
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
    text: `UPDATE users SET password = $1, updatedat = CURRENT_TIMESTAMP WHERE id = $2`,
    values: [hashedPassword, userId],
  });
};

export const deleteUser = async (id) => {
  const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
  return result.rows[0];
};
