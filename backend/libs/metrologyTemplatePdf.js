import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { createRequire } from "module";

const require=createRequire(import.meta.url);
const here=path.dirname(fileURLToPath(import.meta.url));
const templateRoot=path.resolve(here,"../templates/metrology");
const fontsRoot=path.join(path.dirname(require.resolve("dejavu-fonts-ttf/package.json")),"ttf");
const templateNames={
    volumeter:"ZA-19.01.03-report.pdf",
    dipstick:"ZA-19.02.03-report.pdf",
    tank:"ZA-19.03.03-report.pdf",
    amn:"ZA-19.04.03-report.pdf",
};
const formTemplate=(serviceType,type)=>{
    if(type==="inspection_request")return "inspection-request.pdf";
    if(type==="verification_certificate")return "verification-certificate.pdf";
    const prefix={volumeter:"volumeter",dipstick:"dipstick",tank:"tank",amn:"amn"}[serviceType];
    if(type==="inspection_work_order")return `${prefix}-work-order.pdf`;
    if(type==="inspection_certificate")return `${prefix}-certificate.pdf`;
    return null;
};
const text=(page,font,value,x,y,size=7,options={})=>{
    if(value===null||value===undefined||value==="")return;
    page.drawText(String(value),{x,y,size,font,color:rgb(0,0,0),maxWidth:options.maxWidth,lineHeight:size+1});
};
const d=value=>value?new Date(value).toLocaleDateString("hr-HR"):"";
const group=(item,name)=>(item.measurements||[]).filter(row=>row.measurement_group===name);
const yesNo=(item,code)=>{
    const row=(item.checks||[]).find(check=>check.check_code===code);
    return row?.passed?"DA":"NE";
};
const commonFirstPage=(page,font,record,type)=>{
    text(page,font,record.case_number,145,487,7);
    text(page,font,record.company_name,230,410,8,{maxWidth:500});
    if(type!=="amn") text(page,font,record.items?.map(item=>item.serial_number).filter(Boolean).join(", "),230,330,7,{maxWidth:500});
    text(page,font,`${record.case_number} / ${d(record.request_date)}`,230,255,7,{maxWidth:500});
};
const overlayVolumeter=(pages,font,item)=>{
    const [page2,page3]=pages;
    const measurement=group(item,"flow_test")[0]?.values||{};
    text(page2,font,item.apparatus_serial_number,150,300,7);
    text(page2,font,item.serial_number,150,272,7);
    text(page2,font,item.fuel_type,72,164,6);
    text(page2,font,measurement.ambient_temperature,143,176,6);
    text(page2,font,measurement.fuel_temperature,143,153,6);
    [
        [measurement.qmin_l_min,203],[measurement.qmid_l_min,245],[measurement.qmax_l_min,287],
        [measurement.set_volume_l,329],[measurement.reference_qmin_l,374],
        [measurement.reference_qmid_l,413],[measurement.reference_qmax_l,452],
        [measurement.error_qmin_percent,493],[measurement.error_qmid_percent,530],
        [measurement.error_qmax_percent,567],
    ].forEach(([value,x])=>text(page2,font,value,x,153,5.5));
    [
        [yesNo(item,"flow"),628],[yesNo(item,"external"),672],
        [yesNo(item,"leak"),714],[yesNo(item,"display"),757],
    ].forEach(([value,x])=>text(page2,font,value,x,153,5.5));
    text(page3,font,item.fuel_type,73,445,6);
};
const overlayAmnBlock=(page,font,item,topY)=>{
    text(page,font,`${item.serial_number||""}${item.tank_reference?` / ${item.tank_reference}`:""}`,254,topY-31,5.2,{maxWidth:78});
    group(item,"comparison").slice(0,3).forEach((measurement,index)=>{
        const y=topY-index*31;
        text(page,font,measurement.values?.reference_mm,386,y,5.5);
        text(page,font,measurement.values?.amn_mm,430,y,5.5);
        text(page,font,measurement.values?.error_mm,475,y,5.5);
    });
    text(page,font,yesNo(item,"installation"),565,topY-31,5.5);
    text(page,font,yesNo(item,"labels"),616,topY-31,5.5);
    text(page,font,yesNo(item,"integrity"),665,topY-31,5.5);
};
const overlayTank=(pages,font,item)=>{
    const [page2,page3,page4,page5,page6]=pages;
    const setup=group(item,"tank_setup")[0]?.values||{};
    [
        [setup.fuel_type||item.fuel_type,155,340],[setup.nominal_capacity_l||item.nominal_capacity,155,315],
        [setup.fuel_before_l,155,290],[setup.fuel_after_l,155,265],
        [setup.height_before_mm,155,240],[setup.height_after_mm,155,215],
        [setup.tank_slope_1,430,215],[setup.tank_slope_2,675,215],
    ].forEach(([value,x,y])=>text(page2,font,value,x,y,6));
    group(item,"mobile_meter_check").slice(0,5).forEach((measurement,index)=>{
        const v=measurement.values||{};const y=335-index*32;
        [v.before_standard_l,v.before_meter_l,v.before_difference_l,v.after_standard_l,v.after_meter_l,v.after_difference_l]
            .forEach((value,column)=>text(page3,font,value,105+column*105,y,6));
    });
    text(page4,font,setup.dead_zone_l,90,112,6);
    group(item,"volumetric_fill").slice(0,12).forEach((measurement,index)=>{
        const v=measurement.values||{};const y=330-index*25;
        [v.nominal_fill_mass,v.total_fill_mass,v.partial_fill_mass,v.cumulative_standard_volume,
            v.height_mm,v.standard_fluid_temperature,v.tank_fluid_temperature,v.flow_l_min]
            .forEach((value,column)=>text(page5,font,value,93+column*74,y,5.5));
    });
    group(item,"volumetric_fill").slice(12,20).forEach((measurement,index)=>{
        const v=measurement.values||{};const y=440-index*25;
        [v.nominal_fill_mass,v.total_fill_mass,v.partial_fill_mass,v.cumulative_standard_volume,
            v.height_mm,v.standard_fluid_temperature,v.tank_fluid_temperature,v.flow_l_min]
            .forEach((value,column)=>text(page6,font,value,93+column*74,y,5.5));
    });
};
const overlayDipstick=(pages,font,item)=>{
    const [page2,page3,page4]=pages;
    const environment=group(item,"environment")[0]?.values||{};
    [
        [environment.start_temperature,306,292],[environment.start_humidity,390,292],
        [environment.end_temperature,592,292],[environment.end_humidity,676,292],
        [environment.tempering_minutes,306,267],[environment.standard_alpha,155,175],
        [environment.standard_length_mm,260,175],[environment.standard_temperature,365,175],
        [environment.measure_alpha,485,175],[environment.measure_length_mm,590,175],
        [environment.measure_temperature,695,175],
    ].forEach(([value,x,y])=>text(page2,font,value,x,y,6));
    [environment.temperature_1,environment.temperature_2,environment.temperature_3,environment.average_temperature]
        .forEach((value,index)=>text(page3,font,value,250+index*137,330,6));
    const points=group(item,"scale_point");
    points.slice(0,8).forEach((measurement,index)=>{
        const y=205-index*21;
        text(page3,font,measurement.values?.equipment_reading_mm,330,y,6);
        text(page3,font,measurement.values?.standard_reading_mm,540,y,6);
    });
    const e3=points.find(row=>row.values?.position==="E3");
    text(page4,font,e3?.values?.equipment_reading_mm,430,385,6);
    text(page4,font,e3?.values?.standard_reading_mm,620,385,6);
};

