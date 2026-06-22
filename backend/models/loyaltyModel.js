import {pool} from "../libs/database.js";

const clientScope=(user,requested)=>user.clientId||requested||null;
export const getOverview=async(user,requestedClientId=null)=>{
    const clientId=clientScope(user,requestedClientId);
    const values=clientId?[clientId]:[];
    const where=clientId?"WHERE lp.client_id=$1":"";
    const [programs,members,transactions,rewards,campaigns,clients,users]=await Promise.all([
        pool.query(`SELECT lp.*,c.company_name,
            COUNT(DISTINCT lm.id)::int member_count,
            COALESCE(SUM(lm.points_balance),0)::numeric points_outstanding
            FROM loyalty_programs lp JOIN clients c ON c.id=lp.client_id
            LEFT JOIN loyalty_members lm ON lm.program_id=lp.id
            ${where} GROUP BY lp.id,c.company_name ORDER BY lp.created_at DESC`,values),
        pool.query(`SELECT lm.*,lp.name program_name FROM loyalty_members lm
            JOIN loyalty_programs lp ON lp.id=lm.program_id
            ${clientId?"WHERE lm.client_id=$1":""}
            ORDER BY lm.joined_at DESC LIMIT 300`,values),
        pool.query(`SELECT lt.*,lm.member_number,lm.full_name FROM loyalty_transactions lt
            JOIN loyalty_members lm ON lm.id=lt.member_id
            ${clientId?"WHERE lm.client_id=$1":""}
            ORDER BY lt.created_at DESC LIMIT 100`,values),
        pool.query(`SELECT lr.* FROM loyalty_rewards lr JOIN loyalty_programs lp ON lp.id=lr.program_id
            ${clientId?"WHERE lp.client_id=$1":""} ORDER BY lr.created_at DESC`,values),
        pool.query(`SELECT lc.* FROM loyalty_campaigns lc
            ${clientId?`WHERE lc.client_id=$1
                AND lc.status IN ('scheduled','active')
                AND (lc.starts_at IS NULL OR lc.starts_at<=NOW())
                AND (lc.ends_at IS NULL OR lc.ends_at>=NOW())`:""}
            ORDER BY lc.created_at DESC`,values),
        pool.query(`SELECT id,company_name FROM clients ${clientId?"WHERE id=$1":""} ORDER BY company_name`,values),
        pool.query(`SELECT id,client_id,email,firstname,lastname FROM users
            WHERE COALESCE(status,TRUE)=TRUE ${clientId?"AND client_id=$1":"AND client_id IS NOT NULL"}
            ORDER BY firstname,lastname`,values),
    ]);
    return {programs:programs.rows,members:members.rows,transactions:transactions.rows,
        rewards:rewards.rows,campaigns:campaigns.rows,clients:clients.rows,users:users.rows};
};
export const saveProgram=async(data,user)=>{
    const clientId=clientScope(user,data.client_id);
    if(!clientId)return null;
    const result=await pool.query(`INSERT INTO loyalty_programs
        (client_id,name,description,points_per_currency,currency_per_point,status,terms,created_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT(client_id) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,
        points_per_currency=EXCLUDED.points_per_currency,currency_per_point=EXCLUDED.currency_per_point,
        status=EXCLUDED.status,terms=EXCLUDED.terms,updated_at=NOW() RETURNING *`,
        [clientId,data.name,data.description||null,data.points_per_currency||1,
            data.currency_per_point||.01,data.status||"active",data.terms||null,user.userId]);
    return result.rows[0];
};
export const createMember=async(data,user)=>{
    const program=(await pool.query(`SELECT * FROM loyalty_programs WHERE id=$1
        ${user.clientId?"AND client_id=$2":""}`,[data.program_id,...(user.clientId?[user.clientId]:[])])).rows[0];
    if(!program)return null;
    const number=data.member_number||`LOY-${program.client_id}-${Date.now().toString().slice(-8)}`;
    const result=await pool.query(`INSERT INTO loyalty_members
        (program_id,client_id,user_id,member_number,full_name,email,phone,tier,marketing_consent,status)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [program.id,program.client_id,data.user_id||null,number,data.full_name,data.email||null,
            data.phone||null,data.tier||"standard",Boolean(data.marketing_consent),data.status||"active"]);
    return result.rows[0];
};
export const addTransaction=async(data,user)=>{
    const connection=await pool.connect();
    try{
        await connection.query("BEGIN");
        const member=(await connection.query(`SELECT * FROM loyalty_members WHERE id=$1
            ${user.clientId?"AND client_id=$2":""} FOR UPDATE`,
            [data.member_id,...(user.clientId?[user.clientId]:[])])).rows[0];
        if(!member){
            await connection.query("ROLLBACK");
            return null;
        }
        const raw=Math.abs(Number(data.points)||0);
        const delta=["redeem","expire"].includes(data.transaction_type)?-raw:Number(data.points);
        if(Number(member.points_balance)+delta<0){
            const error=new Error("Insufficient points");error.code="INSUFFICIENT_POINTS";throw error;
        }
        const transaction=(await connection.query(`INSERT INTO loyalty_transactions
            (member_id,transaction_type,points,amount,reference,description,expires_at,created_by)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
            [member.id,data.transaction_type,delta,data.amount||null,data.reference||null,
                data.description||null,data.expires_at||null,user.userId])).rows[0];
        await connection.query(`UPDATE loyalty_members SET points_balance=points_balance+$1,
            lifetime_points=lifetime_points+CASE WHEN $1>0 THEN $1 ELSE 0 END WHERE id=$2`,[delta,member.id]);
        await connection.query("COMMIT");return transaction;
    }catch(error){await connection.query("ROLLBACK");throw error;}finally{connection.release();}
};
export const createReward=async(data,user)=>{
    const program=(await pool.query(`SELECT id FROM loyalty_programs WHERE id=$1
        ${user.clientId?"AND client_id=$2":""}`,[data.program_id,...(user.clientId?[user.clientId]:[])])).rows[0];
    if(!program)return null;
    return (await pool.query(`INSERT INTO loyalty_rewards
        (program_id,name,description,points_cost,valid_from,valid_until,quantity_limit,status)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [program.id,data.name,data.description||null,data.points_cost,data.valid_from||null,
            data.valid_until||null,data.quantity_limit||null,data.status||"active"])).rows[0];
};
export const createCampaign=async(data,user)=>{
    const program=(await pool.query(`SELECT * FROM loyalty_programs WHERE id=$1
        ${user.clientId?"AND client_id=$2":""}`,[data.program_id,...(user.clientId?[user.clientId]:[])])).rows[0];
    if(!program)return null;
    return (await pool.query(`INSERT INTO loyalty_campaigns
        (program_id,client_id,title,message,channel,audience_tier,bonus_points,starts_at,ends_at,status,created_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [program.id,program.client_id,data.title,data.message,data.channel||"in_app",
            data.audience_tier||null,data.bonus_points||null,data.starts_at||null,
            data.ends_at||null,data.status||"draft",user.userId])).rows[0];
};
