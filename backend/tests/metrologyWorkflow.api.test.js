import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import JWT from 'jsonwebtoken';
import {PDFDocument} from 'pdf-lib';
import app from '../app.js';
import {pool} from '../libs/database.js';
import {ensureWorkflowSchema} from '../models/metrologyWorkflowStore.js';
import {removeUploadedFile} from '../middleware/uploadMiddleware.js';

test('HTTP workflow from client email and returned request through field/final packages and closure (rollback + local SMTP)',{skip:process.env.METROLOGY_DB_TEST!=='1'},async()=>{
 await ensureWorkflowSchema();
 const client=(await pool.query('SELECT id FROM clients ORDER BY id LIMIT 1')).rows[0];
 const manager=(await pool.query('SELECT id FROM users ORDER BY id LIMIT 1')).rows[0];
 const role=(await pool.query("SELECT rp.role_id FROM role_permissions rp JOIN permissions p ON p.id=rp.permission_id WHERE p.name IN ('manage_metrology_cases','view_metrology_cases','generate_metrology_case_documents','approve_metrology_inspections') GROUP BY rp.role_id HAVING COUNT(DISTINCT p.name)=4 LIMIT 1")).rows[0];
 assert.ok(client&&manager&&role,'Test requires an existing client, user and authorized role.');
 const saved=Object.fromEntries(['SMTP_HOST','SMTP_PORT','SMTP_FROM','SMTP_USER','SMTP_PASS','SMTP_SECURE'].map(key=>[key,process.env[key]]));
 let emailCount=0;
 const smtp=net.createServer(socket=>{let buffer='';let data=false;socket.write('220 localhost QA\r\n');socket.on('data',chunk=>{buffer+=chunk.toString();while(true){if(data){const end=buffer.indexOf('\r\n.\r\n');if(end<0)return;emailCount++;buffer=buffer.slice(end+5);data=false;socket.write('250 OK\r\n');continue;}const end=buffer.indexOf('\r\n');if(end<0)return;const line=buffer.slice(0,end);buffer=buffer.slice(end+2);if(/^EHLO|^HELO/.test(line))socket.write('250 localhost\r\n');else if(/^DATA/.test(line)){data=true;socket.write('354 Send\r\n');}else if(/^QUIT/.test(line)){socket.end('221 Bye\r\n');return;}else socket.write('250 OK\r\n');}});});
 await new Promise(resolve=>smtp.listen(0,'127.0.0.1',resolve));
 Object.assign(process.env,{SMTP_HOST:'127.0.0.1',SMTP_PORT:String(smtp.address().port),SMTP_FROM:'qa@example.test',SMTP_SECURE:'false'});delete process.env.SMTP_USER;delete process.env.SMTP_PASS;
 const connection=await pool.connect();const originalQuery=pool.query;const originalConnect=pool.connect;await connection.query('BEGIN');
 const proxy={query:async(sql,values)=>/^(BEGIN|COMMIT|ROLLBACK)$/.test(sql)?{rows:[],rowCount:0}:connection.query(sql,values),release(){}};
 pool.query=proxy.query;pool.connect=async()=>proxy;
 const server=http.createServer(app);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const token=JWT.sign({userId:manager.id,roles_id:role.role_id},process.env.JWT_SECRET,{expiresIn:'5m'});
 const headers={Authorization:`Bearer ${token}`};const url=`http://127.0.0.1:${server.address().port}/api-v1/metrology-cases`;
 let id;let storage=[];
 const call=async(method,tail='',body,expected=200)=>{
  const form=body instanceof FormData;const response=await fetch(url+tail,{method,headers:{...headers,...(body&&!form?{'Content-Type':'application/json'}:{})},body:body?(form?body:JSON.stringify(body)):undefined});
  const result=await response.json();assert.equal(response.status,expected,`${method} ${tail}: ${result.error||result.message||''}`);return result;
 };
 try{
  const created=await call('POST','',{client_id:client.id,service_type:'amn',request_description:'QA API rollback'},201);id=created.id;
  await call('POST',`/${id}/packages/final`,{},409);
  await call('POST',`/${id}/email-request`,{recipient:'client@example.test',subject:'QA local request',body:'Please return the signed request.'});assert.equal(emailCount,1);
  await call('POST',`/${id}/email-request`,{recipient:'client@example.test',subject:'QA duplicate',body:'QA'},409);assert.equal(emailCount,1);
  const pdf=await PDFDocument.create();pdf.addPage();const form=new FormData();form.append('file',new Blob([await pdf.save()],{type:'application/pdf'}),'qa-returned.pdf');form.append('note','QA received');await call('POST',`/${id}/returned-request`,form,201);
  const draft={status:'measurement',inspection_date:'2026-10-22',technical_manager_id:manager.id,inspector_ids:[manager.id],items:[{item_type:'amn_probe',name:'QA API',serial_number:'QA-API-SN',tank_reference:'QA-TANK',notes:'Rezultati zadovoljavaju.',checks:[{check_code:'installation',label:'Ugradnja',passed:true}],measurements:[1,2,3].map(()=>({measurement_group:'comparison',values:{reference_mm:1000,amn_mm:1001,gdg_mm:4},passed:true}))}],standards:[{equipment_name:'QA etalon',serial_number:'QA-E',calibration_certificate:'QA-CERT',valid_until:'2027-10-22'}]};
  await call('PUT',`/${id}`,draft);await call('PUT',`/${id}/preparation`,{risk:'QA procjena rizika',review:'QA preispitivanje zahtjeva'});
  const field=await call('POST',`/${id}/packages/field`,{},201);assert.ok(field.field_package.attachment_id);
  await call('PUT',`/${id}`,{...draft,status:'approved'},409);
  await call('PUT',`/${id}`,{...draft,status:'completed'});await call('POST',`/${id}/complete`,{});
  const final=await call('POST',`/${id}/packages/final`,{},201);assert.ok(final.final_package.attachment_id);
  const closed=await call('POST',`/${id}/close`,{note:'QA zaključeno'});assert.ok(closed.closed_at);
  await call('PUT',`/${id}`,draft,409);await call('POST',`/${id}/packages/final`,{},409);await call('POST',`/${id}/close`,{},409);
  const download=await fetch(url+`/${id}/files/${final.final_package.attachment_id}`,{headers});assert.equal(download.status,200);assert.match(download.headers.get('content-type'),/pdf/);
  const foreignToken=JWT.sign({userId:manager.id,roles_id:role.role_id,client_id:2147483000},process.env.JWT_SECRET,{expiresIn:'5m'});
  const denied=await fetch(url+`/${id}/workflow`,{headers:{Authorization:`Bearer ${foreignToken}`}});assert.equal(denied.status,404);
 }finally{
  if(id)storage=(await connection.query('SELECT storage_key FROM entity_attachments WHERE metrology_case_id=$1',[id])).rows.map(row=>row.storage_key);
  await new Promise(resolve=>server.close(resolve));pool.query=originalQuery;pool.connect=originalConnect;await connection.query('ROLLBACK');connection.release();
  await Promise.all(storage.map(removeUploadedFile));await pool.end();await new Promise(resolve=>smtp.close(resolve));
  for(const [key,value] of Object.entries(saved))if(value===undefined)delete process.env[key];else process.env[key]=value;
 }
});
