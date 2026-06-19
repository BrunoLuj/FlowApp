import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaChevronLeft, FaChevronRight, FaClock, FaRoute,
  FaTimes, FaUserClock,
} from "react-icons/fa";
import { toast } from "sonner";
import useStore from "../store";
import {
  deleteTechnicianAvailability,
  getPlanner,
  saveTechnicianAvailability,
  updateWorkOrderSchedule,
} from "../services/managementServices.js";

const isoDate = (date) => {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 10);
};

const startOfWeek = (date) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7));
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const toLocalDateTime = (value, fallbackDate) => {
  if (!value) return `${fallbackDate}T08:00`;
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const statusColor = {
  New: "border-slate-200 bg-slate-100 text-slate-700",
  Open: "border-blue-200 bg-blue-100 text-blue-700",
  "In Progress": "border-amber-200 bg-amber-100 text-amber-700",
  "On Hold": "border-orange-200 bg-orange-100 text-orange-700",
};

const Dispatch = () => {
  const permissions = useStore((state) => state.permissions);
  const canSchedule = permissions.includes("schedule_work_orders");
  const canManageAvailability = permissions.includes("manage_technician_availability");
  const [cursor, setCursor] = useState(new Date());
  const [planner, setPlanner] = useState({ orders: [], technicians: [], availability: [] });
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [availabilityForm, setAvailabilityForm] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({});

  const days = useMemo(() => {
    const first = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(first);
      date.setDate(date.getDate() + index);
      return date;
    });
  }, [cursor]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getPlanner(isoDate(days[0]), isoDate(days[6]));
      setPlanner(response.data);
    } catch (error) {
      toast.error(error.response?.data?.error || "Dispatch planer nije moguće učitati.");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const ordersBySlot = useMemo(() => planner.orders.reduce((result, order) => {
    const date = order.scheduled_start_at
      ? isoDate(new Date(order.scheduled_start_at))
      : order.planned_date ? String(order.planned_date).slice(0, 10) : "unplanned";
    const assigned = order.assigned_to?.length ? order.assigned_to : ["unassigned"];
    assigned.forEach((userId) => {
      const key = `${userId}:${date}`;
      result[key] = [...(result[key] || []), order];
    });
    return result;
  }, {}), [planner.orders]);

  const availabilityBySlot = useMemo(() => planner.availability.reduce((result, item) => {
    result[`${item.user_id}:${item.availability_date}`] = item;
    return result;
  }, {}), [planner.availability]);

  const openSchedule = (order) => {
    const fallbackDate = order.planned_date ? String(order.planned_date).slice(0, 10) : isoDate(new Date());
    setSelectedOrder(order);
    setScheduleForm({
      planned_date: fallbackDate,
      scheduled_start_at: toLocalDateTime(order.scheduled_start_at, fallbackDate),
      estimated_duration_minutes: order.estimated_duration_minutes || 120,
      assigned_to: order.assigned_to || [],
      status: order.status || "Open",
      dispatch_status: order.dispatch_status || "planned",
      dispatch_notes: order.dispatch_notes || "",
    });
  };

  const saveSchedule = async (event) => {
    event.preventDefault();
    try {
      await updateWorkOrderSchedule(selectedOrder.id, scheduleForm);
      toast.success("Termin i serviser su dodijeljeni.");
      setSelectedOrder(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Raspored nije moguće spremiti.", { duration: 7000 });
    }
  };

  const saveAvailability = async (event) => {
    event.preventDefault();
    try {
      await saveTechnicianAvailability(availabilityForm);
      toast.success("Raspoloživost servisera je spremljena.");
      setAvailabilityForm(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Raspoloživost nije moguće spremiti.");
    }
  };

  const removeAvailability = async () => {
    if (!availabilityForm?.id) return;
    try {
      await deleteTechnicianAvailability(availabilityForm.id);
      toast.success("Odsutnost je uklonjena.");
      setAvailabilityForm(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Odsutnost nije moguće ukloniti.");
    }
  };

  const rows = [...planner.technicians, { id: "unassigned", firstname: "Nedodijeljeni", lastname: "nalozi" }];

  return (
    <div className="min-h-screen bg-slate-100 px-4 pb-10 pt-24 sm:ml-16 sm:px-7">
      <div className="mx-auto max-w-[1700px]">
        <header className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Operativa</p>
          <h1 className="mt-1 flex items-center gap-3 text-3xl font-bold text-slate-900"><FaRoute className="text-indigo-600" /> Dispatch servisera</h1>
          <p className="mt-2 text-slate-500">Tjedni raspored, termini, odsutnosti i automatska kontrola preklapanja.</p>
        </header>

        <section className="rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b p-5">
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 7))} className="rounded-lg p-2 hover:bg-slate-100"><FaChevronLeft /></button>
            <div className="text-center">
              <h2 className="text-xl font-bold">{new Intl.DateTimeFormat("hr-HR", { day: "numeric", month: "short" }).format(days[0])} — {new Intl.DateTimeFormat("hr-HR", { day: "numeric", month: "short", year: "numeric" }).format(days[6])}</h2>
              <p className="text-sm text-slate-500">{planner.orders.length} naloga u prikazanom tjednu</p>
            </div>
            <div className="flex gap-2"><button onClick={() => setCursor(new Date())} className="rounded-lg border px-3 py-2 text-sm font-semibold">Danas</button><button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7))} className="rounded-lg p-2 hover:bg-slate-100"><FaChevronRight /></button></div>
          </div>

          {loading ? <div className="p-12 text-center text-slate-400">Učitavanje rasporeda…</div> : (
            <div className="overflow-x-auto">
              <div className="min-w-[1150px]">
                <div className="grid grid-cols-[200px_repeat(7,minmax(135px,1fr))] border-b bg-slate-50 text-center text-xs font-bold uppercase text-slate-500">
                  <div className="p-3 text-left">Serviser</div>
                  {days.map((date) => <div key={isoDate(date)} className={`p-3 ${isoDate(date) === isoDate(new Date()) ? "bg-indigo-50 text-indigo-700" : ""}`}>{new Intl.DateTimeFormat("hr-HR", { weekday: "short", day: "numeric", month: "numeric" }).format(date)}</div>)}
                </div>
                {rows.map((technician) => (
                  <div key={technician.id} className="grid grid-cols-[200px_repeat(7,minmax(135px,1fr))] border-b">
                    <div className="border-r bg-slate-50 p-3"><div className="font-bold">{technician.firstname} {technician.lastname}</div><div className="text-xs text-slate-400">{technician.role_name || (technician.id === "unassigned" ? "Čekaju dodjelu" : "Servis")}</div></div>
                    {days.map((date) => {
                      const dateKey = isoDate(date);
                      const slot = `${technician.id}:${dateKey}`;
                      const availability = availabilityBySlot[slot];
                      return <div key={slot} className={`min-h-32 border-r p-2 ${availability && availability.status !== "available" ? "bg-rose-50" : ""}`}>
                        {availability && availability.status !== "available" && <div className="mb-1 rounded bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">{availability.status}{availability.note ? ` · ${availability.note}` : ""}</div>}
                        <div className="space-y-1">{(ordersBySlot[slot] || []).map((order) => <button key={order.id} onClick={() => canSchedule && openSchedule(order)} className={`w-full rounded-lg border px-2 py-1.5 text-left text-xs ${statusColor[order.status] || statusColor.New}`}><div className="flex items-center gap-1 font-bold"><FaClock /> {order.scheduled_start_at ? new Intl.DateTimeFormat("hr-HR", { hour: "2-digit", minute: "2-digit" }).format(new Date(order.scheduled_start_at)) : "Bez vremena"}</div><div className="truncate font-semibold">{order.title}</div><div className="truncate opacity-70">{order.station_name}</div></button>)}</div>
                        {canManageAvailability && technician.id !== "unassigned" && <button onClick={() => setAvailabilityForm({ id: availability?.id || null, user_id: technician.id, availability_date: dateKey, start_time: availability?.start_time || "", end_time: availability?.end_time || "", status: availability?.status || "unavailable", note: availability?.note || "" })} className="mt-2 text-xs font-semibold text-slate-400 hover:text-indigo-600"><FaUserClock className="mr-1 inline" /> {availability ? "Uredi odsutnost" : "Odsutnost"}</button>}
                      </div>;
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {selectedOrder && <Modal title={selectedOrder.title} onClose={() => setSelectedOrder(null)}>
        <form onSubmit={saveSchedule} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Početak"><input required type="datetime-local" value={scheduleForm.scheduled_start_at} onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_start_at: e.target.value, planned_date: e.target.value.slice(0, 10) })} /></Field><Field label="Trajanje (min)"><input required type="number" min="15" step="15" value={scheduleForm.estimated_duration_minutes} onChange={(e) => setScheduleForm({ ...scheduleForm, estimated_duration_minutes: e.target.value })} /></Field></div>
          <Field label="Serviser"><select value={scheduleForm.assigned_to[0] || ""} onChange={(e) => setScheduleForm({ ...scheduleForm, assigned_to: e.target.value ? [Number(e.target.value)] : [] })}><option value="">Nije dodijeljeno</option>{planner.technicians.map((item) => <option key={item.id} value={item.id}>{item.firstname} {item.lastname}</option>)}</select></Field>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Status naloga"><select value={scheduleForm.status} onChange={(e) => setScheduleForm({ ...scheduleForm, status: e.target.value })}><option>Open</option><option>In Progress</option><option>On Hold</option><option>Cancelled</option></select></Field><Field label="Dispatch status"><select value={scheduleForm.dispatch_status} onChange={(e) => setScheduleForm({ ...scheduleForm, dispatch_status: e.target.value })}><option value="planned">Planirano</option><option value="dispatched">Poslano serviseru</option><option value="en_route">Na putu</option><option value="on_site">Na lokaciji</option></select></Field></div>
          <Field label="Napomena dispečera"><textarea rows={3} value={scheduleForm.dispatch_notes} onChange={(e) => setScheduleForm({ ...scheduleForm, dispatch_notes: e.target.value })} /></Field>
          <button className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white">Spremi raspored</button>
        </form>
      </Modal>}

      {availabilityForm && <Modal title="Raspoloživost servisera" onClose={() => setAvailabilityForm(null)}>
        <form onSubmit={saveAvailability} className="space-y-3">
          <Field label="Status"><select value={availabilityForm.status} onChange={(e) => setAvailabilityForm({ ...availabilityForm, status: e.target.value })}><option value="unavailable">Nedostupan</option><option value="vacation">Godišnji odmor</option><option value="sick_leave">Bolovanje</option><option value="training">Edukacija</option><option value="available">Dostupan</option></select></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Od"><input type="time" value={availabilityForm.start_time} onChange={(e) => setAvailabilityForm({ ...availabilityForm, start_time: e.target.value })} /></Field><Field label="Do"><input type="time" value={availabilityForm.end_time} onChange={(e) => setAvailabilityForm({ ...availabilityForm, end_time: e.target.value })} /></Field></div>
          <Field label="Napomena"><textarea rows={3} value={availabilityForm.note} onChange={(e) => setAvailabilityForm({ ...availabilityForm, note: e.target.value })} /></Field>
          <div className="flex gap-2">{availabilityForm.id && <button type="button" onClick={removeAvailability} className="flex-1 rounded-xl bg-red-50 py-3 font-semibold text-red-600">Ukloni</button>}<button className="flex-1 rounded-xl bg-indigo-600 py-3 font-semibold text-white">Spremi raspoloživost</button></div>
        </form>
      </Modal>}
    </div>
  );
};

const Field = ({ label, children }) => <label><span className="mb-1 block text-sm font-semibold text-slate-600">{label}</span>{React.cloneElement(children, { className: "w-full rounded-xl border p-3" })}</label>;
const Modal = ({ title, onClose, children }) => <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4"><div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-4 flex justify-between"><h2 className="text-xl font-bold">{title}</h2><button onClick={onClose}><FaTimes /></button></div>{children}</div></div>;

export default Dispatch;
