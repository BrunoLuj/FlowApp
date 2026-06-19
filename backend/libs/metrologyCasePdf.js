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
const show = (value, fallback = "-") => value === null || value === undefined || value === "" ? fallback : String(value);
const date = (value) => value ? new Date(value).toLocaleDateString("hr-HR") : "-";
const documentTitles = {
    inspection_request: "ZAHTJEV ZA INSPEKCIJU",
    inspection_work_order: "RADNI NALOG ZA INSPEKCIJU",
    inspection_report: "IZVJEŠTAJ O REZULTATIMA INSPEKCIJE",
    inspection_certificate: "CERTIFIKAT O INSPEKCIJI",
    verification_certificate: "CERTIFIKAT O VERIFIKACIJI",
};

const ensure = (doc, height = 50) => {
    if (doc.y + height > doc.page.height - 55) doc.addPage();
};
const heading = (doc, value) => {
    ensure(doc, 42);
    doc.moveDown(0.7).font("Bold").fontSize(11).fillColor("#0f172a").text(value, 48, doc.y, { width: 500 });
    doc.moveDown(0.25).strokeColor("#4f46e5").lineWidth(1.5).moveTo(48, doc.y).lineTo(548, doc.y).stroke().moveDown(0.45);
};
const field = (doc, label, value) => {
    ensure(doc, 28);
    const y = doc.y;
    doc.rect(48, y, 500, 24).fill("#f8fafc");
    doc.font("Bold").fontSize(8).fillColor("#64748b").text(label, 56, y + 7, { width: 145 });
    doc.font("Regular").fontSize(8.5).fillColor("#0f172a").text(show(value), 205, y + 7, { width: 335 });
    doc.y = y + 28;
};
const table = (doc, headers, rows, widths) => {
    const header = () => {
        ensure(doc, 50);
        const y = doc.y;
        doc.rect(48, y, 500, 24).fill("#334155");
        let x = 48;
        headers.forEach((item, index) => {
            doc.font("Bold").fontSize(7).fillColor("#ffffff").text(item, x + 4, y + 7, { width: widths[index] - 8 });
            x += widths[index];
        });
        doc.y = y + 24;
    };
    header();
    rows.forEach((row, rowIndex) => {
        const heights = row.map((item, index) => doc.heightOfString(show(item), { width: widths[index] - 8 }));
        const height = Math.max(25, ...heights.map((item) => item + 10));
        if (doc.y + height > doc.page.height - 55) {
            doc.addPage();
            header();
        }
        const y = doc.y;
        if (rowIndex % 2 === 0) doc.rect(48, y, 500, height).fill("#f8fafc");
        let x = 48;
        row.forEach((item, index) => {
            doc.font("Regular").fontSize(7.5).fillColor("#0f172a").text(show(item), x + 4, y + 5, { width: widths[index] - 8 });
            x += widths[index];
        });
        doc.strokeColor("#e2e8f0").moveTo(48, y + height).lineTo(548, y + height).stroke();
        doc.y = y + height;
    });
};
const itemRows = (record) => record.items.map((item) => [
    item.apparatus_serial_number || item.tank_reference || item.name,
    item.serial_number,
    item.manufacturer,
    item.model || item.measurement_range || item.nominal_capacity,
    item.official_mark,
    item.status,
]);
const measurementRows = (record) => record.items.flatMap((item) =>
    item.measurements.map((measurement) => [
        item.serial_number || item.apparatus_serial_number || item.tank_reference,
        measurement.measurement_group,
        Object.entries(measurement.values || {}).map(([key, value]) => `${key}: ${value}`).join(" · "),
        measurement.passed === null ? "—" : measurement.passed ? "DA" : "NE",
    ])
);

