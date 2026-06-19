import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaCheckCircle, FaMapMarkerAlt, FaPause,
  FaPlay, FaRoute, FaSave, FaTools, FaWifi,
} from "react-icons/fa";
import { toast } from "sonner";
import {
  getMyMobileWorkOrders,
  sendMobileWorkOrderEvent,
} from "../services/workorderServices.js";
import {
  cacheMobileOrders,
  createEventKey,
  getCachedMobileOrders,
  getMobileQueue,
  queueMobileEvent,
  removeMobileEvent,
} from "../libs/mobileOfflineQueue.js";

const MobileWorkOrders = () => {
  const [orders, setOrders] = useState(() => getCachedMobileOrders());
  const [online, setOnline] = useState(navigator.onLine);
  const [queueCount, setQueueCount] = useState(() => getMobileQueue().length);
  const [syncing, setSyncing] = useState(false);
  const [notes, setNotes] = useState({});

  const refreshQueueCount = useCallback(() => setQueueCount(getMobileQueue().length), []);

  const load = useCallback(async () => {
    if (!navigator.onLine) return;
    try {
      const response = await getMyMobileWorkOrders();
      setOrders(response.data);
      cacheMobileOrders(response.data);
      setNotes((current) => Object.fromEntries(
        response.data.map((order) => [order.id, current[order.id] ?? order.field_notes ?? ""])
      ));
    } catch (error) {
      if (!getCachedMobileOrders().length) {
        toast.error(error.response?.data?.error || "Moji nalozi nisu dostupni.");
      }
    }
  }, []);

  const syncQueue = useCallback(async () => {
    if (!navigator.onLine || syncing) return;
    const queue = getMobileQueue();
    if (!queue.length) return;
    setSyncing(true);
    let synced = 0;
    try {
      for (const item of queue) {
        try {
          await sendMobileWorkOrderEvent(item.work_order_id, item);
          removeMobileEvent(item.event_key);
          synced += 1;
        } catch (error) {
          if (!error.response) break;
          if ([400, 403, 404].includes(error.response.status)) {
            removeMobileEvent(item.event_key);
            toast.error(`Nije moguće sinkronizirati događaj za nalog #${item.work_order_id}.`);
            continue;
          }
          break;
        }
      }
      if (synced) {
        toast.success(`Sinkronizirano događaja: ${synced}`);
        await load();
      }
    } finally {
      setSyncing(false);
      refreshQueueCount();
    }
  }, [load, refreshQueueCount, syncing]);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      syncQueue();
      load();
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("flowapp-mobile-queue-change", refreshQueueCount);
    load();
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("flowapp-mobile-queue-change", refreshQueueCount);
    };
  }, [load, refreshQueueCount, syncQueue]);

  useEffect(() => {
    if (online && queueCount) syncQueue();
  }, [online, queueCount, syncQueue]);

  const saveEvent = async (workOrderId, eventType, payload = {}) => {
    const event = {
      event_key: createEventKey(),
      work_order_id: workOrderId,
      event_type: eventType,
      event_at: new Date().toISOString(),
      payload,
    };
    queueMobileEvent(event);
    setOrders((current) => current.map((order) => order.id === workOrderId
      ? {
          ...order,
          last_mobile_event: eventType,
          arrival_at: eventType === "arrive" || eventType === "start" ? order.arrival_at || event.event_at : order.arrival_at,
          departure_at: eventType === "stop" ? event.event_at : order.departure_at,
          status: eventType === "start" ? "In Progress" : order.status,
          field_notes: eventType === "field_update" ? payload.field_notes : order.field_notes,
        }
      : order));
    if (navigator.onLine) await syncQueue();
    else toast.info("Spremljeno na uređaj. Sinkronizirat će se nakon povratka veze.");
  };

  const groups = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      today: orders.filter((order) => (order.scheduled_start_at?.slice(0, 10) || order.planned_date) === today),
      upcoming: orders.filter((order) => (order.scheduled_start_at?.slice(0, 10) || order.planned_date) !== today),
    };
  }, [orders]);

  return (
    <div className="min-h-screen bg-slate-100 px-3 pb-24 pt-20 sm:ml-16 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="sticky top-[65px] z-20 mb-4 flex items-center justify-between rounded-2xl bg-slate-900 p-4 text-white shadow-xl">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-300">Mobilni servis</div>
            <h1 className="text-xl font-bold">Moji radni nalozi</h1>
          </div>
          <button onClick={syncQueue} disabled={!online || !queueCount || syncing} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold disabled:opacity-50">
            {online ? <FaWifi className="text-emerald-400" /> : <FaWifi className="text-red-400" />}
            {queueCount ? `${queueCount} čeka` : "Sinkronizirano"}
          </button>
        </div>

        {!online && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">Offline način rada je aktivan. Promjene ostaju sigurno spremljene na uređaju.</div>}

        <OrderGroup title="Danas" orders={groups.today} notes={notes} setNotes={setNotes} saveEvent={saveEvent} />
        <OrderGroup title="Sljedeći nalozi" orders={groups.upcoming} notes={notes} setNotes={setNotes} saveEvent={saveEvent} />

        {!orders.length && <div className="rounded-2xl bg-white p-10 text-center text-slate-400">Nema dodijeljenih aktivnih naloga.</div>}
      </div>
    </div>
  );
};

