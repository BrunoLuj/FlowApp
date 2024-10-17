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
    const result = await pool.query({
      text: `SELECT * FROM users WHERE email = $1`,
      values: [email],
    });
    return result.rows[0];
};