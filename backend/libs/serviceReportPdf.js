import PDFDocument from "pdfkit";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const fontsRoot = path.join(path.dirname(require.resolve("dejavu-fonts-ttf/package.json")), "ttf");
const fonts = {
    regular: path.join(fontsRoot, "DejaVuSans.ttf"),
    bold: path.join(fontsRoot, "DejaVuSans-Bold.ttf"),
};

const colors = {
    dark: "#0f172a",
    indigo: "#4f46e5",
    slate: "#64748b",
    line: "#e2e8f0",
    light: "#f8fafc",
    green: "#059669",
};

const text = (value, fallback = "-") => {
    if (value === null || value === undefined || value === "") return fallback;
    return String(value);
};

const dateTime = (value) => value
    ? new Intl.DateTimeFormat("hr-HR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Europe/Zagreb",
    }).format(new Date(value))
    : "-";

const ensureSpace = (doc, height = 60) => {
    if (doc.y + height > doc.page.height - 55) doc.addPage();
};

const sectionTitle = (doc, title) => {
    ensureSpace(doc, 45);
    doc.x = 50;
    doc.moveDown(0.6);
    const y = doc.y;
    doc.font("FlowBold")
        .fontSize(11)
        .fillColor(colors.dark)
        .text(title.toUpperCase(), 50, y, { width: 495, align: "left" });
    doc.moveDown(0.25)
        .strokeColor(colors.indigo)
        .lineWidth(2)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke()
        .moveDown(0.6);
};

const keyValue = (doc, label, value) => {
    ensureSpace(doc, 28);
    const y = doc.y;
    doc.rect(50, y, 495, 24).fill(colors.light);
    doc.font("FlowBold").fontSize(8.5).fillColor(colors.slate).text(label, 58, y + 7, { width: 125 });
    doc.font("FlowRegular").fontSize(9).fillColor(colors.dark).text(text(value), 185, y + 7, { width: 350 });
    doc.y = y + 28;
};

const table = (doc, headers, rows, widths) => {
    const drawHeader = () => {
        ensureSpace(doc, 48);
        const y = doc.y;
        doc.rect(50, y, widths.reduce((sum, width) => sum + width, 0), 24).fill(colors.dark);
        let x = 50;
        headers.forEach((header, index) => {
            doc.font("FlowBold").fontSize(8).fillColor("#ffffff")
                .text(header, x + 5, y + 7, { width: widths[index] - 10 });
            x += widths[index];
        });
        doc.y = y + 24;
    };
    drawHeader();
    rows.forEach((row, rowIndex) => {
        const heights = row.map((cell, index) =>
            doc.heightOfString(text(cell), { width: widths[index] - 10, fontSize: 8.5 })
        );
        const height = Math.max(25, ...heights.map((value) => value + 12));
        if (doc.y + height > doc.page.height - 55) {
            doc.addPage();
            drawHeader();
        }
        const y = doc.y;
        if (rowIndex % 2 === 0) doc.rect(50, y, widths.reduce((sum, width) => sum + width, 0), height).fill(colors.light);
        let x = 50;
        row.forEach((cell, index) => {
            doc.font("FlowRegular").fontSize(8.5).fillColor(colors.dark)
                .text(text(cell), x + 5, y + 6, { width: widths[index] - 10 });
            x += widths[index];
        });
        doc.strokeColor(colors.line).lineWidth(0.5).moveTo(50, y + height).lineTo(545, y + height).stroke();
        doc.y = y + height;
    });
};

const addSignature = (doc, order) => {
    sectionTitle(doc, "Potvrda klijenta");
    if (order.customer_signature_data?.startsWith("data:image/")) {
        try {
            const base64 = order.customer_signature_data.split(",")[1];
            const image = Buffer.from(base64, "base64");
            ensureSpace(doc, 95);
            doc.image(image, 50, doc.y, { fit: [210, 75] });
            doc.y += 80;
        } catch {
            doc.font("FlowRegular").fontSize(9).fillColor(colors.slate).text("Potpis nije moguće prikazati.");
        }
    } else {
        doc.font("FlowRegular").fontSize(9).fillColor(colors.slate)
            .text("Potpis nije evidentiran.", 50, doc.y, { width: 495 });
    }
    doc.moveDown(0.4).font("FlowBold").fillColor(colors.dark)
        .text(`Potvrdio/la: ${text(order.customer_signature_name)}`, 50, doc.y, { width: 495 });
    doc.font("FlowRegular").fontSize(8).fillColor(colors.slate)
        .text(`Vrijeme potpisa: ${dateTime(order.customer_signed_at)}`, 50, doc.y, { width: 495 });
};

