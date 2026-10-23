import { pool, mysqlMode } from "../libs/database.js";

const moduleCode=name=>name==="Automatska mjerila"?"AMN":name;
export const saveWorkflow=async(data,user)=>{
  if(!mysqlMode)throw Object.assign(new Error("Desktop workflow requires MySQL"),{code:"MYSQL_REQUIRED"});
  const db=await pool.connect();let lockHeld=false;
  try{
    await db.query("BEGIN");
    const stationValues=[Number(data.station_id)];let clientScope="";
    if(user.clientId){stationValues.push(Number(user.clientId));clientScope=` AND client_id=$${stationValues.length}`;}
    const station=(await db.query(`SELECT id,client_id FROM projects WHERE id=$1${clientScope} AND COALESCE(active,TRUE)=TRUE FOR UPDATE`,stationValues)).rows[0];
    if(!station)throw Object.assign(new Error("Aktivna benzinska stanica nije pronađena ili korisnik nema pristup."),{code:"STATION_NOT_FOUND"});
    const acquired=(await db.query("SELECT GET_LOCK('desktop-inspection-project-id',10) acquired")).rows[0]?.acquired;
    if(Number(acquired)!==1)throw new Error("Centralna baza je zauzeta. Pokušajte ponovno.");
    lockHeld=true;
    let project=(await db.query(`SELECT * FROM inspection_projects WHERE project_number=$1 OR folder_name=$2 ORDER BY project_number=$1 DESC,id LIMIT 1 FOR UPDATE`,[data.certificate,data.folder])).rows[0];
    if(project&&Number(project.station_id)!==Number(station.id))throw Object.assign(new Error(`Broj ${data.certificate} već pripada drugoj benzinskoj stanici.`),{code:"PROJECT_CONFLICT"});
    if(!project){
      const next=(await db.query("SELECT COALESCE(MAX(id),0)+1 id FROM inspection_projects FOR UPDATE")).rows[0].id;
      await db.query(`INSERT INTO inspection_projects(id,station_id,project_number,certificate_number,folder_name,inspection_module,customer_name,service_location,phone,customer_reference,created_at,is_active,workflow_stage) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),TRUE,'Nacrt')`,[next,station.id,data.certificate,String(data.certificate||"").replaceAll("/","-"),data.folder,moduleCode(data.module),data.customer,data.location,data.phone,data.tax_id]);
      project=(await db.query("SELECT * FROM inspection_projects WHERE id=$1",[next])).rows[0];
    }else await db.query(`UPDATE inspection_projects SET certificate_number=$1,folder_name=$2,inspection_module=$3,customer_name=$4,service_location=$5,phone=$6,customer_reference=$7,is_active=TRUE WHERE id=$8`,[data.certificate,data.folder,moduleCode(data.module),data.customer,data.location,data.phone,data.tax_id,project.id]);
    await db.query(`INSERT INTO work_orders(project_id,station_id,inspection_project_id,work_order_number,type,title,description,assigned_to,planned_date,start_date,end_date,status,document_number,customer_reference,inspection_type,request_date,service_deadline,service_date,start_time,end_time,workers,created_at,updated_at) VALUES($1,$1,$2,$3,'inspection',$4,$5,$6,$7,$7,$7,'Planned',$3,$8,$9,$10,$11,$7,$12,$13,$14,NOW(),NOW())`,[station.id,project.id,data.certificate,`${data.module} — ${data.customer}`,`Desktop projekt ${data.certificate}`,JSON.stringify(data.inspector_ids||[]),data.service_date,data.tax_id,data.inspection_type,data.request_date,data.due_date,data.start_time,data.end_time,(data.inspectors||[]).join(", ")]);
    await db.query("COMMIT");
    return (await db.query("SELECT * FROM inspection_projects WHERE id=$1",[project.id])).rows[0];
  }catch(error){await db.query("ROLLBACK");throw error;}
  finally{if(lockHeld)try{await db.query("SELECT RELEASE_LOCK('desktop-inspection-project-id')");}catch{}db.release();}
};

export const updateStage=async(id,stage,user)=>{
  const values=[stage,Number(id)];let scope="";
  if(user.clientId){values.push(Number(user.clientId));scope=` AND p.client_id=$${values.length}`;}
  return (await pool.query(`UPDATE inspection_projects ip JOIN projects p ON p.id=ip.station_id SET ip.workflow_stage=$1 WHERE ip.id=$2${scope}`,values)).rowCount>0;
};
export const validateIdentity=async(number,folder,stationId,user)=>{
  const values=[number,folder,Number(stationId)];let scope="";
  if(user.clientId){values.push(Number(user.clientId));scope=` AND p.client_id=$${values.length}`;}
  const row=(await pool.query(`SELECT ip.id,ip.station_id FROM inspection_projects ip JOIN projects p ON p.id=ip.station_id WHERE (ip.project_number=$1 OR ip.folder_name=$2)${scope} LIMIT 1`,values)).rows[0];
  return row&&Number(row.station_id)!==Number(stationId)?{valid:false,message:`Broj ${number} ili odabrani folder već pripada drugoj benzinskoj stanici.`}:{valid:true,project_id:row?.id??null};
};
