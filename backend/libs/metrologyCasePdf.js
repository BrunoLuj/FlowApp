import PDFDocument from "pdfkit";
import path from "path";
import { createRequire } from "module";
import { SERVICE_RULES } from "../models/metrologyCaseModel.js";

const require = createRequire(import.meta.url);
const fontsRoot = path.join(path.dirname(require.resolve("dejavu-fonts-ttf/package.json")), "ttf");
const fonts = {
    regular: path.join(fontsRoot, "DejaVuSans.ttf"),
    bold: path.join(fontsRoot, "DejaVuSans-Bold.ttf"),
};
const show = (value, fallback = "-") =>
    value === null || value === undefined || value === "" ? fallback : String(value);
const date = (value) => value ? new Date(value).toLocaleDateString("hr-HR") : "-";
const titles = {
    inspection_request: "ZAHTJEV ZA INSPEKCIJU",
    inspection_work_order: "RADNI NALOG ZA INSPEKCIJU",
    inspection_report: "IZVJEŠTAJ O REZULTATIMA INSPEKCIJE",
    inspection_certificate: "CERTIFIKAT O INSPEKCIJI",
    verification_certificate: "CERTIFIKAT O VERIFIKACIJI",
};
const groups = (item, name) =>
    (item.measurements || []).filter((measurement) => measurement.measurement_group === name);
const check = (item, code) => {
    const result = (item.checks || []).find((entry) => entry.check_code === code);
    return result?.passed === null || result?.passed === undefined ? "-" : result.passed ? "DA" : "NE";
};
const ensure = (doc, height = 50) => {
    if (doc.y + height > doc.page.height - 55) {
        doc.addPage();
        doc._metrologyHeader?.();
    }
};
const heading = (doc, value) => {
    ensure(doc, 36);
    doc.moveDown(0.45).font("Bold").fontSize(9).fillColor("#111827")
        .text(value, 48, doc.y, { width: doc.page.width - 96 });
    doc.moveDown(0.2).strokeColor("#111827").lineWidth(0.7)
        .moveTo(48, doc.y).lineTo(doc.page.width - 48, doc.y).stroke().moveDown(0.35);
};
const field = (doc, label, value) => {
    const width = doc.page.width - 96;
    ensure(doc, 25);
    const y = doc.y;
    doc.rect(48, y, width, 23).strokeColor("#cbd5e1").stroke();
    doc.font("Bold").fontSize(7.2).fillColor("#111827").text(label, 54, y + 6, { width: 145 });
    doc.font("Regular").fontSize(7.5).text(show(value), 202, y + 6, { width: width - 160 });
    doc.y = y + 23;
};
const table = (doc, headers, rows, widths, fontSize = 6.4) => {
    const total = widths.reduce((sum, width) => sum + width, 0);
    const x0 = 48;
    const renderHeader = () => {
        ensure(doc, 42);
        const y = doc.y;
        doc.rect(x0, y, total, 24).fillAndStroke("#d1d5db", "#111827");
        let x = x0;
        headers.forEach((header, index) => {
            doc.font("Bold").fontSize(Math.min(fontSize, 6.5)).fillColor("#111827")
                .text(header, x + 2, y + 4, { width: widths[index] - 4, align: "center" });
            doc.rect(x, y, widths[index], 24).stroke();
            x += widths[index];
        });
        doc.y = y + 24;
    };
    renderHeader();
    rows.forEach((row) => {
        const heights = row.map((value, index) =>
            doc.heightOfString(show(value), { width: widths[index] - 5 }));
        const height = Math.max(21, ...heights.map((value) => value + 7));
        if (doc.y + height > doc.page.height - 55) {
            doc.addPage();
            doc._metrologyHeader?.();
            renderHeader();
        }
        const y = doc.y;
        let x = x0;
        row.forEach((value, index) => {
            doc.rect(x, y, widths[index], height).strokeColor("#111827").stroke();
            doc.font("Regular").fontSize(fontSize).fillColor("#111827")
                .text(show(value), x + 2.5, y + 3.5, {
                    width: widths[index] - 5, align: index === 0 ? "left" : "center",
                });
            x += widths[index];
        });
        doc.y = y + height;
    });
};
const officialHeader = (doc, title, code, record, version) => {
    const width = doc.page.width - 96;
    doc.lineWidth(0.8).strokeColor("#111827").rect(48, 28, width, 72).stroke();
    doc.moveTo(193, 28).lineTo(193, 100).stroke();
    doc.moveTo(48 + width - 118, 28).lineTo(48 + width - 118, 100).stroke();
    doc.moveTo(48 + width - 118, 64).lineTo(48 + width, 64).stroke();
    doc.font("Bold").fontSize(15).fillColor("#dc2626").text("ČALJKUŠIĆ", 62, 54, { width: 115 });
    doc.font("Bold").fontSize(10).fillColor("#111827").text(title, 203, 51, {
        width: width - 283, align: "center",
    });
    doc.fontSize(6.7).text("Oznaka dokumenta:", 48 + width - 112, 43, {
        width: 106, align: "center",
    });
    doc.fontSize(8.5).text(code, 48 + width - 112, 76, { width: 106, align: "center" });
    doc.fontSize(7.2).text(`Broj dokumenta: ${record.case_number} / v${version}`, 54, 108, {
        width: width * 0.58,
    });
    doc.text("Imenovana laboratorija: Čaljkušić d.o.o.", 48 + width * 0.55, 108, {
        width: width * 0.45, align: "right",
    });
    doc.y = 130;
};
const itemRows = (record) => record.items.map((item) => [
    item.name,item.manufacturer,item.model,item.serial_number,item.official_mark,
    item.apparatus_serial_number || item.tank_reference || item.measurement_range || item.nominal_capacity,
]);
const genericMeasurements = (record) => record.items.flatMap((item) =>
    item.measurements.map((measurement) => [
        item.serial_number || item.apparatus_serial_number || item.tank_reference,
        measurement.measurement_group,
        Object.entries(measurement.values || {}).map(([key,value]) => `${key}: ${value}`).join(" · "),
        measurement.passed === null ? "-" : measurement.passed ? "DA" : "NE",
    ])
);

