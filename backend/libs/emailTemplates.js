const escapeHtml = (value = "") => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const layout = (title, content, actionUrl, actionLabel = "Otvori FlowApp") => `
<!doctype html>
<html lang="hr"><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a">
<div style="max-width:640px;margin:0 auto;padding:24px">
  <div style="background:#0f172a;color:white;padding:24px;border-radius:16px 16px 0 0">
    <div style="font-size:12px;color:#a5b4fc;font-weight:bold;letter-spacing:1px">FLOWAPP SERVISNI CENTAR</div>
    <h1 style="margin:8px 0 0;font-size:24px">${escapeHtml(title)}</h1>
  </div>
  <div style="background:white;padding:24px;border-radius:0 0 16px 16px">
    ${content}
    ${actionUrl ? `<p style="margin-top:24px"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#4f46e5;color:white;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:bold">${escapeHtml(actionLabel)}</a></p>` : ""}
    <p style="margin-top:28px;color:#64748b;font-size:12px">Automatska poruka sustava FlowApp.</p>
  </div>
</div></body></html>`;

const row = (label, value) => `<tr><td style="padding:7px 12px;color:#64748b">${escapeHtml(label)}</td><td style="padding:7px 12px;font-weight:bold">${escapeHtml(value || "-")}</td></tr>`;

export const renderEmailTemplate = (eventType, data, appUrl) => {
    const url = `${appUrl}${data.target_url || ""}`;
    const templates = {
        service_request_created: {
            subject: `Zaprimljen servisni zahtjev ${data.request_number}`,
            title: "Servisni zahtjev je zaprimljen",
            content: `<p>Poštovani, zaprimili smo vaš servisni zahtjev.</p><table style="width:100%;background:#f8fafc;border-radius:10px">${row("Broj", data.request_number)}${row("Naslov", data.subject)}${row("Prioritet", data.priority)}${row("Stanica", data.station_name)}</table>`,
        },
        work_order_assigned: {
            subject: `Dodijeljen radni nalog ${data.work_order_number}`,
            title: "Dodijeljen vam je radni nalog",
            content: `<table style="width:100%;background:#f8fafc;border-radius:10px">${row("Nalog", data.work_order_number)}${row("Naslov", data.title)}${row("Klijent", data.client_name)}${row("Stanica", data.station_name)}${row("Termin", data.scheduled_at)}</table>`,
        },
        work_order_reminder: {
            subject: `Podsjetnik: ${data.work_order_number} je uskoro`,
            title: "Podsjetnik na planiranu intervenciju",
            content: `<p>Intervencija je planirana unutar sljedeća 24 sata.</p><table style="width:100%;background:#f8fafc;border-radius:10px">${row("Nalog", data.work_order_number)}${row("Naslov", data.title)}${row("Termin", data.scheduled_at)}${row("Adresa", data.address)}</table>`,
        },
        sla_escalation: {
            subject: `SLA eskalacija E${data.escalation_level}: ${data.request_number}`,
            title: "SLA zahtijeva hitnu reakciju",
            content: `<table style="width:100%;background:#fef2f2;border-radius:10px">${row("Zahtjev", data.request_number)}${row("Naslov", data.subject)}${row("Klijent", data.client_name)}${row("Eskalacija", `E${data.escalation_level}`)}${row("Rok", data.due_at)}</table>`,
        },
        service_report_generated: {
            subject: `Servisni zapisnik ${data.work_order_number}`,
            title: "Servisni zapisnik je dostupan",
            content: `<p>Servisni zapisnik za izvršeni rad je generiran i dostupan za preuzimanje.</p><table style="width:100%;background:#f8fafc;border-radius:10px">${row("Nalog", data.work_order_number)}${row("Stanica", data.station_name)}${row("Verzija", String(data.version))}</table>`,
        },
        deadline_reminder: {
            subject: `Podsjetnik na rok: ${data.title}`,
            title: "Dokument ili ovjera uskoro istječe",
            content: `<table style="width:100%;background:#fffbeb;border-radius:10px">${row("Rok", data.title)}${row("Klijent", data.client_name)}${row("Stanica", data.station_name)}${row("Datum isteka", data.due_date)}${row("Preostalo dana", String(data.days_remaining))}</table>`,
        },
    };
    const template = templates[eventType];
    if (!template) throw new Error(`Unknown email event type: ${eventType}`);
    return {
        subject: template.subject,
        html: layout(template.title, template.content, url),
        text: `${template.title}\n\n${Object.values(data).filter((value) => typeof value !== "object").join("\n")}`,
    };
};
