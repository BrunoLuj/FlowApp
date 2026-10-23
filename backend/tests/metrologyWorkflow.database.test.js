import test from 'node:test';
import assert from 'node:assert/strict';
import {pool} from '../libs/database.js';
import {createCase,getCase,saveCase,completeCase,registerDocument} from '../models/metrologyCaseModel.js';
import {ensureWorkflowSchema,readWorkflow,mutateWorkflow} from '../models/metrologyWorkflowStore.js';
import {requirePreparation,requireMeasurements,fingerprint} from '../libs/metrologyWorkflowRules.js';

test('database integration: create, save twice, field preparation, review, approval, closure and locks (rollback)',{skip:process.env.METROLOGY_DB_TEST!=='1'},async()=>{
 await ensureWorkflowSchema();
 const client=(await pool.query('SELECT id FROM clients ORDER BY id LIMIT 1')).rows[0];
 const manager=(await pool.query('SELECT id FROM users ORDER BY id LIMIT 1')).rows[0];
 assert.ok(client&&manager,'An existing client and user are needed for foreign keys.');
 const connection=await pool.connect();const query=pool.query;const connect=pool.connect;
 await connection.query('BEGIN');
 const proxy={query:async(sql,values)=>/^(BEGIN|COMMIT|ROLLBACK)$/.test(sql)?{rows:[],rowCount:0}:connection.query(sql,values),release(){}};
 pool.query=proxy.query;pool.connect=async()=>proxy;
 try{
  const user={userId:manager.id,clientId:null};
  const record=await createCase({client_id:client.id,service_type:'amn',request_description:'QA rollback only'},user);assert.ok(record.id);assert.ok(record.case_number);
  const draft={status:'measurement',inspection_date:'2026-10-22',technical_manager_id:manager.id,inspector_ids:[manager.id],items:[{item_type:'amn_probe',name:'QA rollback',serial_number:'QA-ROLLBACK',tank_reference:'QA-TANK',notes:'Pregledano i zadovoljava.',checks:[{check_code:'installation',label:'Ugradnja',passed:true}],measurements:[1,2,3].map(()=>({measurement_group:'comparison',values:{reference_mm:1000,amn_mm:1001,gdg_mm:4},passed:true}))}],standards:[{equipment_name:'QA rollback etalon',serial_number:'QA-E',calibration_certificate:'QA-CERT',valid_until:'2027-10-22'}]};
  await saveCase(record.id,draft,user);await saveCase(record.id,draft,user);
  const after=await getCase(record.id);assert.equal(after.items.length,1);assert.equal(after.items[0].measurements.length,3);requireMeasurements(after);
  await saveCase(record.id,{...after,inspector_ids:[manager.id]},user);
  await mutateWorkflow(record.id,user,async state=>{state.request.returned_at=new Date().toISOString();state.preparation={risk:'QA rizik',review:'QA provjera'};});
  const state=await readWorkflow(record.id);requirePreparation(after,state);
  await mutateWorkflow(record.id,user,async state=>{state.field_package={source_hash:fingerprint(after)};});
  await saveCase(record.id,{...draft,status:'completed'},user);
  const approved=await completeCase(record.id,user);assert.equal(approved.status,'approved');assert.equal(approved.result,'passed');assert.ok(approved.next_verification_date);
  const final=await getCase(record.id);
  await mutateWorkflow(record.id,user,async state=>{state.final_package={source_hash:fingerprint(final)};state.closed_at=new Date().toISOString();});
  await assert.rejects(()=>mutateWorkflow(record.id,user,async()=>{}),/zaključen/);
  await assert.rejects(()=>registerDocument(record.id,'inspection_request',{fileName:'qa.pdf',storageKey:'qa.pdf',fileSize:1},user),/zaključen/);
  await assert.rejects(()=>saveCase(record.id,draft,user),/locked/i);
 }finally{pool.query=query;pool.connect=connect;await connection.query('ROLLBACK');connection.release();await pool.end();}
});
