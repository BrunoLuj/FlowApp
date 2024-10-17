import { getMonthName } from "../libs/index.js";
import { getAccountByUserId } from "../models/accountModel.js";
import {
  getTransactionsByUserId,
  getDashboardData,
  getMonthlyTransactionData,
  addTransaction,
  updateAccountBalance,
  transferFunds,
  fromAccountResult,
} from "../models/transactionModel.js";
import { pool } from "../libs/database.js";

export const getTransactions = async (req, res) => {
  try {
    const today = new Date();
    const _sevenDaysAgo = new Date(today);
    _sevenDaysAgo.setDate(today.getDate() - 7);
    const sevenDaysAgo = _sevenDaysAgo.toISOString().split("T")[0];

    const { df, dt, s } = req.query;
    const { userId } = req.body.user;

    const startDate = new Date(df || sevenDaysAgo);
    const endDate = new Date(dt || new Date());

    const transactions = await getTransactionsByUserId(userId, startDate, endDate, s);

    console.log(transactions.rows);
    res.status(200).json({
      status: "success",
      data: transactions.rows,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: "failed", message: error.message });
  }
};

export const getDashboardInformation = async (req, res) => {
  try {
    const { userId } = req.body.user;

    let totalIncome = 0;
    let totalExpense = 0;

    const transactions = await getDashboardData(userId);

    transactions.forEach((transaction) => {
      if (transaction.type === "income") {
        totalIncome += transaction.totalamount;
      } else {
        totalExpense += transaction.totalamount;
      }
    });

    const availableBalance = totalIncome - totalExpense;

    const year = new Date().getFullYear();
    const start_Date = new Date(year, 0, 1);
    const end_Date = new Date(year, 11, 31, 23, 59, 59);

    const monthlyData = await getMonthlyTransactionData(userId, start_Date, end_Date);

    const data = new Array(12).fill().map((_, index) => {
      const monthData = monthlyData.filter(
        (item) => parseInt(item.month) === index + 1
      );

      const income = monthData.find((item) => item.type === "income")?.totalamount || 0;
      const expense = monthData.find((item) => item.type === "expense")?.totalamount || 0;

      return {
        label: getMonthName(index),
        income,
        expense,
      };
    });

    res.status(200).json({
      status: "success",
      availableBalance,
      totalIncome,
      totalExpense,
      chartData: data,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: "failed", message: error.message });
  }
};

export const addTransactions = async (req, res) => {
  try {
    const { userId } = req.body.user;
    const { account_id } = req.params;
    const { description, source, amount } = req.body;

    if (!(description || source || amount)) {
      return res
        .status(403)
        .json({ status: "failed", message: "Provide Required Fields!" });
    }

    if (Number(amount) <= 0) {
      return res
        .status(403)
        .json({ status: "failed", message: "Amount should be greater than 0." });
    }

    const accountInfo = await getAccountByUserId(userId);

    if (!accountInfo) {
      return res.status(404).json({ status: "failed", message: "Invalid account information." });
    }

    if (accountInfo.account_balance <= 0 || accountInfo.account_balance < Number(amount)) {
      return res.status(403).json({
        status: "failed",
        message: "Transaction failed. Insufficient account balance.",
      });
    }

    await pool.query("BEGIN");

    await updateAccountBalance(account_id, amount);
    await addTransaction(userId, account_id, description, source, amount);

    await pool.query("COMMIT");

    res.status(200).json({
      status: "success",
      message: "Transaction completed successfully.",
    });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.log(error);
    res.status(500).json({ status: "failed", message: error.message });
  }
};

export const transferMoneyToAccount = async (req, res) => {
  try {
    const { userId } = req.body.user;
    const { from_account, to_account, amount } = req.body;

    console.log(req.body);
    console.log(from_account);

    if (!(from_account || to_account || amount)) {
      return res.status(403).json({
        status: "failed",
        message: "Provide Required Fields!",
      });
    }

    const newAmount = Number(amount);

    if (newAmount <= 0) {
      return res.status(403).json({
        status: "failed",
        message: "Amount should be greater than 0.",
      });
    }

    const fromAccount = await fromAccountResult(from_account);

    if (!fromAccount) {
      return res.status(404).json({
        status: "failed",
        message: "Account information not found.",
      });
    }

    if (newAmount > fromAccount.account_balance) {
      return res.status(403).json({
        status: "failed",
        message: "Transfer failed. Insufficient account balance.",
      });
    }

    await pool.query("BEGIN");

    await transferFunds(from_account, to_account, newAmount);

    const description = `Transfer (${fromAccount.account_name} - ${toAccount.rows[0].account_name})`;
    await addTransaction(userId, from_account, description, fromAccount.account_name, newAmount);

    const description1 = `Received (${fromAccount.account_name} - ${toAccount.rows[0].account_name})`;
    await addTransaction(userId, to_account, description1, toAccount.rows[0].account_name, newAmount);

    await pool.query("COMMIT");

    res.status(201).json({
      status: "success",
      message: "Transfer completed successfully",
    });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.log(error);
    res.status(500).json({ status: "failed", message: error.message });
  }
};
