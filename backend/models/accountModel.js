import { pool } from "../libs/database.js";

export const getAccounts = async () => {
    const result = await pool.query('SELECT * FROM accounts');
    return result.rows;
};


export const getAccountByUserId = async(userId) =>{
    const result = await pool.query({
        text: `SELECT * FROM account WHERE user_id = $1`,
        values: [userId],
    });
    return result.rows;
};

export const accountExists = async(userId, name) =>{
    const result = await pool.query({
        text: `SELECT * FROM account WHERE account_name = $1 AND user_id = $2`,
        values: [name, userId],
    });
    return result.rows[0];
};

export const createAccounts = async(userId, name, accountNumber, amount) =>{
    const result = await pool.query({
        text: `INSERT INTO account(user_id, account_name, account_number, account_balance) VALUES($1, $2, $3, $4) RETURNING * `,
        values: [userId, name, accountNumber, amount],
    });
    return result.rows[0]; 
};  

export const updateUserAccounts = async(userId, accounts) =>{
    const result = await pool.query({
        text: `UPDATE users SET accounts = array_cat(accounts, $1), updatedat = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
        values: [accounts, userId], 
    });
};

export const initialDeposit = async(userId, description, type, status,amount, account_name) =>{
    const result = await pool.query({
        text: `INSERT INTO transaction(user_id, description, type, status, amount, source) VALUES($1, $2, $3, $4, $5, $6) RETURNING *`,
          values: [
            userId,
            description,
            type,
            status,
            amount,
            account_name,
          ],
    });
};

export const addMoneyToAccounts = async (id, newAmount) => {
    const result = await pool.query({
      text: `UPDATE account SET account_balance =(account_balance + $1), updatedat = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      values: [newAmount, id],
    });
    return result.rows[0];
};