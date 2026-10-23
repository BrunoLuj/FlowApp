import fs from "fs";
import Database from "better-sqlite3";
import mysql from "mysql2/promise";

const sourcePath=process.argv[2];
const connectionString=process.env.MYSQL_URI;
if(!sourcePath||!connectionString)throw new Error("Usage: MYSQL_URI=... node scripts/importDesktopToMySql.js <sqlite-path>");
const sqlite=new Database(sourcePath,{readonly:true,fileMustExist:true});
const target=await mysql.createConnection(connectionString);
const rows=(sql)=>sqlite.prepare(sql).all();
const text=(value)=>value==null?null:String(value).trim()||null;
const active=(value)=>String(value??"1").toLowerCase()!=="0"&&String(value??"").toLowerCase()!=="neaktivan";
const validDate=(value)=>{if(!value)return null;const match=String(value).match(/(\d{4})-(\d{2})-(\d{2})/);return match?match[0]:null;};

const stationRows=rows('SELECT * FROM "Lista_Pumpi" ORDER BY ID');
const clientTax=(station)=>{const value=text(station.IDbroj);return value&&value.replace(/\D/g,"").length>=6?value:null;};
const clientKey=(station)=>clientTax(station)||`name:${text(station.Narucitelj)?.toLocaleLowerCase("hr")||station.ID}`;
const clientIds=new Map();
const assetIds=new Map();

const upsertAsset=async({legacyType,legacyId,stationId,parentId=null,category,metrologyType,name,manufacturer=null,model=null,serial=null,official=null,fuel=null,isActive=true,notes=null,metadata={}})=>{
  const clientId=clientIds.get(clientKey(stationRows.find(x=>Number(x.ID)===Number(stationId))));
  if(!clientId)return;
  await target.execute(`INSERT INTO equipment_assets(client_id,station_id,parent_asset_id,legacy_type,legacy_id,category,metrology_type,name,manufacturer,model,serial_number,official_mark,fuel_type,status,notes,metadata)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE client_id=VALUES(client_id),station_id=VALUES(station_id),parent_asset_id=VALUES(parent_asset_id),category=VALUES(category),metrology_type=VALUES(metrology_type),name=VALUES(name),manufacturer=VALUES(manufacturer),model=VALUES(model),serial_number=VALUES(serial_number),official_mark=VALUES(official_mark),fuel_type=VALUES(fuel_type),status=VALUES(status),notes=VALUES(notes),metadata=VALUES(metadata),updated_at=CURRENT_TIMESTAMP(3)`,
    [clientId,stationId,parentId,legacyType,legacyId,category,metrologyType,name,manufacturer,model,serial,official,fuel,isActive?'active':'inactive',notes,JSON.stringify(metadata)]);
  const [found]=await target.execute('SELECT id FROM equipment_assets WHERE legacy_type=? AND legacy_id=?',[legacyType,legacyId]);assetIds.set(`${legacyType}:${legacyId}`,Number(found[0].id));
};

