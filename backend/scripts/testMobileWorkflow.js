import "dotenv/config";
import JWT from "jsonwebtoken";
import mysql from "mysql2/promise";
import { randomUUID } from "node:crypto";

const db=await mysql.createConnection(process.env.MYSQL_URI);
const base=`http://localhost:${process.env.PORT||5001}/api-v1`;
let assetId=null,workOrderId=null,inspectionId=null;
const request=async(path,options={})=>{const response=await fetch(`${base}/${path}`,{...options,headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json",...(options.headers||{})}});const body=await response.json().catch(()=>null);if(!response.ok)throw new Error(`${options.method||"GET"} ${path}: ${response.status} ${JSON.stringify(body)}`);console.log(`PASS\t${options.method||"GET"}\t${path}`);return body;};
let token;
try{
  const [[user]]=await db.query("SELECT u.id,u.roles_id FROM users u JOIN roles r ON r.id=u.roles_id WHERE r.name='admin' AND u.status=1 LIMIT 1");
  const [permissions]=await db.query("SELECT p.name FROM role_permissions rp JOIN permissions p ON p.id=rp.permission_id WHERE rp.role_id=?",[user.roles_id]);
  token=JWT.sign({userId:user.id,roles_id:user.roles_id,permissions:permissions.map(x=>x.name),client_id:null,loyalty_portal_only:false},process.env.JWT_SECRET,{expiresIn:"10m"});
  const [[station]]=await db.query("SELECT p.id,p.client_id FROM projects p ORDER BY p.id LIMIT 1");
  const legacyId=Number(`${Date.now()}`.slice(-9));
  const [asset]=await db.execute(`INSERT INTO equipment_assets(client_id,station_id,legacy_type,legacy_id,category,metrology_type,name,serial_number,status,metadata,metrology_required,metrology_enabled,verification_interval_months) VALUES(?,?,'MobileTest',?,'Volumetar','volumeter','MOBILNI TEST VOLUMETAR','TEST-MOB-001','active',JSON_OBJECT(),TRUE,TRUE,12)`,[station.client_id,station.id,legacyId]);assetId=asset.insertId;
  const [[nextOrder]]=await db.query("SELECT COALESCE(MAX(id),0)+1000000 id FROM work_orders");workOrderId=nextOrder.id;
  await db.execute(`INSERT INTO work_orders(id,inspection_project_id,project_id,station_id,type,title,description,status,assigned_to,planned_date,created_at,updated_at) VALUES(?,NULL,?,?,'Inspection','MOBILNI INTEGRACIJSKI TEST','Automatski zapis koji se briše nakon testa','Planned',JSON_ARRAY(?),CURRENT_DATE,NOW(),NOW())`,[workOrderId,station.id,station.id,user.id]);
  const [inspection]=await db.execute(`INSERT INTO metrology_inspections(inspection_number,client_id,station_id,asset_id,work_order_id,inspection_type,status,result,installation_check,label_check,integrity_check,created_at,updated_at) VALUES(?,?,?,?,?,'verification','draft','pending',FALSE,FALSE,FALSE,NOW(),NOW())`,[`TEST-${Date.now()}`,station.client_id,station.id,assetId,workOrderId]);inspectionId=inspection.insertId;
  const key=()=>randomUUID();
  await request("work-orders/mobile/mine");
  for(const type of ["arrive","start","field_update","stop"])await request(`work-orders/${workOrderId}/mobile-events`,{method:"POST",body:JSON.stringify({event_key:key(),event_type:type,event_at:new Date().toISOString(),payload:type==="field_update"?{field_notes:"Testni terenski zapis",odometer_start:100,odometer_end:110,travel_distance_km:10}:{}})});
  await request(`work-orders/${workOrderId}`);
  await request(`work-orders/${workOrderId}/field-data`,{method:"PATCH",body:JSON.stringify({field_notes:"Provjereno spremanje",travel_time_minutes:20})});
  await request(`metrology/work-orders/${workOrderId}/inspections`);
  await request(`metrology/inspections/${inspectionId}`,{method:"PUT",body:JSON.stringify({temperature:20,humidity:55,installation_check:true,label_check:true,integrity_check:true,field_data:{source:"mobile-test"},measurements:[{measurement_point:"Qmin",reference_value:5,measured_value:5.01,error_value:0.2,tolerance_min:-0.5,tolerance_max:0.5,unit:"%"}]})});
  const saved=await request(`metrology/inspections/${inspectionId}`);if(saved.measurements.length!==1||Number(saved.measurements[0].error_value)!==0.2)throw new Error("Saved measurement was not returned correctly");
  await request(`metrology/inspections/${inspectionId}/complete`,{method:"POST",body:JSON.stringify({inspected_at:new Date().toISOString(),approve:false})});
  const [[service]]=await db.query("SELECT id FROM service_requests LIMIT 1");if(service)await request(`service-requests/${service.id}`);
  await request("notifications/read",{method:"POST",body:JSON.stringify({notification_key:`mobile-test:${workOrderId}`})});
  console.log("PASS\tMOBILE WORKFLOW COMPLETE");
}finally{
  if(workOrderId){await db.execute("DELETE FROM notification_reads WHERE notification_key=?",[`mobile-test:${workOrderId}`]);await db.execute("DELETE FROM audit_logs WHERE entity_type='work_order' AND entity_id=?",[String(workOrderId)]);await db.execute("DELETE FROM work_order_mobile_events WHERE work_order_id=?",[workOrderId]);await db.execute("DELETE FROM work_order_activities WHERE work_order_id=?",[workOrderId]);await db.execute("DELETE FROM metrology_measurements WHERE inspection_id=?",[inspectionId]);await db.execute("DELETE FROM metrology_inspections WHERE id=?",[inspectionId]);await db.execute("DELETE FROM work_orders WHERE id=?",[workOrderId]);}
  if(assetId)await db.execute("DELETE FROM equipment_assets WHERE id=?",[assetId]);
  await db.end();
}
