import JWT from "jsonwebtoken";
import bcrypt from "bcrypt";

export const hashPassword = async (userValue) =>{
    const salt = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(userValue, salt);

    return hashedPassword;
};

export const comparePassword = async(userPassword, password) =>{
    try {
        const isMatch = await bcrypt.compare(userPassword, password);

        return isMatch;
    } catch (error) {
        console.log(error);
    }
};

export const createJWT = (user_id, roles_id) =>{

    return JWT.sign(
        {
            userId: user_id,
            roles_id: roles_id
        },
        
        process.env.JWT_SECRET,
        {
            expiresIn: "1h",
        }
    )
};

export function getMonthName(index) {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[index];
}