const renderAmn = (doc, record) => table(doc,
    ["Proizvođač","Tip","Službena oznaka","Serijski broj / rezervoar","R.br.","Etalon mm","AMN mm","Greška mm","GDG mm","Ugradnja","Oznake","Integritet","Status"],
    record.items.flatMap((item) => groups(item,"comparison").map((measurement,index) => [
        index ? "" : item.manufacturer,index ? "" : item.model,index ? "" : item.official_mark,
        index ? "" : `${show(item.serial_number)} / ${show(item.tank_reference)}`,index + 1,
        measurement.values?.reference_mm,measurement.values?.amn_mm,measurement.values?.error_mm,
        measurement.values?.gdg_mm || 4,index ? "" : check(item,"installation"),
        index ? "" : check(item,"labels"),index ? "" : check(item,"integrity"),
        measurement.passed ? "DA" : "NE",
    ])),[55,55,55,78,30,55,55,48,42,48,42,48,49],5.2);

const renderVolumeters = (doc, record) => {
    for (const item of record.items) {
        heading(doc, `Aparat ${show(item.apparatus_serial_number)} · volumetar ${show(item.serial_number)}`);
        field(doc,"Gorivo / službena oznaka",`${show(item.fuel_type)} / ${show(item.official_mark)}`);
        table(doc,["T ok.","T gor.","Qmin","Qsr","Qmax","V1","V2 Qmin","V2 Qsr","V2 Qmax","z Qmin %","z Qsr %","z Qmax %"],
            groups(item,"flow_test").map((measurement) => {
                const value=measurement.values || {};
                return [value.ambient_temperature,value.fuel_temperature,value.qmin_l_min,value.qmid_l_min,
                    value.qmax_l_min,value.set_volume_l,value.reference_qmin_l,value.reference_qmid_l,
                    value.reference_qmax_l,value.error_qmin_percent,value.error_qmid_percent,value.error_qmax_percent];
            }),[48,48,45,45,45,45,60,60,60,60,60,60],5.4);
        table(doc,["Provjera protoka","Spoljašnji pregled","Provjera curenja","Pokazivač zapremine"],
            [[check(item,"flow"),check(item,"external"),check(item,"leak"),check(item,"display")]],
            [185,185,185,185],6.2);
    }
};
const renderTank = (doc, record) => {
    for (const item of record.items) {
        const setup=groups(item,"tank_setup")[0]?.values || {};
        heading(doc,`Rezervoar ${show(item.serial_number || item.name)}`);
        table(doc,["Gorivo","Nazivna zap.","Stanje prije","Stanje poslije","Visina prije","Visina poslije","Nagib 1","Nagib 2","Mrtva zona"],
            [[setup.fuel_type || item.fuel_type,setup.nominal_capacity_l || item.nominal_capacity,
                setup.fuel_before_l,setup.fuel_after_l,setup.height_before_mm,setup.height_after_mm,
                setup.tank_slope_1,setup.tank_slope_2,setup.dead_zone_l]],
            [82,82,82,82,82,82,82,82,84],5.7);
        heading(doc,"Provjera pokretnog volumetra");
        table(doc,["R.br.","Prije etalon","Prije volumetar","Razlika","Poslije etalon","Poslije volumetar","Razlika"],
            groups(item,"mobile_meter_check").map((measurement,index) => {
                const value=measurement.values || {};
                return [index+1,value.before_standard_l,value.before_meter_l,value.before_difference_l,
                    value.after_standard_l,value.after_meter_l,value.after_difference_l];
            }),[50,115,115,90,125,125,120],6);
        heading(doc,"Rezultati mjerenja");
        table(doc,["Br.","Nazivna masa","Ukupna masa","Parcijalna masa","Kumulativno etalon","Visina mm","T etalon °C","T rezervoar °C","Protok l/min"],
            groups(item,"volumetric_fill").map((measurement,index) => {
                const value=measurement.values || {};
                return [index+1,value.nominal_fill_mass,value.total_fill_mass,value.partial_fill_mass,
                    value.cumulative_standard_volume,value.height_mm,value.standard_fluid_temperature,
                    value.tank_fluid_temperature,value.flow_l_min];
            }),[38,80,80,80,100,72,90,100,100],5.7);
    }
};
const renderDipstick = (doc, record) => {
    for (const item of record.items) {
        const environment=groups(item,"environment")[0]?.values || {};
        heading(doc,`Mjerna letva ${show(item.serial_number)}`);
        table(doc,["Poč. T","Poč. rH","Kraj T","Kraj rH","Temperiranje","αE","LE","TE","αM","LM","TM","β"],
            [[environment.start_temperature,environment.start_humidity,environment.end_temperature,
                environment.end_humidity,environment.tempering_minutes,environment.standard_alpha,
                environment.standard_length_mm,environment.standard_temperature,environment.measure_alpha,
                environment.measure_length_mm,environment.measure_temperature,environment.beta_mm]],
            [61,61,61,61,70,55,60,55,55,60,55,55],5.5);
        table(doc,["T1 °C","T2 °C","T3 °C","Prosječna temperatura Tsr °C"],
            [[environment.temperature_1,environment.temperature_2,environment.temperature_3,
                environment.average_temperature]],[150,150,150,290],6);
        heading(doc,"Točke mjerenja i ispitivanje linearnosti");
        table(doc,["Pozicija","Očitanje mjerila a","Očitanje etalona b","Greška α","Korekcija γ","Ukupna greška ε","±MPE","DA/NE"],
            groups(item,"scale_point").map((measurement) => {
                const value=measurement.values || {};
                return [value.position,value.equipment_reading_mm,value.standard_reading_mm,value.error_mm,
                    value.temperature_correction_mm,value.total_error_mm,value.mpe_mm,measurement.passed ? "DA" : "NE"];
            }),[60,115,115,90,90,105,80,85],5.8);
    }
};
const renderServiceReport = (doc, record) => {
    if (record.service_type === "amn") renderAmn(doc,record);
    if (record.service_type === "volumeter") renderVolumeters(doc,record);
    if (record.service_type === "tank") renderTank(doc,record);
    if (record.service_type === "dipstick") renderDipstick(doc,record);
};

