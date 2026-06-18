import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBuilding,
  FaExclamationTriangle,
  FaGasPump,
  FaMapMarkerAlt,
  FaTools,
  FaWrench,
} from "react-icons/fa";
import { toast } from "sonner";
import { getServiceCenterDashboard } from "../services/serviceCenterServices.js";

const formatDate = (value) =>
  value ? new Intl.DateTimeFormat("hr-HR").format(new Date(value)) : "—";

const statusLabel = {
  new: "Novo",
  triage: "U obradi",
  scheduled: "Zakazano",
  in_progress: "U tijeku",
  waiting_client: "Čeka klijenta",
  resolved: "Riješeno",
  cancelled: "Otkazano",
};

const priorityClass = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  normal: "bg-blue-100 text-blue-700",
  low: "bg-slate-100 text-slate-600",
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getServiceCenterDashboard()
      .then((response) => setData(response.data))
      .catch(() => toast.error("Nije moguće učitati pregled servisnog centra."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="min-h-screen pt-28 text-center text-slate-500">Učitavanje pregleda…</div>;
  }

  const stats = data?.stats || {};
  const cards = [
    { label: "Klijenti", value: stats.clients || 0, icon: FaBuilding, color: "bg-indigo-600" },
    { label: "Benzinske stanice", value: stats.stations || 0, icon: FaGasPump, color: "bg-cyan-600" },
    { label: "Evidentirana oprema", value: stats.assets || 0, icon: FaTools, color: "bg-emerald-600" },
    { label: "Otvoreni zahtjevi", value: stats.openRequests || 0, icon: FaWrench, color: "bg-amber-500" },
    { label: "Aktivni radni nalozi", value: stats.activeWorkOrders || 0, icon: FaWrench, color: "bg-violet-600" },
    { label: "Istekli rokovi", value: stats.overdueDeadlines || 0, icon: FaExclamationTriangle, color: "bg-red-600" },
  ];

  return (
    <div className="min-h-screen bg-slate-100 px-4 pb-10 pt-24 sm:ml-16 sm:px-7">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-indigo-600">
              FlowApp servisni centar
            </p>
            <h1 className="text-3xl font-bold text-slate-900">Operativni pregled</h1>
            <p className="mt-2 text-slate-500">
              Stanice, oprema, servisni zahtjevi i mjeriteljski rokovi na jednom mjestu.
            </p>
          </div>
          <button
            onClick={() => navigate("/service-center?newRequest=true")}
            className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
          >
            + Novi servisni zahtjev
          </button>
        </div>

        <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {cards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl text-white ${color}`}>
                <Icon />
              </div>
              <div className="text-3xl font-bold text-slate-900">{value}</div>
              <div className="mt-1 text-sm text-slate-500">{label}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="font-bold text-slate-900">Rokovi i isteci</h2>
                <p className="text-sm text-slate-500">Umjeravanja, ovjere i dokumenti</p>
              </div>
              <button onClick={() => navigate("/service-center")} className="text-sm font-semibold text-indigo-600">
                Prikaži sve
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {data?.deadlines?.length ? data.deadlines.map((deadline) => (
                <div key={deadline.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">{deadline.title}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {deadline.client_name}{deadline.station_name ? ` · ${deadline.station_name}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                      deadline.days_remaining < 0
                        ? "bg-red-100 text-red-700"
                        : deadline.days_remaining <= 15
                          ? "bg-orange-100 text-orange-700"
                          : "bg-amber-100 text-amber-700"
                    }`}>
                      {deadline.days_remaining < 0
                        ? `Isteklo prije ${Math.abs(deadline.days_remaining)} dana`
                        : `Još ${deadline.days_remaining} dana`}
                    </span>
                    <span className="text-sm font-medium text-slate-600">{formatDate(deadline.due_date)}</span>
                  </div>
                </div>
              )) : (
                <div className="p-10 text-center text-slate-400">Nema rokova u sljedećih 60 dana.</div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="font-bold text-slate-900">Novi servisni zahtjevi</h2>
              <p className="text-sm text-slate-500">Posljednje prijave klijenata</p>
            </div>
            <div className="divide-y divide-slate-100">
              {data?.recentRequests?.length ? data.recentRequests.map((request) => (
                <button
                  key={request.id}
                  onClick={() => navigate("/service-center")}
                  className="block w-full p-4 text-left transition hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-slate-800">{request.subject}</span>
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${priorityClass[request.priority]}`}>
                      {request.priority}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {request.request_number} · {statusLabel[request.status] || request.status}
                  </div>
                </button>
              )) : (
                <div className="p-10 text-center text-slate-400">Nema novih zahtjeva.</div>
              )}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="font-bold text-slate-900">Benzinske stanice</h2>
            <p className="text-sm text-slate-500">Brzi pregled lokacija i evidentirane opreme</p>
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
            {data?.stations?.map((station) => (
              <div key={station.id} className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
                    <FaGasPump />
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    station.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {station.active ? "Aktivna" : "Neaktivna"}
                  </span>
                </div>
                <div className="font-bold text-slate-800">{station.name}</div>
                <div className="mt-1 text-sm text-slate-500">{station.client_name}</div>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <FaMapMarkerAlt /> {station.city || station.address || "Lokacija nije unesena"}
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-600">
                  {station.registered_assets} uređaja u novom registru
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
