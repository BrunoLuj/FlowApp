import {pool} from "../libs/database.js";

export const getPortalIdentity=async(userId)=>{
    const result=await pool.query(
        `SELECT u.id,u.email,u.firstname,u.lastname,u.loyalty_external_id,
                c.id client_id,c.company_name,c.loyalty_portal_only
         FROM users u JOIN clients c ON c.id=u.client_id
         WHERE u.id=$1 AND COALESCE(u.status,TRUE)=TRUE`,
        [userId]
    );
    return result.rows[0];
};
