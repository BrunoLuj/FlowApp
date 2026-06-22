import React, { useCallback, useEffect, useState } from "react";
import {
  FaCheckCircle, FaEnvelope, FaExclamationTriangle,
  FaPaperPlane, FaRedo, FaSave,
} from "react-icons/fa";
import { toast } from "sonner";
import useStore from "../store";
import {
  getEmailCenter,
  processEmailQueue,
  retryEmail,
  saveEmailSetting,
} from "../services/emailNotificationServices.js";

const eventLabels = {
  service_request_created: "Novi servisni zahtjev",
  work_order_assigned: "Dodjela radnog naloga",
  work_order_reminder: "Podsjetnik na intervenciju",
  sla_escalation: "SLA eskalacija",
  service_report_generated: "Servisni PDF zapisnik",
  deadline_reminder: "Dokumenti, ovjere i kalibracije",
  fleet_deadline_reminder: "Vozni park: registracije, servisi i PP aparati",
};

const statusStyle = {
  pending: "bg-amber-100 text-amber-700",
  processing: "bg-blue-100 text-blue-700",
  sent: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-600",
};

const EmailCenter = () => {
  const permissions = useStore((state) => state.permissions);
  const canManage = permissions.includes("manage_email_center");
  const [data, setData] = useState({ configured: false, summary: {}, queue: [], settings: [] });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await getEmailCenter();
      setData(response.data);
    } catch (error) {
      toast.error(error.response?.data?.error || "E-mail centar nije moguće učitati.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateSetting = (id, changes) => {
    setData((current) => ({
      ...current,
      settings: current.settings.map((setting) =>
        setting.id === id ? { ...setting, ...changes } : setting),
    }));
  };

  const saveSetting = async (setting) => {
    try {
      await saveEmailSetting(setting.event_type, {
        ...setting,
        recipients: String(setting.recipient_text || "")
          .split(/[,;\n]/).map((item) => item.trim()).filter(Boolean),
      });
      toast.success("Postavke obavijesti su spremljene.");
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Postavke nije moguće spremiti.");
    }
  };

  const process = async () => {
    setProcessing(true);
    try {
      const response = await processEmailQueue();
      if (!response.data.configured) {
        toast.warning("SMTP još nije konfiguriran. Poruke ostaju sigurno u redu.");
      } else {
        toast.success(`Poslano: ${response.data.sent}, neuspjelo: ${response.data.failed}`);
      }
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Red e-mailova nije moguće obraditi.");
    } finally {
      setProcessing(false);
    }
  };

  const retry = async (id) => {
    await retryEmail(id);
    toast.success("Poruka je vraćena u red za slanje.");
    load();
  };

  if (loading) return <div className="min-h-screen bg-slate-100 pt-28 text-center text-slate-500">Učitavanje e-mail centra…</div>;

  return (
    <div className="min-h-screen bg-slate-100 px-4 pb-10 pt-24 sm:ml-16 sm:px-7">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Komunikacija</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">E-mail centar</h1>
            <p className="mt-2 text-slate-500">Automatske poruke, podsjetnici, retry i povijest slanja.</p>
          </div>
          {canManage && <button onClick={process} disabled={processing} className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white disabled:opacity-50"><FaPaperPlane /> {processing ? "Obrada…" : "Obradi red sada"}</button>}
        </div>

        {!data.configured && <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><b>SMTP nije konfiguriran.</b> Sustav sve poruke uredno priprema i čuva, ali ih neće slati dok se u backend `.env` ne dodaju SMTP postavke.</div>}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Čeka slanje" value={data.summary.pending || 0} icon={FaEnvelope} color="amber" />
          <Kpi label="U obradi" value={data.summary.processing || 0} icon={FaPaperPlane} color="blue" />
          <Kpi label="Poslano" value={data.summary.sent || 0} icon={FaCheckCircle} color="emerald" />
          <Kpi label="Neuspjelo" value={data.summary.failed || 0} icon={FaExclamationTriangle} color="red" />
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b p-5"><h2 className="font-bold text-slate-900">Automatske obavijesti</h2><p className="text-sm text-slate-500">Odaberite primatelje za svaku vrstu događaja.</p></div>
          <div className="grid gap-4 p-5 lg:grid-cols-2">
            {data.settings.map((setting) => (
              <div key={setting.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-bold text-slate-800">{eventLabels[setting.event_type] || setting.event_type}</div>
                  <input type="checkbox" disabled={!canManage} checked={setting.enabled} onChange={(event) => updateSetting(setting.id, { enabled: event.target.checked })} className="h-5 w-5" />
                </div>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                  <Check label="Klijentu" checked={setting.send_to_client} disabled={!canManage} onChange={(value) => updateSetting(setting.id, { send_to_client: value })} />
                  <Check label="Serviseru" checked={setting.send_to_assignee} disabled={!canManage} onChange={(value) => updateSetting(setting.id, { send_to_assignee: value })} />
                  <Check label="Rukovodstvu" checked={setting.send_to_managers} disabled={!canManage} onChange={(value) => updateSetting(setting.id, { send_to_managers: value })} />
                </div>
                <label className="mt-3 block text-xs font-bold text-slate-500">Dodatne e-mail adrese</label>
                <textarea disabled={!canManage} value={setting.recipient_text ?? (setting.recipients || []).join(", ")} onChange={(event) => updateSetting(setting.id, { recipient_text: event.target.value })} rows={2} placeholder="servis@tvrtka.hr, voditelj@tvrtka.hr" className="mt-1 w-full rounded-lg border p-2 text-sm disabled:bg-slate-100" />
                {canManage && <button onClick={() => saveSetting(setting)} className="mt-3 flex items-center gap-2 text-sm font-bold text-indigo-600"><FaSave /> Spremi postavku</button>}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b p-5"><h2 className="font-bold text-slate-900">Povijest i red slanja</h2></div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Poruka</th><th className="px-5 py-3">Primatelj</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Pokušaji</th><th className="px-5 py-3">Vrijeme</th><th className="px-5 py-3"></th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.queue.map((item) => <tr key={item.id}>
                  <td className="max-w-md px-5 py-4"><div className="font-semibold text-slate-800">{item.subject}</div><div className="mt-1 text-xs text-slate-400">{eventLabels[item.event_type] || item.event_type}{item.last_error ? ` · ${item.last_error}` : ""}</div></td>
                  <td className="px-5 py-4 text-slate-600">{item.recipient_email}</td>
                  <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyle[item.status]}`}>{item.status}</span></td>
                  <td className="px-5 py-4 text-slate-600">{item.attempts} / {item.max_attempts}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{new Intl.DateTimeFormat("hr-HR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.sent_at || item.created_at))}</td>
                  <td className="px-5 py-4">{canManage && item.status === "failed" && <button onClick={() => retry(item.id)} className="rounded-lg bg-red-50 p-2 text-red-600" title="Ponovno pošalji"><FaRedo /></button>}</td>
                </tr>)}
              </tbody>
            </table>
            {!data.queue.length && <div className="p-10 text-center text-slate-400">Još nema pripremljenih e-mail poruka.</div>}
          </div>
        </section>
      </div>
    </div>
  );
};

const Check = ({ label, checked, disabled, onChange }) => <label className="flex items-center gap-2 rounded-lg bg-slate-50 p-2"><input type="checkbox" disabled={disabled} checked={checked} onChange={(event) => onChange(event.target.checked)} /> {label}</label>;
const colors = { amber: "bg-amber-100 text-amber-700", blue: "bg-blue-100 text-blue-700", emerald: "bg-emerald-100 text-emerald-700", red: "bg-red-100 text-red-700" };
const Kpi = ({ label, value, icon: Icon, color }) => <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className={`inline-flex rounded-xl p-3 ${colors[color]}`}><Icon /></div><div className="mt-3 text-3xl font-bold">{value}</div><div className="text-sm text-slate-500">{label}</div></div>;

export default EmailCenter;