try{
 await target.beginTransaction();
 for(const station of stationRows){
  const key=clientKey(station);if(clientIds.has(key))continue;const company=text(station.Narucitelj)||`Klijent stanice ${station.ID}`;const tax=clientTax(station);
  let [found]=tax?await target.execute('SELECT id FROM clients WHERE tax_id=? ORDER BY id LIMIT 1',[tax]):await target.execute('SELECT id FROM clients WHERE tax_id IS NULL AND LOWER(TRIM(company_name))=LOWER(TRIM(?)) ORDER BY id LIMIT 1',[company]);
  if(!found.length){await target.execute(`INSERT INTO clients(company_name,tax_id,phone,email,active) VALUES(?,?,?,?,?)`,[company,tax,text(station.Telefon),text(station.Email),active(station.Status)]);[found]=tax?await target.execute('SELECT id FROM clients WHERE tax_id=? ORDER BY id DESC LIMIT 1',[tax]):await target.execute('SELECT id FROM clients WHERE tax_id IS NULL AND LOWER(TRIM(company_name))=LOWER(TRIM(?)) ORDER BY id DESC LIMIT 1',[company]);}
  else await target.execute('UPDATE clients SET company_name=?,phone=?,email=?,active=? WHERE id=?',[company,text(station.Telefon),text(station.Email),active(station.Status),found[0].id]);
  clientIds.set(key,Number(found[0].id));
 }
 for(const station of stationRows){await target.execute(`INSERT INTO projects(id,client_id,name,station_code,phone,email,address,status,notes,desktop_station_id) VALUES(?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE client_id=VALUES(client_id),name=VALUES(name),station_code=VALUES(station_code),phone=VALUES(phone),email=VALUES(email),address=VALUES(address),status=VALUES(status),notes=VALUES(notes),updated_at=CURRENT_TIMESTAMP(3)`,[station.ID,clientIds.get(clientKey(station)),text(station.Mjesto_izvrsenja_usluge)||text(station.Narucitelj)||`Stanica ${station.ID}`,text(station.FMT_STTN_broj),text(station.Telefon),text(station.Email),text(station.Mjesto_izvrsenja_usluge),active(station.Status)?'active':'inactive',text(station.Napomena),station.ID]);}
 for(const x of rows('SELECT * FROM EquipmentControllers'))await upsertAsset({legacyType:'Controllers',legacyId:x.ControllerId,stationId:x.StationId,category:'Kontroler',metrologyType:'controller',name:`Kontroler ${text(x.SerialNumber)||x.Sequence||x.ControllerId}`,manufacturer:text(x.Manufacturer),model:text(x.Type),serial:text(x.SerialNumber),official:text(x.OfficialMark),isActive:active(x.IsActive),notes:text(x.Notes),metadata:{sequence:x.Sequence}});
 for(const x of rows('SELECT * FROM Dispensers'))await upsertAsset({legacyType:'Dispensers',legacyId:x.DispenserId,stationId:x.StationId,category:'Aparat',metrologyType:'dispenser',name:`Aparat ${text(x.SerialNumber)||x.Sequence||x.DispenserId}`,manufacturer:text(x.Manufacturer),model:text(x.Type),serial:text(x.SerialNumber),official:text(x.OfficialMark),isActive:active(x.IsActive),notes:text(x.Notes),metadata:{sequence:x.Sequence}});
 for(const x of rows('SELECT * FROM Tanks'))await upsertAsset({legacyType:'Tanks',legacyId:x.TankId,stationId:x.StationId,category:'Rezervoar',metrologyType:'tank',name:`Rezervoar ${text(x.SerialNumber)||x.Sequence||x.TankId}`,manufacturer:text(x.Manufacturer),model:text(x.Type),serial:text(x.SerialNumber),official:text(x.OfficialMark),fuel:text(x.Fuel),isActive:active(x.IsActive),notes:text(x.Notes),metadata:{sequence:x.Sequence,capacity:x.Capacity}});
 for(const x of rows('SELECT * FROM MeasuringRods'))await upsertAsset({legacyType:'Rods',legacyId:x.MeasuringRodId,stationId:x.StationId,category:'Mjerna letva',metrologyType:'dipstick',name:`Mjerna letva ${text(x.SerialNumber)||x.MeasuringRodId}`,manufacturer:text(x.Manufacturer),serial:text(x.SerialNumber),isActive:active(x.IsActive),notes:text(x.Notes),metadata:{length:x.Length}});
 for(const x of rows('SELECT P.*,C.StationId FROM Probes P JOIN EquipmentControllers C ON C.ControllerId=P.ControllerId'))await upsertAsset({legacyType:'Probes',legacyId:x.ProbeId,stationId:x.StationId,parentId:assetIds.get(`Controllers:${x.ControllerId}`)||null,category:'AMN sonda',metrologyType:'amn_probe',name:`Sonda ${text(x.SerialNumber)||x.Sequence||x.ProbeId}`,serial:text(x.SerialNumber),fuel:text(x.Fuel),isActive:active(x.IsActive),notes:text(x.Notes),metadata:{sequence:x.Sequence,tank_code:x.TankCode}});
 for(const x of rows('SELECT V.*,D.StationId FROM VolumeMeters V JOIN Dispensers D ON D.DispenserId=V.DispenserId'))await upsertAsset({legacyType:'VolumeMeters',legacyId:x.VolumeMeterId,stationId:x.StationId,parentId:assetIds.get(`Dispensers:${x.DispenserId}`)||null,category:'Volumetar',metrologyType:'volumeter',name:`Volumetar ${text(x.SerialNumber)||x.Sequence||x.VolumeMeterId}`,serial:text(x.SerialNumber),fuel:text(x.Fuel),isActive:active(x.IsActive),notes:text(x.Notes),metadata:{sequence:x.Sequence,measuring_range:x.MeasuringRange}});
 const calibrations=rows('SELECT * FROM EquipmentCalibrations');for(const x of calibrations){const keyType=x.EquipmentType==='MeasuringRods'?'Rods':x.EquipmentType;await target.execute(`INSERT INTO equipment_calibrations(id,station_id,asset_id,legacy_equipment_type,legacy_equipment_id,performed_on,expires_on,certificate_number,notes,is_voided,created_at,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE station_id=VALUES(station_id),asset_id=VALUES(asset_id),performed_on=VALUES(performed_on),expires_on=VALUES(expires_on),certificate_number=VALUES(certificate_number),notes=VALUES(notes),is_voided=VALUES(is_voided)`,[x.CalibrationId,x.StationId,assetIds.get(`${keyType}:${x.EquipmentId}`)||null,text(x.EquipmentType),x.EquipmentId,validDate(x.PerformedOn),validDate(x.ExpiresOn),text(x.CertificateNumber),text(x.Notes),Boolean(x.IsVoided),validDate(x.CreatedAt),text(x.CreatedBy)]);}
 const [counts]=await target.query(`SELECT (SELECT COUNT(*) FROM clients) clients,(SELECT COUNT(*) FROM projects) stations,(SELECT COUNT(*) FROM equipment_assets) assets,(SELECT COUNT(*) FROM equipment_calibrations) calibrations`);const stat=fs.statSync(sourcePath);await target.execute('INSERT INTO desktop_import_runs(source_path,source_size,source_modified_at,stations_count,clients_count,assets_count,calibrations_count,status) VALUES(?,?,?,?,?,?,?,?)',[sourcePath,stat.size,new Date(stat.mtimeMs),counts[0].stations,counts[0].clients,counts[0].assets,counts[0].calibrations,'verified']);await target.commit();console.log(JSON.stringify(counts[0]));
}catch(error){await target.rollback();throw error;}finally{sqlite.close();await target.end();}
