import test from 'node:test';
import assert from 'node:assert/strict';
import {fingerprint,initialWorkflow,requirePreparation,requireMeasurements,requireClose} from '../libs/metrologyWorkflowRules.js';

export const fixture=()=>({id:1,case_number:'QA-MI-2026-00001',client_id:1,company_name:'Testni klijent',station_name:'Testna lokacija',service_type:'amn',inspection_kind:'regular',request_description:'Inspekcija AMN sonde',inspection_date:'2026-10-22',technical_manager_id:1,verification_period_months:24,status:'completed',result:'passed',inspectors:[{id:1,firstname:'Testni',lastname:'Inspektor'}],standards:[{equipment_name:'Testni etalon',serial_number:'QA-001',calibration_certificate:'QA-CERT',valid_until:'2027-10-22'}],items:[{id:11,item_type:'amn_probe',name:'Testna sonda',serial_number:'QA-SN-001',tank_reference:'QA-REZ-001',notes:'Sonda je pregledana. Rezultati zadovoljavaju.',checks:[{check_code:'installation',label:'Ugradnja ispravna',passed:true}],measurements:[1,2,3].map(()=>({measurement_group:'comparison',values:{reference_mm:1000,amn_mm:1001,error_mm:1,gdg_mm:4},passed:true}))}]});
test('field preparation requires returned request, assigned inspector, instruments, standards and reviews',()=>{
 const record=fixture();const state=initialWorkflow();assert.throws(()=>requirePreparation(record,state),/vraćeni/);
 state.request.returned_at='2026-10-22';state.preparation={risk:'Procijenjeno',review:'Pregledano'};requirePreparation(record,state);
 for(const key of ['items','inspectors','standards'])assert.throws(()=>requirePreparation({...record,[key]:[]},state));
});
test('incomplete, blank and nonnumeric measurements cannot be submitted for review',()=>{
 const record=fixture();requireMeasurements(record);
 for(const value of ['',null,'abc','   ']){const draft=structuredClone(record);draft.items[0].measurements[0].values.reference_mm=value;assert.throws(()=>requireMeasurements(draft),/Dopunite/);}
 const draft=fixture();draft.items[0].notes='';assert.throws(()=>requireMeasurements(draft),/zaključak/);
 const unchecked=fixture();unchecked.items[0].checks[0].passed=null;assert.throws(()=>requireMeasurements(unchecked),/provjere/);
});
test('zero readings are legitimate and AMN requires exactly three readings',()=>{
 const record=fixture();record.items[0].measurements[0].values.reference_mm=0;requireMeasurements(record);
 record.items[0].measurements.pop();assert.throws(()=>requireMeasurements(record),/tri mjerenja/);
});
test('closure requires approval and current final package; changes invalidate the package',()=>{
 const record=fixture();const state=initialWorkflow();assert.throws(()=>requireClose(record,state),/odobriti/);
 record.status='approved';state.request.returned_at='2026-10-22';state.final_package={source_hash:fingerprint(record)};requireClose(record,state);
 record.items[0].notes='Promijenjen zaključak';assert.throws(()=>requireClose(record,state),/aktualne/);
});
test('fingerprints survive generated row ids but track check decisions and measurement edits',()=>{
 const record=fixture();const copy=structuredClone(record);copy.items[0].id=99;copy.status='approved';assert.equal(fingerprint(copy),fingerprint(record));
 copy.items[0].checks[0].passed=false;assert.notEqual(fingerprint(copy),fingerprint(record));
});
