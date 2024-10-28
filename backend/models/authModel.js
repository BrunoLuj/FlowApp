import { pool } from "../libs/database.js";
import { hashPassword } from "../libs/index.js";

export const userExist = async(email) =>{
    const result = await pool.query({
        text: `SELECT EXISTS (SELECT * FROM users WHERE email = $1) AS userExist`,
        values: [email],
    });
    return result.rows[0];
};

export const createUser = async (firstName, email, password) => {
    const hashedPassword = await hashPassword(password);
    const result = await pool.query({
      text: `INSERT INTO users(firstname, email, password) VALUES ($1, $2, $3) RETURNING *`,
      values: [firstName, email, hashedPassword],
    });
    return result.rows[0];
};

export const findUserByEmail = async (email) => {
  // Prvo dobij korisnika
  const userResult = await pool.query({
      text: `SELECT * FROM users WHERE email = $1`,
      values: [email],
  });

  const user = userResult.rows[0];

  if (!user) {
      return null; // korisnik nije pronađen
  }

  // Sada, na osnovu roles_id, dobij permisije
  const permissionsResult = await pool.query({
      text: `
          SELECT p.name AS permission_name
          FROM roles r
          JOIN role_permissions rp ON r.id = rp.role_id
          JOIN permissions p ON rp.permission_id = p.id
          WHERE r.id = $1
      `,
      values: [user.roles_id],
  });

  user.permissions = permissionsResult.rows.map(row => row.permission_name);
  return user; // vraća korisnika sa njegovim dozvolama
};