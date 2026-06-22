import { pool } from "../libs/database.js";

export const findUserByEmail = async (email) => {
  // Prvo dobij korisnika
  const userResult = await pool.query({
      text: `SELECT u.*,r.name AS role_name,
                    COALESCE(c.loyalty_portal_only,FALSE) AS loyalty_portal_only
             FROM users u
             JOIN roles r ON r.id=u.roles_id
             LEFT JOIN clients c ON c.id=u.client_id
             WHERE LOWER(u.email) = LOWER($1)`,
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
    `SELECT u.id,u.email,u.firstname,u.lastname,u.contact,u.address,u.country,u.currency,
            u.roles_id,u.status,u.client_id,u.loyalty_external_id,r.name role_name,
            COALESCE(c.loyalty_portal_only,FALSE) loyalty_portal_only
     FROM users u JOIN roles r ON r.id=u.roles_id
     LEFT JOIN clients c ON c.id=u.client_id WHERE u.id = $1`,
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
