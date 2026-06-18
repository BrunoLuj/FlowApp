import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaArrowLeft, FaCar, FaCheck, FaClipboardCheck, FaDownload,
  FaFilePdf, FaPaperclip, FaPen, FaPlus, FaSave, FaTools,
} from "react-icons/fa";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { toast } from "sonner";
import {
  addWorkOrderActivity,
  addWorkOrderChecklist,
  addWorkOrderMaterial,
  completeWorkOrder,
  getWorkOrder,
  updateWorkOrderChecklist,
  updateWorkOrderFieldData,
} from "../services/workorderServices";
import { downloadAttachment, uploadAttachment } from "../services/serviceCenterServices.js";
import { downloadBlob } from "../libs/downloadBlob.js";
import { getAvailableInventory } from "../services/inventoryServices.js";

const emptyFieldData = {
  arrival_at: "",
  departure_at: "",
  odometer_start: "",
  odometer_end: "",
  travel_distance_km: "",
  travel_time_minutes: "",
  field_notes: "",
};

const toLocalInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const WorkOrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingField, setSavingField] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [activity, setActivity] = useState({ description: "", duration_minutes: "" });
  const [material, setMaterial] = useState({
    inventory_item_id: "", warehouse_id: "", item_name: "", quantity: 1, unit: "kom",
  });
  const [availableInventory, setAvailableInventory] = useState([]);
  const [checklistLabel, setChecklistLabel] = useState("");
  const [completion, setCompletion] = useState({
    completion_notes: "", customer_signature_name: "", customer_signature_data: "",
  });
  const [fieldData, setFieldData] = useState(emptyFieldData);
  const [attachmentFile, setAttachmentFile] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [response, inventoryResponse] = await Promise.all([
        getWorkOrder(id),
        getAvailableInventory().catch(() => ({ data: [] })),
      ]);
      const loaded = response.data;
      setOrder(loaded);
      setAvailableInventory(inventoryResponse.data || []);
      setFieldData({
        arrival_at: toLocalInput(loaded.arrival_at),
        departure_at: toLocalInput(loaded.departure_at),
        odometer_start: loaded.odometer_start ?? "",
        odometer_end: loaded.odometer_end ?? "",
        travel_distance_km: loaded.travel_distance_km ?? "",
        travel_time_minutes: loaded.travel_time_minutes ?? "",
        field_notes: loaded.field_notes || "",
      });
      setCompletion({
        completion_notes: loaded.completion_notes || "",
        customer_signature_name: loaded.customer_signature_name || "",
        customer_signature_data: loaded.customer_signature_data || "",
      });
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
    try {
      await addWorkOrderMaterial(id, material);
      setMaterial({
        inventory_item_id: "", warehouse_id: "", item_name: "", quantity: 1, unit: "kom",
      });
      toast.success("Materijal je evidentiran i zaliha ažurirana.");
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Materijal nije moguće evidentirati.");
    }
  };

  const selectInventoryItem = (value) => {
    const selected = availableInventory.find((item) => `${item.id}:${item.warehouse_id}` === value);
    if (!selected) {
      setMaterial({ ...material, inventory_item_id: "", warehouse_id: "", item_name: "" });
      return;
    }
    setMaterial({
      ...material,
      inventory_item_id: selected.id,
      warehouse_id: selected.warehouse_id,
      item_name: selected.name,
      unit: selected.unit,
    });
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

  const saveFieldData = async (extra = {}) => {
    setSavingField(true);
    try {
      await updateWorkOrderFieldData(id, { ...fieldData, ...completion, ...extra });
      toast.success("Terenski zapisnik je spremljen.");
      await load();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.error || "Terenski zapisnik nije moguće spremiti.");
      return false;
    } finally {
      setSavingField(false);
    }
  };

  const finish = async () => {
    const incomplete = order.checklist.filter((item) => item.required && !item.completed);
    if (incomplete.length) {
      toast.error(`Dovršite obaveznu checklistu (${incomplete.length} stavki).`);
      return;
    }
    if (!window.confirm("Završiti radni nalog i povezani servisni zahtjev?")) return;
    try {
      await updateWorkOrderFieldData(id, { ...fieldData, ...completion });
      await completeWorkOrder(id, completion);
      toast.success("Radni nalog je završen.");
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Radni nalog nije moguće završiti.");
    }
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

  const generatePdf = async () => {
    setGeneratingPdf(true);
    try {
      const currentOrder = { ...order, ...fieldData, ...completion };
      const doc = new jsPDF();
      const number = currentOrder.work_order_number || `WO-${currentOrder.id}`;
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 34, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(19);
      doc.text("SERVISNI ZAPISNIK", 14, 15);
      doc.setFontSize(10);
      doc.text(number, 14, 24);
      doc.text(new Date().toLocaleDateString("hr-HR"), 196, 24, { align: "right" });

      doc.setTextColor(15, 23, 42);
      doc.autoTable({
        startY: 42,
        theme: "grid",
        head: [["Podatak", "Vrijednost"]],
        body: [
          ["Klijent", currentOrder.client_name || "-"],
          ["Benzinska stanica", `${currentOrder.station_name || "-"}, ${currentOrder.address || ""} ${currentOrder.city || ""}`],
          ["Oprema", currentOrder.asset_name || "-"],
          ["Vrsta / naslov", `${currentOrder.type || "-"} / ${currentOrder.title || "-"}`],
          ["Dolazak / odlazak", `${formatDateTime(currentOrder.arrival_at)} / ${formatDateTime(currentOrder.departure_at)}`],
          ["Kilometraza", `${currentOrder.odometer_start || "-"} - ${currentOrder.odometer_end || "-"} km (put: ${currentOrder.travel_distance_km || "-"} km)`],
          ["Vrijeme puta", `${currentOrder.travel_time_minutes || 0} min`],
        ],
        headStyles: { fillColor: [79, 70, 229] },
      });

      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 7,
        head: [["Checklista", "Status"]],
        body: currentOrder.checklist.length
          ? currentOrder.checklist.map((item) => [item.label, item.completed ? "Izvrseno" : "Nije izvrseno"])
          : [["Nema stavki", "-"]],
        headStyles: { fillColor: [15, 23, 42] },
      });

      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 7,
        head: [["Izvrseni rad", "Trajanje"]],
        body: currentOrder.activities.length
          ? currentOrder.activities.map((item) => [item.description, `${item.duration_minutes || 0} min`])
          : [["Nema evidentiranih aktivnosti", "-"]],
        headStyles: { fillColor: [15, 23, 42] },
      });

      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 7,
        head: [["Materijal", "Kolicina"]],
        body: currentOrder.materials.length
          ? currentOrder.materials.map((item) => [item.item_name, `${item.quantity} ${item.unit}`])
          : [["Nema utrosenog materijala", "-"]],
        headStyles: { fillColor: [15, 23, 42] },
      });

      let y = doc.lastAutoTable.finalY + 10;
      if (y > 235) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.text("Zavrsna napomena", 14, y);
      doc.setFont(undefined, "normal");
      doc.setFontSize(9);
      const notes = [currentOrder.field_notes, currentOrder.completion_notes].filter(Boolean).join("\n") || "-";
      doc.text(doc.splitTextToSize(notes, 180), 14, y + 7);
      y += Math.max(22, doc.splitTextToSize(notes, 180).length * 5 + 12);

      if (currentOrder.customer_signature_data) {
        if (y > 245) {
          doc.addPage();
          y = 20;
        }
        doc.setFont(undefined, "bold");
        doc.setFontSize(10);
        doc.text("Potvrda klijenta", 14, y);
        doc.addImage(currentOrder.customer_signature_data, "PNG", 14, y + 4, 65, 24);
        doc.setFont(undefined, "normal");
        doc.text(currentOrder.customer_signature_name || "", 14, y + 33);
      }

      const blob = doc.output("blob");
      const file = new File([blob], `servisni-zapisnik-${number}.pdf`, { type: "application/pdf" });
      await uploadAttachment("work-order", id, {
        file,
        title: `Servisni zapisnik ${number}`,
        visible_to_client: true,
      });
      await updateWorkOrderFieldData(id, {
        ...fieldData,
        ...completion,
        report_generated: true,
      });
      toast.success("PDF zapisnik je generiran i spremljen među priloge.");
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || "PDF zapisnik nije moguće generirati.");
    } finally {
      setGeneratingPdf(false);
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
            {order.report_generated_at && <span className="rounded-full bg-emerald-500/30 px-3 py-1">PDF zapisnik spremljen</span>}
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card title="Terenski podaci" icon={FaCar}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Dolazak"><input type="datetime-local" value={fieldData.arrival_at} onChange={(e) => setFieldData({ ...fieldData, arrival_at: e.target.value })} className="w-full rounded-xl border p-3" /></Field>
              <Field label="Odlazak"><input type="datetime-local" value={fieldData.departure_at} onChange={(e) => setFieldData({ ...fieldData, departure_at: e.target.value })} className="w-full rounded-xl border p-3" /></Field>
              <Field label="Početna kilometraža"><input type="number" min="0" step="0.1" value={fieldData.odometer_start} onChange={(e) => setFieldData({ ...fieldData, odometer_start: e.target.value })} className="w-full rounded-xl border p-3" /></Field>
              <Field label="Završna kilometraža"><input type="number" min="0" step="0.1" value={fieldData.odometer_end} onChange={(e) => setFieldData({ ...fieldData, odometer_end: e.target.value })} className="w-full rounded-xl border p-3" /></Field>
              <Field label="Udaljenost (km)"><input type="number" min="0" step="0.1" value={fieldData.travel_distance_km} onChange={(e) => setFieldData({ ...fieldData, travel_distance_km: e.target.value })} className="w-full rounded-xl border p-3" /></Field>
              <Field label="Vrijeme puta (min)"><input type="number" min="0" value={fieldData.travel_time_minutes} onChange={(e) => setFieldData({ ...fieldData, travel_time_minutes: e.target.value })} className="w-full rounded-xl border p-3" /></Field>
            </div>
            <textarea rows={3} value={fieldData.field_notes} onChange={(e) => setFieldData({ ...fieldData, field_notes: e.target.value })} placeholder="Napomena s terena…" className="mt-3 w-full rounded-xl border p-3" />
            <button type="button" disabled={savingField} onClick={() => saveFieldData()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-semibold text-white disabled:opacity-50"><FaSave /> {savingField ? "Spremanje…" : "Spremi terenske podatke"}</button>
          </Card>

          <Card title="Checklista" icon={FaClipboardCheck}>
            <div className="space-y-2">
              {order.checklist.map((item) => (
                <button key={item.id} onClick={() => toggleChecklist(item)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${item.completed ? "border-emerald-200 bg-emerald-50" : "border-slate-200"}`}>
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full ${item.completed ? "bg-emerald-500 text-white" : "border border-slate-300"}`}>{item.completed && <FaCheck size={11} />}</span>
                  <span className={item.completed ? "text-slate-500 line-through" : "text-slate-700"}>{item.label}{item.required && <span className="ml-1 text-rose-500">*</span>}</span>
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
              <select value={material.inventory_item_id ? `${material.inventory_item_id}:${material.warehouse_id}` : ""} onChange={(event) => selectInventoryItem(event.target.value)} className="col-span-4 rounded-xl border p-3">
                <option value="">Ručni unos / artikl nije u skladištu</option>
                {availableInventory.map((item) => <option key={`${item.id}-${item.warehouse_id}`} value={`${item.id}:${item.warehouse_id}`}>{item.sku} · {item.name} · {item.quantity} {item.unit} · {item.warehouse_name}</option>)}
              </select>
              <input required value={material.item_name} readOnly={Boolean(material.inventory_item_id)} onChange={(e) => setMaterial({ ...material, item_name: e.target.value })} placeholder="Materijal" className="col-span-2 rounded-xl border p-3 read-only:bg-slate-100" />
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

          <Card title="Potvrda klijenta" icon={FaPen}>
            <textarea rows={4} value={completion.completion_notes} onChange={(e) => setCompletion({ ...completion, completion_notes: e.target.value })} placeholder="Završna napomena…" className="w-full rounded-xl border p-3" />
            <input value={completion.customer_signature_name} onChange={(e) => setCompletion({ ...completion, customer_signature_name: e.target.value })} placeholder="Ime osobe koja potvrđuje rad" className="mt-2 w-full rounded-xl border p-3" />
            <SignaturePad value={completion.customer_signature_data} onChange={(value) => setCompletion({ ...completion, customer_signature_data: value })} />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button type="button" disabled={generatingPdf} onClick={generatePdf} className="flex items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 font-bold text-white disabled:opacity-50"><FaFilePdf /> {generatingPdf ? "Generiranje…" : "Generiraj PDF"}</button>
              <button type="button" disabled={order.status === "Completed"} onClick={finish} className="rounded-xl bg-emerald-600 py-3 font-bold text-white disabled:bg-slate-300">{order.status === "Completed" ? "Nalog je završen" : "Završi nalog"}</button>
            </div>
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

const SignaturePad = ({ value, onChange }) => {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    if (value) {
      const image = new Image();
      image.onload = () => context.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.src = value;
    }
  }, [value]);

  const position = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const start = (event) => {
    event.preventDefault();
    drawingRef.current = true;
    const context = canvasRef.current.getContext("2d");
    const point = position(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
  };

  const draw = (event) => {
    if (!drawingRef.current) return;
    event.preventDefault();
    const context = canvasRef.current.getContext("2d");
    const point = position(event);
    context.lineWidth = 2.2;
    context.lineCap = "round";
    context.strokeStyle = "#0f172a";
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const stop = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    onChange(canvasRef.current.toDataURL("image/png"));
  };

  const clear = () => {
    onChange("");
    const context = canvasRef.current.getContext("2d");
    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-500"><span>Potpis prstom ili mišem</span><button type="button" onClick={clear} className="text-rose-600">Obriši potpis</button></div>
      <canvas ref={canvasRef} width={700} height={220} onPointerDown={start} onPointerMove={draw} onPointerUp={stop} onPointerLeave={stop} className="h-36 w-full touch-none rounded-xl border-2 border-dashed border-slate-300 bg-white" />
    </div>
  );
};

const formatDateTime = (value) => value ? new Date(value).toLocaleString("hr-HR") : "-";

const Field = ({ label, children }) => <label><span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span>{children}</label>;

const Card = ({ title, icon: Icon, children }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="mb-4 flex items-center gap-2 font-bold text-slate-900"><Icon className="text-indigo-600" /> {title}</h2>
    {children}
  </section>
);

export default WorkOrderDetails;
