import PDFKit from 'pdfkit';
import { PDFDocument, rgb } from 'pdf-lib';
import path from 'node:path';
import { createRequire } from 'node:module';
import {buildMetrologyCasePdf} from './metrologyCasePdf.js';
const buildExactMetrologyForm=(record,type)=>buildMetrologyCasePdf(record,type,1+Math.max(0,...(record.documents||[]).filter(item=>item.document_type===type).map(item=>Number(item.version_no)||0)));
const buildExactMetrologyReport=record=>buildExactMetrologyForm(record,'inspection_report');
const require=createRequire(import.meta.url);
const font=path.join(path.dirname(require.resolve('dejavu-fonts-ttf/package.json')),'ttf','DejaVuSans.ttf');
const labels={volumeter:'Volumetri',amn:'Automatska mjerila nivoa',dipstick:'Mjerna letva',tank:'Rezervoari'};
export function supplementPdf(record,preparation) {
    return new Promise((resolve,reject)=>{
        const doc=new PDFKit({size:'A4',margin:48}); const chunks=[];
        doc.on('data',chunk=>chunks.push(chunk));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);
        doc.font(font);
        const page=(title,sections)=>{
            doc.fontSize(17).text(title);doc.moveDown();doc.fontSize(10).text(`${record.case_number} · ${labels[record.service_type]}`);
            doc.text(`${record.company_name} · ${record.station_name||record.location_text||''}`);doc.moveDown();
            for(const [label,value] of sections){doc.fontSize(11).text(label);doc.moveDown(.3);doc.fontSize(10).text(value||'________________________________________________________________');doc.moveDown();}
        };
        page('Izvještaj o procjeni rizika zahtjeva', [['Procjena rizika, mjere zaštite i ograničenja',preparation.risk],['Datum / odgovorna osoba','________________________________________'],['Potpis','________________________________________']]);
        doc.addPage();page('ZA-16-02 · Preispitivanje zahtjeva',[['Opseg usluge',record.request_description],['Preispitivanje zahtjeva, osposobljenost i raspoloživi resursi',preparation.review],['Dodijeljeni inspektori',(record.inspectors||[]).map(item=>`${item.firstname||''} ${item.lastname||''}`).join(', ')],['Etaloni',(record.standards||[]).map(item=>`${item.equipment_name} · ${item.serial_number||''} · ${item.calibration_certificate||''}`).join('\n')],['Datum / potpis','________________________________________']]);
        doc.addPage();page('Popis mjerila obuhvaćenih radnim nalogom',record.items.map((item,index)=>[`${index+1}. ${item.name||labels[record.service_type]}`,`Serijski broj: ${item.serial_number||'—'} · Aparat / rezervoar: ${item.apparatus_serial_number||item.tank_reference||'—'}\nProizvođač: ${item.manufacturer||'—'} · Tip: ${item.model||'—'}\nZaključak na terenu: ________________________________________________________________`]));
        doc.addPage();page('Anketni list zadovoljstva kupca',[['Ocjena kvalitete usluge (1–5)','________________________________________'],['Ocjena komunikacije i dogovorenih rokova (1–5)','________________________________________'],['Primjedbe i prijedlozi','\n\n________________________________________________________________\n\n________________________________________________________________'],['Ime, datum i potpis klijenta','________________________________________']]);
        doc.end();
    });
}
export async function mergePdfs(buffers) {
    const output=await PDFDocument.create();
    for(const buffer of buffers){const source=await PDFDocument.load(buffer);for(const page of await output.copyPages(source,source.getPageIndices()))output.addPage(page);}
    return Buffer.from(await output.save());
}
export function resultDetailsPdf(record) {
    return new Promise((resolve,reject)=>{
        const doc=new PDFKit({size:'A4',margin:48});const chunks=[];
        doc.on('data',chunk=>chunks.push(chunk));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);doc.font(font);
        const names={reference_mm:'Etalon (mm)',amn_mm:'AMN (mm)',gdg_mm:'GDG (mm)',error_mm:'Greška (mm)',set_volume_l:'Zadani volumen (l)',reference_qmin_l:'Etalon Qmin (l)',reference_qmid_l:'Etalon Qsr (l)',reference_qmax_l:'Etalon Qmax (l)',error_qmin_percent:'Greška Qmin (%)',error_qmid_percent:'Greška Qsr (%)',error_qmax_percent:'Greška Qmax (%)',qmin_l_min:'Qmin (l/min)',qmid_l_min:'Qsr (l/min)',qmax_l_min:'Qmax (l/min)',cumulative_standard_volume:'Kumulativni volumen etalona (l)',height_mm:'Visina (mm)',standard_fluid_temperature:'Temperatura fluida u etalonu (°C)',tank_fluid_temperature:'Temperatura fluida u rezervoaru (°C)',flow_l_min:'Protok (l/min)',position:'Pozicija',standard_reading_mm:'Očitanje etalona (mm)',equipment_reading_mm:'Očitanje mjerila (mm)',mpe_mm:'MPE (mm)'};
        doc.fontSize(17).text('Prilog izvještaju · rezultati i zaključci');doc.moveDown();doc.fontSize(10).text(`${record.case_number} · ${record.company_name} · ${record.station_name||''}`);
        doc.text(`Datum inspekcije: ${record.inspection_date?new Date(record.inspection_date).toLocaleDateString('hr-HR'):'—'}`);
        doc.text(`Provjerio: ${record.approver_name||record.manager_name||'—'} · Ishod: ${record.result==='passed'?'Zadovoljava':record.result==='failed'?'Ne zadovoljava':'Uvjetno'}`);
        for(const item of record.items){
            doc.moveDown();doc.fontSize(12).text(`${item.name||labels[record.service_type]} · ${item.serial_number||'Bez serijskog broja'}`);doc.fontSize(10).text(`Zaključak: ${item.notes||'—'}`);
            for(const check of item.checks||[])doc.text(`${check.label}: ${check.passed==null?'Nije procijenjeno':check.passed?'DA':'NE'}`);
            for(const [index,row] of (item.measurements||[]).entries()){
                doc.moveDown(.5);doc.text(`Mjerenje ${index+1}`);
                for(const [key,value] of Object.entries(row.values||{}))doc.text(`${names[key]||key.replaceAll('_',' ')}: ${value??'—'}`);
            }
        }
        doc.moveDown();doc.fontSize(12).text('Korišteni etaloni');doc.fontSize(10);
        for(const item of record.standards||[])doc.text(`${item.equipment_name} · ${item.manufacturer||''} · SN ${item.serial_number||'—'} · certifikat ${item.calibration_certificate||'—'} · vrijedi do ${item.valid_until?new Date(item.valid_until).toLocaleDateString('hr-HR'):'—'}`);
        doc.end();
    });
}
export async function fieldDocuments(record,preparation) {
    const blank={...record,items:record.items.map(item=>({...item,notes:'',checks:(item.checks||[]).map(check=>({...check,passed:null})),measurements:(item.measurements||[]).map(row=>({...row,values:{},passed:null}))}))};
    const report=await PDFDocument.load(await buildExactMetrologyReport(blank));
    for(const page of report.getPages())page.drawText('TERENSKI OBRAZAC - NIJE ZAVRSNI IZVJESTAJ',{x:40,y:16,size:8,color:rgb(.55,.15,.1)});
    return [
        {kind:'field_work_order',label:'Radni nalog',buffer:await buildExactMetrologyForm(record,'inspection_work_order')},
        {kind:'field_report',label:'Terenski obrazac rezultata',buffer:Buffer.from(await report.save())},
        {kind:'field_supplements',label:'Procjena rizika, preispitivanje zahtjeva i anketa',buffer:await supplementPdf(record,preparation)},
    ];
}
export async function finalDocuments(record) {
    const files=[];
    if(record.service_type==='tank')for(const item of record.items)files.push({kind:'inspection_report',label:`Izvještaj ${item.serial_number||item.name}`,buffer:await buildExactMetrologyReport({...record,items:[item]})});
    else files.push({kind:'inspection_report',label:'Završni izvještaj',buffer:await buildExactMetrologyReport(record)});
    for(const [index,item] of record.items.entries()){
        files.push({kind:'inspection_certificate',label:`Certifikat inspekcije ${item.serial_number||item.name}`,buffer:await buildExactMetrologyForm({...record,document_number:`${record.case_number}-CI-${index+1}`,items:[item]},'inspection_certificate')});
        if(record.result==='passed'&&['amn','volumeter'].includes(record.service_type))files.push({kind:'verification_certificate',label:`Certifikat verifikacije ${item.serial_number||item.name}`,buffer:await buildExactMetrologyForm({...record,document_number:`${record.case_number}-CV-${index+1}`,items:[item]},'verification_certificate')});
    }
    files.push({kind:'result_details',label:'Svi rezultati, zaključci i korišteni etaloni',buffer:await resultDetailsPdf(record)});
    return files;
}
