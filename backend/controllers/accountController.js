import { accountExists, addMoneyToAccounts, createAccounts, getAccountByUserId, initialDeposit, updateUserAccounts } from "../models/accountModel.js";

export const getAccounts = async (req, res) => {
  try {
    const { userId } = req.body.user;

    const accounts = await getAccountByUserId(userId);
    res.status(200).json({ status: "Success", data: accounts });

  } catch (error) {
    console.log(error);
    res.status(500).json({ status: "Failed", message: error.message });
  }
};

export const createAccount = async (req, res) => {
  try {
    const { userId } = req.body.user;

    const { name, amount, account_number } = req.body;

    const accountExist = await accountExists(userId, name);

    if (accountExist) {
      return res
        .status(409)
        .json({ status: "Failed", message: "Account already created." });
    }

    const account = await createAccounts(userId, name, account_number, amount);

    const userAccounts = Array.isArray(name) ? name : [name];

    await updateUserAccounts(userId, userAccounts);

    // Add initial deposit transaction
    const description = account.account_name + " (Initial Deposit)";

    await initialDeposit(userId, description, "income", "Completed", amount, account.account_name);

    res.status(201).json({
      status: "Success",
      message: account.account_name + " Account created successfully",
      data: account,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: "Failed", message: error.message });
  }
};

export const updateAccount = async (id, name, project_type, status, end_date ) => {
  try {
      const result = await pool.query('UPDATE projects SET name = $1, project_type = $2, status = $3, end_date = $4 WHERE id = $5 RETURNING *', [name, project_type, status, end_date , id]);
      return result.rows[0];
  } catch (error) {
      console.error('Error updating project:', error); // Prikaz greške
      throw error;
  }
};

export const deleteAccount = async (id) => {
  const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING *', [id]);
  return result.rows[0];
};

// export const addMoneyToAccount = async (req, res) => {
//   try {
//     const { userId } = req.body.user;
//     const { id } = req.params;
//     const { amount } = req.body;

//     const newAmount = Number(amount);
//     const accountInformation = await addMoneyToAccounts(id, newAmount);

//     const description = accountInformation.account_name + " (Deposit)";
//     await initialDeposit(userId, description, "income", "Completed", amount, accountInformation.account_name);

//     res.status(200).json({
//       status: "Success",
//       message: "Operation completed successfully",
//       data: accountInformation,
//     });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ status: "Failed", message: error.message });
//   }
// };