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

export const getLocalPortalData=async(identity)=>{
    const memberResult=await pool.query(
        `SELECT lm.*,lp.name program_name,lp.description program_description,lp.terms
         FROM loyalty_members lm
         JOIN loyalty_programs lp ON lp.id=lm.program_id
         WHERE lm.client_id=$1
           AND lm.status='active'
           AND lp.status='active'
           AND (
                lm.user_id=$2
                OR ($3::varchar IS NOT NULL AND lm.member_number=$3)
                OR (lm.email IS NOT NULL AND LOWER(lm.email)=LOWER($4))
           )
         ORDER BY
           CASE WHEN lm.user_id=$2 THEN 0
                WHEN $3::varchar IS NOT NULL AND lm.member_number=$3 THEN 1
                ELSE 2 END,
           lm.joined_at DESC
         LIMIT 1`,
        [identity.client_id,identity.id,identity.loyalty_external_id||null,identity.email]
    );
    const member=memberResult.rows[0];
    if(!member)return null;

    const [transactions,rewards,promotions]=await Promise.all([
        pool.query(
            `SELECT id,transaction_type,points,amount,reference,description,expires_at,created_at
             FROM loyalty_transactions
             WHERE member_id=$1
             ORDER BY created_at DESC
             LIMIT 50`,
            [member.id]
        ),
        pool.query(
            `SELECT id,name,description,points_cost,valid_from,valid_until,quantity_limit
             FROM loyalty_rewards
             WHERE program_id=$1
               AND status='active'
               AND (valid_from IS NULL OR valid_from<=CURRENT_DATE)
               AND (valid_until IS NULL OR valid_until>=CURRENT_DATE)
             ORDER BY points_cost,name`,
            [member.program_id]
        ),
        pool.query(
            `SELECT id,title,message,channel,audience_tier,bonus_points,starts_at,ends_at
             FROM loyalty_campaigns
             WHERE program_id=$1
               AND status IN ('scheduled','active')
               AND (starts_at IS NULL OR starts_at<=NOW())
               AND (ends_at IS NULL OR ends_at>=NOW())
               AND (audience_tier IS NULL OR LOWER(audience_tier)=LOWER($2))
             ORDER BY created_at DESC`,
            [member.program_id,member.tier]
        ),
    ]);

    return {
        member,
        transactions:transactions.rows,
        rewards:rewards.rows,
        promotions:promotions.rows,
    };
};