export const buildServiceReportPdf = async (order, version) => {
    const doc = new PDFDocument({
        size: "A4",
        bufferPages: true,
        margins: { top: 42, right: 50, bottom: 48, left: 50 },
        info: {
            Title: `Servisni zapisnik ${order.work_order_number || order.id}`,
            Author: "FlowApp",
            Subject: "Servisni zapisnik radnog naloga",
        },
    });
    const chunks = [];
    doc.registerFont("FlowRegular", fonts.regular);
    doc.registerFont("FlowBold", fonts.bold);
    doc.on("data", (chunk) => chunks.push(chunk));
    const complete = new Promise((resolve, reject) => {
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);
    });

    doc.rect(0, 0, doc.page.width, 92).fill(colors.dark);
    doc.font("FlowBold").fontSize(21).fillColor("#ffffff").text("SERVISNI ZAPISNIK", 50, 34);
    doc.font("FlowRegular").fontSize(9).fillColor("#c7d2fe")
        .text(`${text(order.work_order_number, `WO-${order.id}`)} · verzija ${version}`, 50, 63);
    doc.fillColor("#ffffff").text(new Intl.DateTimeFormat("hr-HR", {
        dateStyle: "long",
        timeZone: "Europe/Zagreb",
    }).format(new Date()), 350, 48, { width: 195, align: "right" });
    doc.x = 50;
    doc.y = 110;

    sectionTitle(doc, "Osnovni podaci");
    keyValue(doc, "Klijent", order.client_name);
    keyValue(doc, "Benzinska stanica", [order.station_name, order.address, order.city].filter(Boolean).join(", "));
    keyValue(doc, "Oprema", order.asset_name);
    keyValue(doc, "Vrsta / naslov", `${text(order.type)} / ${text(order.title)}`);
    keyValue(doc, "Status", order.status);
    keyValue(doc, "Dodijeljeni serviseri", order.assigned_users?.map((user) => `${user.firstname} ${user.lastname}`).join(", "));

    sectionTitle(doc, "Terenski podaci");
    keyValue(doc, "Dolazak / odlazak", `${dateTime(order.arrival_at)} / ${dateTime(order.departure_at)}`);
    keyValue(doc, "Kilometraža", `${text(order.odometer_start)} – ${text(order.odometer_end)} km`);
    keyValue(doc, "Udaljenost / vrijeme puta", `${text(order.travel_distance_km)} km / ${text(order.travel_time_minutes, "0")} min`);

    sectionTitle(doc, "Checklista");
    table(doc, ["Stavka", "Status"], (order.checklist?.length
        ? order.checklist.map((item) => [item.label, item.completed ? "Izvršeno" : "Nije izvršeno"])
        : [["Nema stavki", "-"]]), [390, 105]);

    sectionTitle(doc, "Izvršeni rad");
    table(doc, ["Opis", "Serviser", "Trajanje"], (order.activities?.length
        ? order.activities.map((item) => [item.description, item.user_name, `${item.duration_minutes || 0} min`])
        : [["Nema evidentiranih aktivnosti", "-", "-"]]), [295, 125, 75]);

    sectionTitle(doc, "Utrošeni materijal");
    table(doc, ["Materijal", "Količina", "Serijski broj"], (order.materials?.length
        ? order.materials.map((item) => [item.item_name, `${item.quantity} ${item.unit}`, item.serial_number])
        : [["Nema utrošenog materijala", "-", "-"]]), [300, 95, 100]);

    sectionTitle(doc, "Napomene");
    doc.font("FlowRegular").fontSize(9).fillColor(colors.dark)
        .text([order.field_notes, order.completion_notes].filter(Boolean).join("\n\n") || "Nema napomena.", 50, doc.y, {
            width: 495,
            lineGap: 3,
        });

    addSignature(doc, order);

    const pageCount = doc.bufferedPageRange().count;
    for (let index = 0; index < pageCount; index += 1) {
        doc.switchToPage(index);
        doc.font("FlowRegular").fontSize(7).fillColor(colors.slate)
            .text(`Automatski generirao FlowApp · nalog ${order.id}`, 50, doc.page.height - 58, {
                width: 300,
                lineBreak: false,
            });
        doc.font("FlowRegular").fontSize(7).fillColor(colors.slate)
            .text(`Stranica ${index + 1} / ${pageCount}`, 350, doc.page.height - 58, {
                width: 195,
                align: "right",
                lineBreak: false,
            });
    }
    doc.end();
    return complete;
};