export const buildMetrologyCasePdf = async (record, type, version) => {
    if (!documentTitles[type]) throw new Error("Unsupported metrology document");
    const rules = SERVICE_RULES[record.service_type];
    const doc = new PDFDocument({ size: "A4", bufferPages: true, margins: { top: 42, left: 48, right: 48, bottom: 48 } });
    const chunks = [];
    doc.registerFont("Regular", fonts.regular);
    doc.registerFont("Bold", fonts.bold);
    doc.on("data", (chunk) => chunks.push(chunk));
    const complete = new Promise((resolve, reject) => {
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);
    });
    doc.rect(0, 0, doc.page.width, 102).fill("#0f172a");
    doc.font("Bold").fontSize(18).fillColor("#ffffff").text(documentTitles[type], 48, 31, { width: 500 });
    doc.font("Regular").fontSize(9).fillColor("#c7d2fe")
        .text(`${record.case_number} · ${rules.label} · verzija ${version}`, 48, 62);
    doc.y = 118;
    heading(doc, "Podaci o naručitelju");
    field(doc, "Naručitelj", record.company_name);
    field(doc, "Adresa", record.client_address);
    field(doc, "ID / PDV broj", [record.idbroj, record.pdvbroj].filter(Boolean).join(" / "));
    field(doc, "Kontakt", `${show(record.requested_by_name || record.contact_person)} · ${show(record.contact_phone || record.client_phone)}`);

    heading(doc, "Podaci o inspekciji");
    field(doc, "Vrsta usluge", `Inspekcija: ${rules.label}`);
    field(doc, "Vrsta inspekcije", record.inspection_kind === "extraordinary" ? "Vanredna" : "Redovna");
    field(doc, "Broj zahtjeva / predmeta", record.case_number);
    field(doc, "Metoda / procedura", `${rules.method} / ${record.procedure_reference}`);
    field(doc, "Mjesto izvršenja", record.location_text || [record.station_name, record.station_address, record.station_city].filter(Boolean).join(", "));

    if (type === "inspection_request") {
        field(doc, "Datum zahtjeva", date(record.request_date));
        field(doc, "Opis predmetne usluge", record.request_description);
        field(doc, "Prilozi uz zahtjev", record.attachments_description);
    } else if (type === "inspection_work_order") {
        field(doc, "Početak", record.work_started_at ? new Date(record.work_started_at).toLocaleString("hr-HR") : "-");
        field(doc, "Završetak", record.work_finished_at ? new Date(record.work_finished_at).toLocaleString("hr-HR") : "-");
        field(doc, "Inspektori", record.inspectors.map((item) => `${item.firstname} ${item.lastname}`).join(", "));
    }

    heading(doc, record.service_type === "volumeter" ? "Aparati i volumetri" : "Mjerila");
    table(doc, ["Aparat / rezervoar", "Serijski broj", "Proizvođač", "Tip / opseg", "Službena oznaka", "Status"], itemRows(record), [105, 85, 85, 90, 75, 60]);
    if (record.service_type === "volumeter") {
        heading(doc, "Verifikacijske markice po aparatu");
        const apparatus = [...new Map(record.items.map((item) => [
            item.apparatus_serial_number,
            [item.apparatus_serial_number, item.verification_mark, item.seal_number],
        ])).values()];
        table(doc, ["Serijski broj aparata", "Oznaka verifikacijske markice", "Broj plombe"], apparatus, [180, 180, 140]);
    }
    if (record.service_type === "amn") {
        heading(doc, "Veza sonde i rezervoara");
        table(doc, ["Serijski broj sonde", "Rezervoar", "Gorivo", "Kontroler"], record.items.map((item) => [
            item.serial_number, item.tank_reference, item.fuel_type, item.apparatus_serial_number,
        ]), [140, 120, 100, 140]);
    }
    if (["inspection_report","inspection_certificate","verification_certificate"].includes(type)) {
        heading(doc, "Rezultati mjerenja");
        table(doc, ["Mjerilo", "Skupina", "Izmjerene vrijednosti", "Zadovoljava"], measurementRows(record), [110, 90, 230, 70]);
        heading(doc, "Korištena mjerna oprema");
        table(doc, ["Oprema", "Proizvođač", "Serijski broj", "Certifikat", "Vrijedi do"], record.standards.map((item) => [
            item.equipment_name,item.manufacturer,item.serial_number,item.calibration_certificate,date(item.valid_until),
        ]), [140, 100, 90, 95, 75]);
    }
    if (["inspection_certificate","verification_certificate"].includes(type)) {
        heading(doc, "Izjava i valjanost");
        field(doc, "Rezultat", record.result === "passed" ? "ZADOVOLJAVA" : "NE ZADOVOLJAVA");
        field(doc, "Izjava o usklađenosti", record.conformity_statement || `Mjerilo zadovoljava zahtjeve ${rules.standard}.`);
        field(doc, "Period verifikacije", `${record.verification_period_months} mjeseci`);
        field(doc, "Naredna verifikacija", date(record.next_verification_date));
        field(doc, "Datum inspekcije / odobravanja", `${date(record.inspection_date)} / ${date(record.approval_date)}`);
        field(doc, "Tehnički rukovoditelj", record.manager_name || record.approver_name);
    }
    if (type === "verification_certificate") {
        heading(doc, "Podaci certifikata o verifikaciji");
        field(doc, "Imenovana laboratorija", "Čaljkušić d.o.o.");
        field(doc, "Mjerilo predmet verifikacije", rules.label);
        field(doc, "Prilog – ispitni izvještaj", `${record.case_number}-INSPECTION-REPORT`);
        field(doc, "Napomena", "Certifikat nije važeći bez potpisa i pečata.");
    }
    const pages = doc.bufferedPageRange().count;
    for (let index = 0; index < pages; index += 1) {
        doc.switchToPage(index);
        doc.font("Regular").fontSize(7).fillColor("#64748b")
            .text(`FlowApp mjeriteljski centar · ${record.case_number}`, 48, doc.page.height - 42, { width: 320 });
        doc.text(`Stranica ${index + 1} / ${pages}`, 400, doc.page.height - 42, { width: 148, align: "right" });
    }
    doc.end();
    return complete;
};
