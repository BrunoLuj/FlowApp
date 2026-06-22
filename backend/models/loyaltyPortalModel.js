import {pool} from "../libs/database.js";

export const getPortalIdentity=async(userId)=>{
    const result=await pool.query(
        `SELECT u.id,u.email,u.firstname,u.lastname,u.loyalty_external_id,
                c.id client_id,c.company_name,
                (r.name='client_user' OR c.loyalty_portal_only) loyalty_portal_only
         FROM users u JOIN clients c ON c.id=u.client_id
         JOIN roles r ON r.id=u.roles_id
         WHERE u.id=$1 AND COALESCE(u.status,TRUE)=TRUE`,
        [userId]
    );
    return result.rows[0];
};

export const getLocalPortalData=async(identity)=>{
    const memberResult=await pool.query(
        `SELECT lm.*,lp.name program_name,lp.description program_description,lp.terms,
                current_tier.name calculated_tier,current_tier.color tier_color,
                current_tier.benefits tier_benefits,
                next_tier.name next_tier,next_tier.min_lifetime_points next_tier_points
         FROM loyalty_members lm
         JOIN loyalty_programs lp ON lp.id=lm.program_id
         LEFT JOIN LATERAL (
             SELECT lt.* FROM loyalty_tiers lt
             WHERE lt.program_id=lm.program_id
               AND lt.min_lifetime_points<=lm.lifetime_points
             ORDER BY lt.min_lifetime_points DESC LIMIT 1
         ) current_tier ON TRUE
         LEFT JOIN LATERAL (
             SELECT lt.* FROM loyalty_tiers lt
             WHERE lt.program_id=lm.program_id
               AND lt.min_lifetime_points>lm.lifetime_points
             ORDER BY lt.min_lifetime_points ASC LIMIT 1
         ) next_tier ON TRUE
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

    const [transactions,rewards,promotions,coupons,receipts]=await Promise.all([
        pool.query(
            `SELECT id,transaction_type,points,amount,reference,description,expires_at,created_at
             FROM loyalty_transactions
             WHERE member_id=$1
             ORDER BY created_at DESC
             LIMIT 50`,
            [member.id]
        ),
        pool.query(
            `SELECT lr.id,lr.name,lr.description,lr.points_cost,lr.valid_from,lr.valid_until,
                    lr.quantity_limit,
                    COUNT(red.id)::int redeemed_count
             FROM loyalty_rewards lr
             LEFT JOIN loyalty_redemptions red ON red.reward_id=lr.id
                AND red.status IN ('active','used')
             WHERE lr.program_id=$1
               AND lr.status='active'
               AND (lr.valid_from IS NULL OR lr.valid_from<=CURRENT_DATE)
               AND (lr.valid_until IS NULL OR lr.valid_until>=CURRENT_DATE)
             GROUP BY lr.id
             HAVING lr.quantity_limit IS NULL OR COUNT(red.id)<lr.quantity_limit
             ORDER BY lr.points_cost,lr.name`,
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
            [member.program_id,member.calculated_tier||member.tier]
        ),
        pool.query(
            `SELECT red.id,red.coupon_code,red.points_spent,red.status,red.redeemed_at,
                    red.used_at,red.expires_at,lr.name reward_name,lr.description
             FROM loyalty_redemptions red
             JOIN loyalty_rewards lr ON lr.id=red.reward_id
             WHERE red.member_id=$1
             ORDER BY red.redeemed_at DESC`,
            [member.id]
        ),
        pool.query(
            `SELECT id,receipt_number,merchant_name,purchased_at,total_amount,currency,
                    items,document_url
             FROM loyalty_receipts
             WHERE member_id=$1
             ORDER BY purchased_at DESC LIMIT 30`,
            [member.id]
        ),
    ]);

    member.tier=member.calculated_tier||member.tier;
    const currentFloor=Number((await pool.query(
        `SELECT COALESCE(MAX(min_lifetime_points),0) floor
         FROM loyalty_tiers WHERE program_id=$1 AND min_lifetime_points<=$2`,
        [member.program_id,member.lifetime_points]
    )).rows[0].floor);
    const nextTarget=member.next_tier_points==null?null:Number(member.next_tier_points);
    member.tier_progress=nextTarget===null?100:Math.max(0,Math.min(100,
        ((Number(member.lifetime_points)-currentFloor)/(nextTarget-currentFloor))*100));
    member.points_to_next_tier=nextTarget===null?0:Math.max(0,nextTarget-Number(member.lifetime_points));
    member.qr_value=`FLOWAPP-LOYALTY:${member.card_token}`;

    return {
        member,
        transactions:transactions.rows,
        rewards:rewards.rows,
        promotions:promotions.rows,
        coupons:coupons.rows,
        receipts:receipts.rows,
    };
};

export const redeemLocalReward=async(identity,rewardId)=>{
    const connection=await pool.connect();
    try{
        await connection.query("BEGIN");
        const member=(await connection.query(
            `SELECT lm.* FROM loyalty_members lm
             WHERE lm.client_id=$1 AND lm.status='active'
               AND (lm.user_id=$2 OR ($3::varchar IS NOT NULL AND lm.member_number=$3)
                    OR LOWER(lm.email)=LOWER($4))
             ORDER BY CASE WHEN lm.user_id=$2 THEN 0 ELSE 1 END
             LIMIT 1 FOR UPDATE`,
            [identity.client_id,identity.id,identity.loyalty_external_id||null,identity.email]
        )).rows[0];
        if(!member){const e=new Error("Member not found");e.code="MEMBER_NOT_FOUND";throw e;}
        const reward=(await connection.query(
            `SELECT lr.* FROM loyalty_rewards lr
             WHERE lr.id=$1 AND lr.program_id=$2 AND lr.status='active'
               AND (lr.valid_from IS NULL OR lr.valid_from<=CURRENT_DATE)
               AND (lr.valid_until IS NULL OR lr.valid_until>=CURRENT_DATE)
             FOR UPDATE`,
            [rewardId,member.program_id]
        )).rows[0];
        if(!reward){const e=new Error("Reward not found");e.code="REWARD_NOT_FOUND";throw e;}
        if(Number(member.points_balance)<Number(reward.points_cost)){
            const e=new Error("Insufficient points");e.code="INSUFFICIENT_POINTS";throw e;
        }
        if(reward.quantity_limit){
            const used=Number((await connection.query(
                `SELECT COUNT(*) count FROM loyalty_redemptions
                 WHERE reward_id=$1 AND status IN ('active','used')`,
                [reward.id]
            )).rows[0].count);
            if(used>=Number(reward.quantity_limit)){
                const e=new Error("Reward unavailable");e.code="REWARD_UNAVAILABLE";throw e;
            }
        }
        const delta=-Number(reward.points_cost);
        const before=Number(member.points_balance);
        const after=before+delta;
        const transaction=(await connection.query(
            `INSERT INTO loyalty_transactions
                (member_id,transaction_type,points,reference,description,created_by)
             VALUES($1,'redeem',$2,$3,$4,$5) RETURNING *`,
            [member.id,delta,`REWARD-${reward.id}`,`Aktivirana nagrada: ${reward.name}`,identity.id]
        )).rows[0];
        await connection.query(
            "UPDATE loyalty_members SET points_balance=$1 WHERE id=$2",
            [after,member.id]
        );
        const couponCode=`FL-${Date.now().toString(36).toUpperCase()}-${member.id}`;
        const redemption=(await connection.query(
            `INSERT INTO loyalty_redemptions
                (member_id,reward_id,transaction_id,coupon_code,points_spent,expires_at)
             VALUES($1,$2,$3,$4,$5,COALESCE($6::date,CURRENT_DATE+30)) RETURNING *`,
            [member.id,reward.id,transaction.id,couponCode,reward.points_cost,reward.valid_until||null]
        )).rows[0];
        await connection.query(
            `INSERT INTO loyalty_points_audit
                (member_id,transaction_id,action,points_delta,balance_before,balance_after,
                 reason,actor_user_id,metadata)
             VALUES($1,$2,'reward_redemption',$3,$4,$5,$6,$7,$8::jsonb)`,
            [member.id,transaction.id,delta,before,after,reward.name,identity.id,
                JSON.stringify({reward_id:reward.id,coupon_code:couponCode})]
        );
        await connection.query("COMMIT");
        return {...redemption,reward_name:reward.name,balance_after:after};
    }catch(error){
        await connection.query("ROLLBACK");
        throw error;
    }finally{connection.release();}
};
