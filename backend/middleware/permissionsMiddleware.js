import JWT from "jsonwebtoken";
import { pool } from "../libs/database.js";

const checkPermission = (permission) => {
    return async (req, res, next) => {
        const authHeader = req?.headers?.authorization;

        console.log(authHeader);
    
        if(!authHeader || !authHeader?.startsWith("Bearer")){
            return res.status(401).json({
                status: "auth_failed",
                message: "Authentication failed",
            });
        }
    
        const token = authHeader?.split(" ")[1];
    
        console.log(token);
    
        try {
            const userToken = JWT.verify(token, process.env.JWT_SECRET);

            console.log(userToken.roles_id);
            console.log(permission);
    
            const result = await pool.query(`
                SELECT p.name 
                FROM role_permissions rp
                JOIN permissions p ON rp.permission_id = p.id
                WHERE rp.role_id = $1 AND p.name = $2`, 
                [userToken.roles_id, permission]);

                console.log(result);
            
            if (result.rows.length === 0) {
                return res.status(403).send('Forbidden');
            }
    
            next();
    
            // req.body.user = {
            //     userId: userToken.userId,
            // };
    
            // next();
            
        } catch (error) {
            console.log(error);
            return res.status(401).json({
                status: "auth_failed",
                message: "Authentication failed",
            });    
        }
    };
};

export default checkPermission;


// Primjer koristenja
// app.post('/projects', checkPermission('create_project'), (req, res) => {
//     // Logika za kreiranje projekta
//     res.send('Project created');
// });