export const buildExactMetrologyReport=async(record)=>{
    const templateBytes=await fs.readFile(path.join(templateRoot,templateNames[record.service_type]));
    const source=await PDFDocument.load(templateBytes);
    const output=await PDFDocument.create();
    output.registerFontkit(fontkit);
    const fontBytes=await fs.readFile(path.join(fontsRoot,"DejaVuSans.ttf"));
    const font=await output.embedFont(fontBytes,{subset:true});
    const [firstRef]=await output.copyPages(source,[0]);
    output.addPage(firstRef);
    commonFirstPage(firstRef,font,record,record.service_type);

    if(record.service_type==="amn"){
        for(let batch=0;batch<record.items.length;batch+=6){
            const refs=await output.copyPages(source,[1,2,3]);
            refs.forEach(page=>output.addPage(page));
            const items=record.items.slice(batch,batch+6);
            items.slice(0,2).forEach((item,index)=>overlayAmnBlock(refs[0],font,item,291-index*89));
            items.slice(2,5).forEach((item,index)=>overlayAmnBlock(refs[1],font,item,455-index*125));
            if(items[5])overlayAmnBlock(refs[2],font,items[5],420);
        }
    } else {
        const pageIndexes={
            volumeter:[1,2],dipstick:[1,2,3,4],tank:[1,2,3,4,5],
        }[record.service_type];
        for(const item of record.items){
            const refs=await output.copyPages(source,pageIndexes);
            refs.forEach(page=>output.addPage(page));
            if(record.service_type==="volumeter")overlayVolumeter(refs,font,item);
            if(record.service_type==="dipstick")overlayDipstick(refs,font,item);
            if(record.service_type==="tank")overlayTank(refs,font,item);
        }
    }
    return Buffer.from(await output.save());
};

