import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {PDFDocument} from 'pdf-lib';
import {fieldDocuments,finalDocuments,mergePdfs} from '../libs/metrologyWorkflowPdf.js';
const base={id:1,case_number:'QA-MI-2026-00001',company_name:'Testni klijent · ČĆŽŠĐ',station_name:'Testna lokacija',client_address:'Testna adresa 1',service_type:'amn',inspection_kind:'regular',request_description:'Testni opseg inspekcije',inspection_date:'2026-10-22',request_date:'2026-10-01',next_verification_date:'2028-10-22',result:'passed',status:'approved',manager_name:'Testni rukovoditelj',approver_name:'Odgovorna osoba',inspectors:[{firstname:'Testni',lastname:'Inspektor'}],standards:[{equipment_name:'Testni etalon',serial_number:'QA-E-001',calibration_certificate:'QA-CERT-001',valid_until:'2027-10-22'}]};
for(const type of ['amn','volumeter','dipstick','tank'])test(`PDF packages for ${type}: all instruments, documents and merged pages`,async()=>{
 const record={...base,service_type:type,items:[1,2].map(index=>({id:index,name:'Testno mjerilo',serial_number:`QA-SN-${index}`,apparatus_serial_number:'QA-APP',tank_reference:'QA-TANK',notes:'Zaključak: ispitano i zadovoljava.',checks:[{check_code:'installation',label:'Ugradnja',passed:true}],measurements:[{measurement_group:{amn:'comparison',volumeter:'flow_test',dipstick:'scale_point',tank:'volumetric_fill'}[type],values:{reference_mm:1000,amn_mm:1001,error_mm:1,gdg_mm:4,cumulative_standard_volume:500,height_mm:100,position:'A1'},passed:true}]}))};
 const field=await fieldDocuments(record,{risk:'Procjena rizika i zaštitne mjere provjerene.',review:'Zahtjev je preispitan; raspoloživi resursi odgovaraju opsegu.'});
 const final=await finalDocuments(record);
 assert.equal(field.length,3);assert.equal(final.filter(file=>file.kind==='inspection_certificate').length,2);
 assert.equal(final.filter(file=>file.kind==='verification_certificate').length,['amn','volumeter'].includes(type)?2:0);
 assert.equal(final.filter(file=>file.kind==='inspection_report').length,type==='tank'?2:1);
 for(const [name,files] of [['field',field],['final',final]]){
  const sizes=await Promise.all(files.map(async file=>(await PDFDocument.load(file.buffer)).getPageCount()));
  const merged=await mergePdfs(files.map(file=>file.buffer));
  assert.equal((await PDFDocument.load(merged)).getPageCount(),sizes.reduce((a,b)=>a+b,0));
  if(process.env.METROLOGY_PDF_QA_DIR){await fs.mkdir(process.env.METROLOGY_PDF_QA_DIR,{recursive:true});await fs.writeFile(path.join(process.env.METROLOGY_PDF_QA_DIR,`${type}-${name}.pdf`),merged);}
 }
});