const OrderGroup = ({ title, orders, notes, setNotes, saveEvent }) => {
  if (!orders.length) return null;
  return <section className="mb-6">
    <h2 className="mb-3 px-1 text-sm font-bold uppercase tracking-wider text-slate-500">{title} · {orders.length}</h2>
    <div className="space-y-4">{orders.map((order) => (
      <article key={order.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-indigo-600">{order.work_order_number || `WO-${order.id}`}</div>
              <h3 className="mt-1 text-lg font-bold text-slate-900">{order.title}</h3>
              <div className="mt-1 text-sm text-slate-500">{order.client_name} · {order.station_name}</div>
            </div>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{order.status}</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <a href={mapsUrl(order)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 p-3 font-semibold text-slate-700"><FaRoute className="text-indigo-600" /> Navigacija</a>
            <Link to={`/work-orders/${order.id}`} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 p-3 font-semibold text-slate-700"><FaTools className="text-indigo-600" /> Detalji i slike</Link>
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600"><FaMapMarkerAlt className="mt-1 shrink-0 text-slate-400" /> {[order.address, order.city].filter(Boolean).join(", ") || "Adresa nije unesena"}</div>

          <textarea value={notes[order.id] ?? order.field_notes ?? ""} onChange={(event) => setNotes({ ...notes, [order.id]: event.target.value })} rows={3} placeholder="Bilješka s terena…" className="mt-3 w-full rounded-xl border border-slate-300 p-3 text-sm" />
          <button onClick={() => saveEvent(order.id, "field_update", { field_notes: notes[order.id] ?? "" })} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 py-2.5 text-sm font-bold text-slate-700"><FaSave /> Spremi bilješku</button>
        </div>

        <div className="grid grid-cols-3 border-t border-slate-100">
          <ActionButton icon={FaMapMarkerAlt} label="Dolazak" color="text-blue-700" onClick={() => saveEvent(order.id, "arrive")} />
          <ActionButton icon={FaPlay} label="Pokreni" color="text-emerald-700" onClick={() => saveEvent(order.id, "start")} />
          <ActionButton icon={order.last_mobile_event === "stop" ? FaCheckCircle : FaPause} label="Zaustavi" color="text-orange-700" onClick={() => saveEvent(order.id, "stop")} />
        </div>
      </article>
    ))}</div>
  </section>;
};

const ActionButton = ({ icon: Icon, label, color, onClick }) => (
  <button onClick={onClick} className={`flex min-h-16 flex-col items-center justify-center gap-1 border-r border-slate-100 text-xs font-bold last:border-r-0 ${color}`}>
    <Icon size={17} /> {label}
  </button>
);

const mapsUrl = (order) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([order.address, order.city].filter(Boolean).join(", "))}`;

export default MobileWorkOrders;
