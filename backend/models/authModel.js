import { pool } from "../libs/database.js";

export const findUserByEmail = async (email) => {
  // Prvo dobij korisnika
  const userResult = await pool.query({
      text: `SELECT * FROM users WHERE LOWER(email) = LOWER($1)`,
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

export const findUserById = async (id) => {
  const userResult = await pool.query(
    `SELECT id, email, firstname, lastname, contact, address, country, currency,
            roles_id, status, client_id
     FROM users WHERE id = $1`,
    [id]
  );
  const user = userResult.rows[0];
  if (!user) return null;
  const permissionsResult = await pool.query(
    `SELECT p.name
     FROM role_permissions rp
     JOIN permissions p ON p.id = rp.permission_id
     WHERE rp.role_id = $1
     ORDER BY p.name`,
    [user.roles_id]
  );
  user.permissions = permissionsResult.rows.map((row) => row.name);
  return user;
};