export const buildMetrologyCasePdf = async (record,type,version) => {
    if (!titles[type]) throw new Error("Unsupported metrology document");
    const rules=SERVICE_RULES[record.service_type];
    const landscape=type === "inspection_report";
    const doc=new PDFDocument({
        size:"A4",layout:landscape ? "landscape" : "portrait",bufferPages:true,
        margins:{top:42,left:48,right:48,bottom:48},
    });
    const chunks=[];
    doc.registerFont("Regular",fonts.regular);
    doc.registerFont("Bold",fonts.bold);
    doc.on("data",(chunk)=>chunks.push(chunk));
    const complete=new Promise((resolve,reject)=>{
        doc.on("end",()=>resolve(Buffer.concat(chunks)));
        doc.on("error",reject);
    });
    const suffix=type === "inspection_request" ? "01" : type === "inspection_work_order" ? "02" : "03";
    doc._metrologyHeader=()=>officialHeader(doc,titles[type],`${rules.documentCode}/${suffix}`,record,version);
    officialHeader(doc,titles[type],`${rules.documentCode}/${suffix}`,record,version);

    heading(doc,"Podaci o naručitelju i inspekciji");
    field(doc,"Naručitelj",record.company_name);
    field(doc,"Adresa",record.client_address);
    field(doc,"ID / PDV broj",[record.idbroj,record.pdvbroj].filter(Boolean).join(" / "));
    field(doc,"Kontakt",`${show(record.requested_by_name || record.contact_person)} · ${show(record.contact_phone || record.client_phone)}`);
    field(doc,"Vrsta usluge",`Inspekcija: ${rules.label}`);
    field(doc,"Vrsta inspekcije",record.inspection_kind === "extraordinary" ? "Vanredna" : "Redovna");
    field(doc,"Broj zahtjeva",record.case_number);
    field(doc,"Metoda / procedura",`${rules.method} / ${record.procedure_reference}`);
    field(doc,"Mjesto izvršenja",record.location_text || [record.station_name,record.station_address,record.station_city].filter(Boolean).join(", "));

    if (type === "inspection_request") {
        field(doc,"Datum zahtjeva",date(record.request_date));
        field(doc,"Opis predmetne usluge",record.request_description);
        field(doc,"Prilozi uz zahtjev",record.attachments_description);
    }
    if (type === "inspection_work_order") {
        field(doc,"Početak",record.work_started_at ? new Date(record.work_started_at).toLocaleString("hr-HR") : "-");
        field(doc,"Završetak",record.work_finished_at ? new Date(record.work_finished_at).toLocaleString("hr-HR") : "-");
        field(doc,"Inspektori",record.inspectors.map((item)=>`${item.firstname} ${item.lastname}`).join(", "));
    }

    heading(doc,record.service_type === "volumeter" ? "Aparati i volumetri" : "Mjerila");
    const itemWidth=landscape ? [120,120,120,120,100,160] : [85,85,85,85,75,85];
    table(doc,["Naziv","Proizvođač","Tip","Serijski broj","Službena oznaka","Aparat / rezervoar / opseg"],
        itemRows(record),itemWidth,6.2);

    if (type === "inspection_report") {
        heading(doc,"Rezultati mjerenja");
        renderServiceReport(doc,record);
    }
    if (["inspection_certificate","verification_certificate"].includes(type)) {
        heading(doc,"Rezultati inspekcije");
        table(doc,["Mjerilo","Skupina","Izmjerene vrijednosti","Zadovoljava"],
            genericMeasurements(record),[110,90,230,70],6);
    }
    if (["inspection_report","inspection_certificate","verification_certificate"].includes(type)) {
        heading(doc,"Korištena mjerna oprema");
        const widths=landscape ? [180,150,130,150,130] : [140,100,90,95,75];
        table(doc,["Oprema","Proizvođač","Serijski broj","Certifikat","Vrijedi do"],
            record.standards.map((item)=>[
                item.equipment_name,item.manufacturer,item.serial_number,
                item.calibration_certificate,date(item.valid_until),
            ]),widths,6);
    }
    if (["inspection_certificate","verification_certificate"].includes(type)) {
        heading(doc,"Izjava o usklađenosti i valjanost");
        field(doc,"Rezultat",record.result === "passed" ? "ZADOVOLJAVA" : "NE ZADOVOLJAVA");
        field(doc,"Metode izvođenja postupka",`${rules.method}; ${rules.standard}; ${record.procedure_reference}`);
        field(doc,"Izjava o usklađenosti",record.conformity_statement || `Mjerilo zadovoljava tehničke zahtjeve: ${rules.standard}.`);
        field(doc,"Period verifikacije",`${record.verification_period_months} mjeseci`);
        field(doc,"Naredna verifikacija",date(record.next_verification_date));
        field(doc,"Datum inspekcije / odobravanja",`${date(record.inspection_date)} / ${date(record.approval_date)}`);
        field(doc,"Odobrio / tehnički rukovoditelj",record.manager_name || record.approver_name);
    }
    if (type === "verification_certificate") {
        heading(doc,"Podaci certifikata o verifikaciji");
        field(doc,"Vlasnik",record.company_name);
        field(doc,"Mjerilo predmet verifikacije",rules.label);
        field(doc,"Broj i datum prijema zahtjeva",`${record.case_number} / ${date(record.request_date)}`);
        field(doc,"Prilog - ispitni izvještaj",`${record.case_number}-INSPECTION-REPORT`);
        field(doc,"Napomena","Ovaj certifikat o verifikaciji nije važeći ukoliko je bez potpisa i pečata.");
    }
    heading(doc,"Potpisi");
    table(doc,["Mjeritelj","Tehnički rukovoditelj","M.P.","Datum izdavanja"],
        [[record.inspectors.map((item)=>`${item.firstname} ${item.lastname}`).join(", "),
            record.manager_name || record.approver_name,"",date(new Date())]],
        landscape ? [230,230,120,160] : [145,145,90,120],6.3);

    const pages=doc.bufferedPageRange().count;
    for (let index=0;index<pages;index+=1) {
        doc.switchToPage(index);
        const bottomMargin=doc.page.margins.bottom;
        doc.page.margins.bottom=0;
        doc.font("Regular").fontSize(6.5).fillColor("#374151")
            .text(`${rules.documentCode} · ${record.case_number}`,48,doc.page.height-34,{width:260,lineBreak:false});
        doc.text(`Stranica ${index+1} / ${pages}`,doc.page.width-180,doc.page.height-34,{
            width:132,align:"right",lineBreak:false,
        });
        doc.page.margins.bottom=bottomMargin;
    }
    doc.end();
    return complete;
};
