import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaCheckDouble, FaExclamationTriangle, FaInfoCircle } from "react-icons/fa";
import { toast } from "sonner";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notificationServices.js";

const severityStyle = {
  danger: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
};

const Notifications = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({ unread: 0, notifications: [] });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getNotifications();
      setData(response.data);
    } catch {
      toast.error("Obavijesti nije moguće učitati.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNotification = async (item) => {
    if (!item.is_read) {
      await markNotificationRead(item.notification_key);
    }
    navigate(item.target_url);
  };

  const markAll = async () => {
    await markAllNotificationsRead();
    toast.success("Sve obavijesti su označene pročitanima.");
    load();
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 pb-10 pt-24 sm:ml-16 sm:px-7">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Centar događaja</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Obavijesti</h1>
            <p className="mt-2 text-slate-500">{data.unread} nepročitanih · rokovi, zahtjevi i radni nalozi</p>
          </div>
          <button onClick={markAll} disabled={!data.unread} className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-40">
            <FaCheckDouble /> Označi sve pročitanim
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-12 text-center text-slate-500">Učitavanje obavijesti…</div>
        ) : (
          <div className="space-y-3">
            {data.notifications.map((item) => (
              <button
                key={item.notification_key}
                onClick={() => openNotification(item)}
                className={`flex w-full items-start gap-4 rounded-2xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5 ${
                  item.is_read ? "border-slate-200 bg-white opacity-70" : severityStyle[item.severity]
                }`}
              >
                <div className="mt-1 text-xl">
                  {item.severity === "danger" ? <FaExclamationTriangle /> : item.severity === "warning" ? <FaBell /> : <FaInfoCircle />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-bold">{item.title}</h2>
                    {!item.is_read && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-current" />}
                  </div>
                  <p className="mt-1 text-sm opacity-80">{item.message}</p>
                  <p className="mt-2 text-xs opacity-60">{new Intl.DateTimeFormat("hr-HR", { dateStyle: "medium" }).format(new Date(item.event_at))}</p>
                </div>
              </button>
            ))}
            {!data.notifications.length && <div className="rounded-2xl bg-white p-12 text-center text-slate-400">Nema aktivnih obavijesti.</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
