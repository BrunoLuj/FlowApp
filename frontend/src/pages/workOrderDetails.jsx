import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaCheck, FaClipboardCheck, FaDownload, FaPaperclip, FaPlus, FaTools } from "react-icons/fa";
import { toast } from "sonner";
import {
  addWorkOrderActivity,
  addWorkOrderChecklist,
  addWorkOrderMaterial,
  completeWorkOrder,
  getWorkOrder,
  updateWorkOrderChecklist,
} from "../services/workorderServices";
import { downloadAttachment, uploadAttachment } from "../services/serviceCenterServices.js";
import { downloadBlob } from "../libs/downloadBlob.js";

const WorkOrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState({ description: "", duration_minutes: "" });
  const [material, setMaterial] = useState({ item_name: "", quantity: 1, unit: "kom" });
  const [checklistLabel, setChecklistLabel] = useState("");
  const [completion, setCompletion] = useState({ completion_notes: "", customer_signature_name: "" });
  const [attachmentFile, setAttachmentFile] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getWorkOrder(id);
      setOrder(response.data);
    } catch (error) {
      toast.error(error.response?.data?.error || "Radni nalog nije moguće učitati.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const submitActivity = async (event) => {
    event.preventDefault();
    await addWorkOrderActivity(id, activity);
    setActivity({ description: "", duration_minutes: "" });
    toast.success("Aktivnost je dodana.");
    load();
  };

  const submitMaterial = async (event) => {
    event.preventDefault();
    await addWorkOrderMaterial(id, material);
    setMaterial({ item_name: "", quantity: 1, unit: "kom" });
    toast.success("Materijal je evidentiran.");
    load();
  };

  const submitChecklist = async (event) => {
    event.preventDefault();
    await addWorkOrderChecklist(id, { label: checklistLabel });
    setChecklistLabel("");
    load();
  };

  const toggleChecklist = async (item) => {
    await updateWorkOrderChecklist(id, item.id, { completed: !item.completed });
    load();
  };

  const finish = async () => {
    if (!window.confirm("Završiti radni nalog i povezani servisni zahtjev?")) return;
    await completeWorkOrder(id, completion);
    toast.success("Radni nalog je završen.");
    load();
  };

  const addAttachment = async () => {
    if (!attachmentFile) return;
    try {
      await uploadAttachment("work-order", id, {
        file: attachmentFile,
        visible_to_client: true,
      });
      setAttachmentFile(null);
      toast.success("Prilog je učitan.");
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Prilog nije moguće učitati.");
    }
  };

  const getAttachment = async (attachment) => {
    try {
      const response = await downloadAttachment(attachment.id);
      downloadBlob(response.data, attachment.file_name);
    } catch (error) {
      toast.error(error.response?.data?.error || "Prilog nije moguće preuzeti.");
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-100 pt-28 text-center text-slate-500">Učitavanje naloga…</div>;
  if (!order) return <div className="min-h-screen bg-slate-100 pt-28 text-center text-slate-500">Nalog nije pronađen.</div>;

  return (
    <div className="min-h-screen bg-slate-100 px-4 pb-10 pt-24 sm:ml-16 sm:px-7">
      <div className="mx-auto max-w-5xl">
        <button onClick={() => navigate("/work-order")} className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-500"><FaArrowLeft /> Radni nalozi</button>
        <section className="rounded-2xl bg-slate-900 p-6 text-white shadow-xl">
          <div className="text-sm font-bold text-indigo-300">{order.work_order_number || `WO-${order.id}`}</div>
          <h1 className="mt-1 text-3xl font-bold">{order.title}</h1>
          <p className="mt-2 text-slate-300">{order.client_name} · {order.station_name}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-white/10 px-3 py-1">{order.status}</span>
            <span className="rounded-full bg-white/10 px-3 py-1">{order.type}</span>
            {order.asset_name && <span className="rounded-full bg-white/10 px-3 py-1">{order.asset_name}</span>}
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card title="Checklista" icon={FaClipboardCheck}>
            <div className="space-y-2">
              {order.checklist.map((item) => (
                <button key={item.id} onClick={() => toggleChecklist(item)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${item.completed ? "border-emerald-200 bg-emerald-50" : "border-slate-200"}`}>
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full ${item.completed ? "bg-emerald-500 text-white" : "border border-slate-300"}`}>{item.completed && <FaCheck size={11} />}</span>
                  <span className={item.completed ? "text-slate-500 line-through" : "text-slate-700"}>{item.label}</span>
                </button>
              ))}
            </div>
            <form onSubmit={submitChecklist} className="mt-3 flex gap-2">
              <input required value={checklistLabel} onChange={(e) => setChecklistLabel(e.target.value)} placeholder="Nova stavka…" className="flex-1 rounded-xl border p-3" />
              <button className="rounded-xl bg-indigo-600 px-4 text-white"><FaPlus /></button>
            </form>
          </Card>

          <Card title="Utrošeni materijal" icon={FaTools}>
            <div className="space-y-2">{order.materials.map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-3 text-sm"><b>{item.item_name}</b> · {item.quantity} {item.unit}</div>)}</div>
            <form onSubmit={submitMaterial} className="mt-3 grid grid-cols-4 gap-2">
              <input required value={material.item_name} onChange={(e) => setMaterial({ ...material, item_name: e.target.value })} placeholder="Materijal" className="col-span-2 rounded-xl border p-3" />
              <input type="number" min="0.001" step="0.001" value={material.quantity} onChange={(e) => setMaterial({ ...material, quantity: e.target.value })} className="rounded-xl border p-3" />
              <button className="rounded-xl bg-indigo-600 text-white"><FaPlus /></button>
            </form>
          </Card>

          <Card title="Rad i aktivnosti" icon={FaTools}>
            <div className="space-y-2">{order.activities.map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-3"><div className="text-sm text-slate-700">{item.description}</div><div className="mt-1 text-xs text-slate-400">{item.user_name} · {item.duration_minutes || 0} min</div></div>)}</div>
            <form onSubmit={submitActivity} className="mt-3 space-y-2">
              <textarea required rows={3} value={activity.description} onChange={(e) => setActivity({ ...activity, description: e.target.value })} placeholder="Opis izvršenog rada…" className="w-full rounded-xl border p-3" />
              <div className="flex gap-2"><input type="number" min="0" value={activity.duration_minutes} onChange={(e) => setActivity({ ...activity, duration_minutes: e.target.value })} placeholder="Minute" className="flex-1 rounded-xl border p-3" /><button className="rounded-xl bg-indigo-600 px-5 font-semibold text-white">Dodaj</button></div>
            </form>
          </Card>

          <Card title="Završetak naloga" icon={FaCheck}>
            <textarea rows={4} value={completion.completion_notes} onChange={(e) => setCompletion({ ...completion, completion_notes: e.target.value })} placeholder="Završna napomena…" className="w-full rounded-xl border p-3" />
            <input value={completion.customer_signature_name} onChange={(e) => setCompletion({ ...completion, customer_signature_name: e.target.value })} placeholder="Ime osobe koja potvrđuje rad" className="mt-2 w-full rounded-xl border p-3" />
            <button disabled={order.status === "Completed"} onClick={finish} className="mt-3 w-full rounded-xl bg-emerald-600 py-3 font-bold text-white disabled:bg-slate-300">{order.status === "Completed" ? "Nalog je završen" : "Završi radni nalog"}</button>
          </Card>

          <Card title="Fotografije i prilozi" icon={FaPaperclip}>
            <div className="space-y-2">
              {order.attachments?.map((item) => (
                <button key={item.id} onClick={() => getAttachment(item)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50">
                  <span className="min-w-0 truncate text-sm font-semibold text-slate-700">{item.title || item.file_name}</span>
                  <FaDownload className="shrink-0 text-indigo-600" />
                </button>
              ))}
              {!order.attachments?.length && <div className="text-sm text-slate-400">Nema učitanih priloga.</div>}
            </div>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx" onChange={(event) => setAttachmentFile(event.target.files?.[0] || null)} className="mt-3 w-full rounded-xl border border-slate-300 p-2 text-sm" />
            <button type="button" disabled={!attachmentFile} onClick={addAttachment} className="mt-2 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white disabled:opacity-40">Učitaj prilog</button>
          </Card>
        </div>
      </div>
    </div>
  );
};

const Card = ({ title, icon: Icon, children }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="mb-4 flex items-center gap-2 font-bold text-slate-900"><Icon className="text-indigo-600" /> {title}</h2>
    {children}
  </section>
);

export default WorkOrderDetails;
