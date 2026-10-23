import Database from "better-sqlite3";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const sourcePath=process.argv[2];
const connectionString=process.env.MYSQL_URI;
if(!sourcePath||!connectionString)throw new Error("Usage: MYSQL_URI=... node scripts/importDesktopUsersToMySql.js <sqlite-path>");
const sqlite=new Database(sourcePath,{readonly:true,fileMustExist:true});
const target=await mysql.createConnection(connectionString);
try{
  const [roles]=await target.query("SELECT id,name FROM roles");
  const roleIds=new Map(roles.map(role=>[role.name,role.id]));
  const users=sqlite.prepare('SELECT * FROM "Login"').all();
  for(const user of users){
    const username=String(user.Username||"").trim();
    if(!username)continue;
    const email=String(user.Email||`${username}@flow.local`).trim().toLowerCase();
    const raw=String(user.Password||"");
    const isPbkdf2=raw.startsWith("PBKDF2$");
    const password=isPbkdf2?raw:await bcrypt.hash(crypto.randomBytes(32).toString("base64url"),12);
    const scheme=isPbkdf2?"pbkdf2-sha256":"bcrypt-reset-required";
    const role=String(user.Role||"").toLowerCase().includes("admin")||user.IsAdmin?"admin":"technician";
    await target.execute(`INSERT INTO users(email,username,password,password_scheme,firstname,lastname,contact,roles_id,status)
      VALUES(?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE username=VALUES(username),password=VALUES(password),password_scheme=VALUES(password_scheme),firstname=VALUES(firstname),lastname=VALUES(lastname),contact=VALUES(contact),roles_id=VALUES(roles_id),status=VALUES(status)`,
      [email,username,password,scheme,user.First_Name||null,user.Last_Name||null,user.Phone||null,roleIds.get(role),Boolean(user.IsActive)&&isPbkdf2]);
  }
  const [result]=await target.query("SELECT COUNT(*) count FROM users");
  console.log(JSON.stringify({users:Number(result[0].count)}));
}finally{sqlite.close();await target.end();}