export const buildExactMetrologyForm=async(record,type)=>{
    const name=formTemplate(record.service_type,type);
    if(!name)throw new Error("Unsupported exact metrology form");
    const source=await PDFDocument.load(await fs.readFile(path.join(templateRoot,name)));
    const output=await PDFDocument.create();
    output.registerFontkit(fontkit);
    const font=await output.embedFont(await fs.readFile(path.join(fontsRoot,"DejaVuSans.ttf")),{subset:true});
    const refs=await output.copyPages(source,source.getPageIndices());
    refs.forEach(page=>output.addPage(page));
    const page=refs[0];
    const first=record.items?.[0]||{};
    if(type==="inspection_request"){
        text(page,font,record.case_number,110,710,7);
        text(page,font,record.company_name,200,625,8,{maxWidth:345});
        text(page,font,record.client_address,200,600,7,{maxWidth:345});
        text(page,font,[record.idbroj,record.pdvbroj].filter(Boolean).join(" / "),200,575,7);
        text(page,font,record.contact_phone||record.client_phone,200,550,7);
        text(page,font,record.request_description,45,300,7,{maxWidth:500});
    }else if(type==="inspection_work_order"){
        text(page,font,record.case_number,120,712,7);
        text(page,font,record.company_name,105,658,7,{maxWidth:445});
        text(page,font,record.client_address,105,635,7,{maxWidth:445});
        text(page,font,record.contact_phone||record.client_phone,105,612,7);
        text(page,font,record.case_number,105,565,7);
        text(page,font,record.inspection_kind==="extraordinary"?"Vanredna":"Redovna",105,523,7);
        text(page,font,record.work_started_at?new Date(record.work_started_at).toLocaleString("hr-HR"):"",105,480,7);
        text(page,font,record.work_finished_at?new Date(record.work_finished_at).toLocaleString("hr-HR"):"",105,458,7);
        record.items.slice(0,5).forEach((item,index)=>{
            const y=302-index*24;
            [item.name,item.manufacturer,item.official_mark,item.serial_number,item.measurement_range||item.nominal_capacity]
                .forEach((value,column)=>text(page,font,value,60+column*98,y,5.5,{maxWidth:90}));
        });
    }else if(type==="inspection_certificate"){
        text(page,font,record.case_number,105,712,7);
        text(page,font,record.company_name,130,660,7,{maxWidth:430});
        text(page,font,record.client_address,130,625,7,{maxWidth:430});
        text(page,font,first.serial_number,130,515,7,{maxWidth:150});
        text(page,font,record.case_number,130,480,7);
        text(page,font,`${record.case_number}-REPORT`,410,480,7);
        text(page,font,d(record.next_verification_date),410,290,7);
    }else if(type==="verification_certificate"){
        text(page,font,record.case_number,410,710,7);
        text(page,font,record.company_name,205,650,7,{maxWidth:355});
        text(page,font,record.rules?.label||record.service_type,205,620,7);
        text(page,font,first.official_mark,205,590,7);
        text(page,font,first.manufacturer,205,560,7);
        text(page,font,first.model,205,530,7);
        text(page,font,first.serial_number,205,500,7);
        text(page,font,`${record.case_number} / ${d(record.request_date)}`,205,470,7);
        text(page,font,record.location_text||record.station_name,205,440,7,{maxWidth:355});
        text(page,font,record.method_reference,205,345,7);
        text(page,font,`${record.case_number}-REPORT`,205,315,7);
        text(page,font,d(record.inspection_date),205,285,7);
        text(page,font,d(record.next_verification_date),205,255,7);
    }
    return Buffer.from(await output.save());
};
