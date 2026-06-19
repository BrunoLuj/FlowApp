import PDFDocument from "pdfkit";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const fontsRoot = path.join(path.dirname(require.resolve("dejavu-fonts-ttf/package.json")), "ttf");
const regular = path.join(fontsRoot, "DejaVuSans.ttf");
const bold = path.join(fontsRoot, "DejaVuSans-Bold.ttf");
const show = (value, fallback = "-") => value === null || value === undefined || value === "" ? fallback : String(value);
const formatDate = (value) => value ? new Date(value).toLocaleDateString("hr-HR") : "-";

const row = (doc, label, value) => {
    const y = doc.y;
    doc.rect(48, y, 500, 24).fill("#f8fafc");
    doc.font("Bold").fontSize(8).fillColor("#64748b").text(label, 56, y + 7, { width: 145 });
    doc.font("Regular").fontSize(9).fillColor("#0f172a").text(show(value), 205, y + 7, { width: 335 });
    doc.y = y + 28;
};

export const buildMetrologyCertificatePdf = async (inspection, version) => {
    const doc = new PDFDocument({ size: "A4", bufferPages: true, margins: { top: 42, left: 48, right: 48, bottom: 48 } });
    const chunks = [];
    doc.registerFont("Regular", regular);
    doc.registerFont("Bold", bold);
    doc.on("data", (chunk) => chunks.push(chunk));
    const complete = new Promise((resolve, reject) => {
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);
    });
    doc.rect(0, 0, doc.page.width, 105).fill("#0f172a");
    doc.font("Bold").fontSize(20).fillColor("#ffffff").text("MJERITELJSKI CERTIFIKAT", 48, 34);
    doc.font("Regular").fontSize(9).fillColor("#c7d2fe")
        .text(`${inspection.inspection_number} · verzija ${version}`, 48, 65);
    doc.font("Bold").fontSize(12).fillColor(inspection.result === "passed" ? "#34d399" : "#fb7185")
        .text(inspection.result === "passed" ? "ZADOVOLJAVA" : "NE ZADOVOLJAVA", 365, 48, { width: 183, align: "right" });
    doc.y = 122;
    row(doc, "Klijent", inspection.client_name);
    row(doc, "Benzinska stanica", [inspection.station_name, inspection.address, inspection.city].filter(Boolean).join(", "));
    row(doc, "Oprema", `${show(inspection.asset_code)} · ${show(inspection.asset_name)}`);
    row(doc, "Proizvođač / model", `${show(inspection.manufacturer)} / ${show(inspection.model)}`);
    row(doc, "Serijski broj", inspection.serial_number);
    row(doc, "Službena oznaka", inspection.official_mark);
    row(doc, "Vrsta pregleda", inspection.inspection_type);
    row(doc, "Norma / postupak", [inspection.standard_reference, inspection.procedure_reference].filter(Boolean).join(" · "));
    row(doc, "Datum pregleda", formatDate(inspection.inspected_at));
    row(doc, "Valjanost do", formatDate(inspection.next_due_date));
    row(doc, "Uvjeti okoliša", `${show(inspection.temperature)} °C · ${show(inspection.humidity)} % rH`);

    doc.moveDown(0.8).font("Bold").fontSize(11).fillColor("#0f172a").text("REZULTATI MJERENJA");
    doc.moveDown(0.4);
    const widths = [105,72,72,65,65,56,65];
    const headers = ["Točka","Referenca","Izmjereno","Pogreška","Tolerancija","Jedinica","Rezultat"];
    const drawHeader = () => {
        const y = doc.y;
        doc.rect(48,y,500,24).fill("#334155");
        let x=48;
        headers.forEach((header,index) => {
            doc.font("Bold").fontSize(7).fillColor("#ffffff").text(header,x+4,y+8,{width:widths[index]-8});
            x += widths[index];
        });
        doc.y=y+24;
    };
    drawHeader();
    for (const measurement of inspection.measurements || []) {
        if (doc.y > 745) { doc.addPage(); drawHeader(); }
        const y=doc.y;
        const values=[
            measurement.measurement_point,
            measurement.reference_value,
            measurement.measured_value,
            measurement.error_value,
            `${show(measurement.tolerance_min)} / ${show(measurement.tolerance_max)}`,
            measurement.unit,
            measurement.passed ? "DA" : "NE",
        ];
        let x=48;
        values.forEach((value,index) => {
            doc.font(index===6 ? "Bold" : "Regular").fontSize(7.5)
                .fillColor(index===6 ? (measurement.passed ? "#047857" : "#be123c") : "#0f172a")
                .text(show(value),x+4,y+7,{width:widths[index]-8});
            x += widths[index];
        });
        doc.strokeColor("#e2e8f0").moveTo(48,y+25).lineTo(548,y+25).stroke();
        doc.y=y+26;
    }
    doc.moveDown(0.8);
    row(doc, "Vizualne provjere", `Ugradnja: ${inspection.installation_check ? "DA" : "NE"} · Oznake: ${inspection.label_check ? "DA" : "NE"} · Integritet: ${inspection.integrity_check ? "DA" : "NE"}`);
    row(doc, "Mjeritelj", inspection.inspector_name);
    row(doc, "Odobrio", inspection.approved_by_name);
    row(doc, "Napomena", inspection.notes);
    const pages=doc.bufferedPageRange().count;
    for(let index=0;index<pages;index+=1){
        doc.switchToPage(index);
        doc.font("Regular").fontSize(7).fillColor("#64748b")
            .text(`FlowApp · ${inspection.inspection_number}`,48,doc.page.height-42,{width:300});
        doc.text(`Stranica ${index+1} / ${pages}`,400,doc.page.height-42,{width:148,align:"right"});
    }
    doc.end();
    return complete;
};
