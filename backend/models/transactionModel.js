import { pool } from "../libs/database.js";

export const getTransactionsByUserId = async (userId, startDate, endDate, status) => {
    const result = await pool.query({
    text: `SELECT * FROM transaction WHERE user_id = $1 AND createdat BETWEEN $2 AND $3 AND (description ILIKE '%' || $4 || '%' OR status ILIKE '%' || $4 || '%' OR source ILIKE '%' || $4 || '%') ORDER BY id DESC`,
    values: [userId, startDate, endDate, status],
  });
  return result;
};

export const getDashboardData = async (userId) => {
  const transactionsResult = await pool.query({
    text: `SELECT type, SUM(amount) AS totalAmount FROM transaction WHERE user_id = $1 GROUP BY type`,
    values: [userId],
  });
  return transactionsResult.rows;
};

export const getMonthlyTransactionData = async (userId, start_Date, end_Date) => {
  const result = await pool.query({
    text: `
      SELECT 
        EXTRACT(MONTH FROM createdat) AS month,
        type,
        SUM(amount) AS totalAmount 
      FROM 
        transaction 
      WHERE 
        user_id = $1 
        AND createdat BETWEEN $2 AND $3 
      GROUP BY 
        EXTRACT(MONTH FROM createdat), type`,
    values: [userId, start_Date, end_Date],
  });
  return result.rows;
};

export const addTransaction = async (userId, description, source, amount) => {
  await pool.query({
    text: `INSERT INTO transaction(user_id, description, type, status, amount, source) VALUES($1, $2, $3, $4, $5, $6)`,
    values: [userId, description, "expense", "Completed", amount, source],
  });
};

export const updateAccountBalance = async (accountId, amount) => {
  await pool.query({
    text: `UPDATE account SET account_balance = account_balance - $1, updatedat = CURRENT_TIMESTAMP WHERE id = $2`,
    values: [amount, accountId],
  });
};

export const transferFunds = async (fromAccountId, toAccountId, amount) => {
  await pool.query({
    text: `UPDATE account SET account_balance = account_balance - $1 WHERE id = $2`,
    values: [amount, fromAccountId],
  });

  await pool.query({
    text: `UPDATE account SET account_balance = account_balance + $1 WHERE id = $2`,
    values: [amount, toAccountId],
  });
};

export const fromAccountResult = async (fromAccountId) => {
    const result = await pool.query({
        text: `SELECT * FROM account WHERE user_id = $1`,
        values: [fromAccountId],
    });

    return result.rows[0];
};


