import "dotenv/config";
import Database from "better-sqlite3";
import mysql from "mysql2/promise";

const sourcePath=process.argv[2]||process.env.DESKTOP_SQLITE_PATH;
if(!sourcePath)throw new Error("Desktop SQLite path is required");
if(!process.env.MYSQL_URI)throw new Error("MYSQL_URI is required");
const source=new Database(sourcePath,{readonly:true,fileMustExist:true});
const target=await mysql.createConnection(process.env.MYSQL_URI);
const clean=value=>value==null?"":String(value).trim().replace(/\s+/g," ").toLocaleLowerCase("hr");
const truth=value=>[1,"1","true","da","yes","active","aktivna","aktivan"].includes(typeof value==="string"?value.trim().toLowerCase():value);
const report=[];
const check=(domain,sourceRows,targetRows,key,fields)=>{
  const central=new Map(targetRows.map(row=>[String(key.target(row)),row]));let missing=0,mismatched=0;const samples=[];
  for(const row of sourceRows){const id=String(key.source(row));const other=central.get(id);if(!other){missing++;if(samples.length<5)samples.push({id,problem:"missing_in_mysql"});continue;}
    const differences=fields.filter(field=>field.normalize(field.source(row))!==field.normalize(field.target(other))).map(field=>field.name);
    if(differences.length){mismatched++;if(samples.length<5)samples.push({id,problem:"field_mismatch",fields:differences});}central.delete(id);
  }
  report.push({domain,sqlite:sourceRows.length,mysql:targetRows.length,missing_in_mysql:missing,extra_in_mysql:central.size,field_mismatches:mismatched,samples});
};
const textField=(name,sourceName,targetName)=>({name,source:r=>r[sourceName],target:r=>r[targetName],normalize:clean});
const boolField=(name,sourceName,targetName)=>({name,source:r=>r[sourceName],target:r=>r[targetName],normalize:truth});

const stations=source.prepare("SELECT * FROM Lista_Pumpi").all();
const [centralStations]=await target.query("SELECT * FROM projects");
check("stations",stations,centralStations,{source:r=>r.ID,target:r=>r.desktop_station_id},[
  textField("customer","Narucitelj","client_name_placeholder"),
  textField("location","Mjesto_izvrsenja_usluge","address_city"),
  textField("sttn","FMT_STTN_broj","station_code"),boolField("active","Status","active")
].map(field=>field.name==="customer"?{...field,target:r=>r.__client_name}:field.name==="location"?{...field,target:r=>[r.address,r.city].filter(Boolean).join(", ")}:field));

const [clients]=await target.query("SELECT id,company_name FROM clients");const clientNames=new Map(clients.map(row=>[String(row.id),row.company_name]));
for(const row of centralStations)row.__client_name=clientNames.get(String(row.client_id))||"";
report.pop();
check("stations",stations,centralStations,{source:r=>r.ID,target:r=>r.desktop_station_id},[
  {name:"customer",source:r=>r.Narucitelj,target:r=>r.__client_name,normalize:clean},
  {name:"location",source:r=>r.Mjesto_izvrsenja_usluge,target:r=>[r.address,r.city].filter(Boolean).join(", "),normalize:clean},
  textField("sttn","FMT_STTN_broj","station_code"),boolField("active","Status","active")
]);

const mappings=[
  ["probes","Probes","ProbeId","Probes",[["serial","SerialNumber","serial_number"],["fuel","Fuel","fuel_type"]]],
  ["volumeters","VolumeMeters","VolumeMeterId","VolumeMeters",[["serial","SerialNumber","serial_number"],["fuel","Fuel","fuel_type"]]],
  ["tanks","Tanks","TankId","Tanks",[["serial","SerialNumber","serial_number"],["fuel","Fuel","fuel_type"]]],
  ["measuring_rods","MeasuringRods","MeasuringRodId","Rods",[["serial","SerialNumber","serial_number"]]]
];
for(const [domain,table,id,legacy,extra] of mappings){
  const local=source.prepare(`SELECT * FROM ${table}`).all();const [central]=await target.query("SELECT * FROM equipment_assets WHERE legacy_type=?",[legacy]);
  check(domain,local,central,{source:r=>r[id],target:r=>r.legacy_id},[
    ...extra.map(([name,a,b])=>textField(name,a,b)),boolField("active","IsActive","status").name&&{name:"active",source:r=>r.IsActive,target:r=>r.status,normalize:value=>typeof value==="string"?value.toLowerCase()==="active":truth(value)}
  ]);
}

const countPairs=[
  ["projects","Projects","inspection_projects"],["work_orders","WorkOrders","work_orders"],
  ["calibrations","EquipmentCalibrations","equipment_calibrations"],["inspection_results","EquipmentInspectionResults","inspection_results"],
  ["service_cases","ServiceCases","service_requests"],
  ["verification_marks","VerificationMarkUsage","verification_mark_usage"]
];
for(const [domain,localTable,centralTable] of countPairs){const sqlite=source.prepare(`SELECT COUNT(*) count FROM ${localTable}`).get().count;const [rows]=await target.query(`SELECT COUNT(*) count FROM ${centralTable}`);report.push({domain,sqlite,mysql:Number(rows[0].count),difference:Number(rows[0].count)-sqlite});}
const eligibleAttachments=source.prepare(`SELECT COUNT(*) count FROM Attachments a JOIN Projects p ON p.ProjectID=a.ProjectID WHERE COALESCE(a.IsCurrent,1)=1 AND a.AttachmentData IS NOT NULL`).get().count;
const [documentRows]=await target.query("SELECT COUNT(*) count FROM documents WHERE desktop_attachment_id IS NOT NULL");
report.push({domain:"current_project_documents",sqlite:eligibleAttachments,mysql:Number(documentRows[0].count),difference:Number(documentRows[0].count)-eligibleAttachments});

console.log(JSON.stringify({checked_at:new Date().toISOString(),source:sourcePath,ok:report.every(x=>(x.missing_in_mysql||0)===0&&(x.extra_in_mysql||0)===0&&(x.field_mismatches||0)===0&&(x.difference||0)===0),domains:report},null,2));
source.close();await target.end();
