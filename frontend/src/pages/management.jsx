import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
import {
  FaCalendarAlt,
  FaChartLine,
  FaChevronLeft,
  FaChevronRight,
  FaClock,
  FaExclamationTriangle,
  FaTasks,
  FaTimes,
  FaUserCog,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  getManagementOverview,
  getPlanner,
  updateWorkOrderSchedule,
} from "../services/managementServices.js";

Chart.register(...registerables);

const isoDate = (date) => {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 10);
};

const monthRange = (cursor) => ({
  from: isoDate(new Date(cursor.getFullYear(), cursor.getMonth(), 1)),
  to: isoDate(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)),
});

const statusColor = {
  Open: "bg-blue-100 text-blue-700 border-blue-200",
  New: "bg-slate-100 text-slate-700 border-slate-200",
  "In Progress": "bg-amber-100 text-amber-700 border-amber-200",
  Completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  "On Hold": "bg-orange-100 text-orange-700 border-orange-200",
  Cancelled: "bg-red-100 text-red-700 border-red-200",
};

const Management = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [overview, setOverview] = useState(null);
  const [planner, setPlanner] = useState({ orders: [], technicians: [] });
  const [cursor, setCursor] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    planned_date: "",
    status: "Open",
    assigned_to: [],
  });

  const loadOverview = useCallback(async () => {
    try {
      const response = await getManagementOverview();
      setOverview(response.data);
    } catch {
      toast.error("Upravljački podaci nisu dostupni.");
    }
  }, []);

  const loadPlanner = useCallback(async () => {
    const range = monthRange(cursor);
    try {
      const response = await getPlanner(range.from, range.to);
      setPlanner(response.data);
    } catch {
      toast.error("Raspored intervencija nije dostupan.");
    }
  }, [cursor]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadOverview(), loadPlanner()]).finally(() => setLoading(false));
  }, [loadOverview, loadPlanner]);

  const openOrder = (order) => {
    setSelectedOrder(order);
    setScheduleForm({
      planned_date: order.planned_date ? String(order.planned_date).slice(0, 10) : "",
      status: order.status || "Open",
      assigned_to: Array.isArray(order.assigned_to) ? order.assigned_to : [],
    });
  };

  const saveSchedule = async (event) => {
    event.preventDefault();
    try {
      await updateWorkOrderSchedule(selectedOrder.id, scheduleForm);
      toast.success("Raspored radnog naloga je ažuriran.");
      setSelectedOrder(null);
      await Promise.all([loadOverview(), loadPlanner()]);
    } catch (error) {
      toast.error(error.response?.data?.error || "Raspored nije moguće spremiti.");
    }
  };

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const leading = (first.getDay() + 6) % 7;
    const result = Array(leading).fill(null);
    for (let day = 1; day <= last.getDate(); day += 1) {
      result.push(new Date(cursor.getFullYear(), cursor.getMonth(), day));
    }
    while (result.length % 7) result.push(null);
    return result;
  }, [cursor]);

  const ordersByDate = useMemo(() => {
    return planner.orders.reduce((accumulator, order) => {
      const key = order.planned_date ? String(order.planned_date).slice(0, 10) : "";
      if (key) accumulator[key] = [...(accumulator[key] || []), order];
      return accumulator;
    }, {});
  }, [planner.orders]);

  if (loading && !overview) {
    return <div className="min-h-screen bg-slate-100 pt-28 text-center text-slate-500">Učitavanje upravljačkog centra…</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 pb-10 pt-24 sm:ml-16 sm:px-7">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Rukovodstvo</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Upravljački centar</h1>
          <p className="mt-2 text-slate-500">Raspored servisera, kašnjenja, opterećenje i ključni rezultati.</p>
        </div>

        <div className="mb-6 flex gap-2 rounded-xl bg-white p-2 shadow-sm">
          <TabButton active={tab === "overview"} onClick={() => setTab("overview")} icon={FaChartLine}>Izvještaji</TabButton>
          <TabButton active={tab === "planner"} onClick={() => setTab("planner")} icon={FaCalendarAlt}>Planer intervencija</TabButton>
        </div>

        {tab === "overview" && overview && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
              <Kpi label="Otvoreni zahtjevi" value={overview.kpis.open_requests} icon={FaTasks} color="indigo" />
              <Kpi label="Hitni zahtjevi" value={overview.kpis.urgent_requests} icon={FaExclamationTriangle} color="red" />
              <Kpi label="Aktivni nalozi" value={overview.kpis.active_orders} icon={FaUserCog} color="blue" />
              <Kpi label="Nalozi u kašnjenju" value={overview.kpis.overdue_orders} icon={FaClock} color="orange" />
              <Kpi label="Prosjek rješavanja" value={`${overview.kpis.average_resolution_hours} h`} icon={FaClock} color="cyan" />
              <Kpi label="Završeno ovaj mjesec" value={overview.kpis.completed_this_month} icon={FaTasks} color="emerald" />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-3">
              <ChartCard title="Trend servisnih zahtjeva" className="xl:col-span-2">
                <Line
                  data={{
                    labels: overview.requestTrend.map((item) => item.month),
                    datasets: [
                      { label: "Otvoreni", data: overview.requestTrend.map((item) => item.created), borderColor: "#4f46e5", backgroundColor: "#4f46e522", tension: 0.3, fill: true },
                      { label: "Riješeni", data: overview.requestTrend.map((item) => item.resolved), borderColor: "#10b981", backgroundColor: "#10b98122", tension: 0.3 },
                    ],
                  }}
                  options={{ responsive: true, maintainAspectRatio: false }}
                />
              </ChartCard>
              <ChartCard title="Status radnih naloga">
                <Doughnut
                  data={{
                    labels: overview.orderStatuses.map((item) => item.status),
                    datasets: [{ data: overview.orderStatuses.map((item) => item.count), backgroundColor: ["#4f46e5", "#f59e0b", "#10b981", "#ef4444", "#64748b"] }],
                  }}
                  options={{ responsive: true, maintainAspectRatio: false }}
                />
              </ChartCard>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <ChartCard title="Opterećenje servisera">
                <Bar
                  data={{
                    labels: overview.technicianWorkload.map((item) => `${item.firstname} ${item.lastname}`),
                    datasets: [
                      { label: "Aktivni nalozi", data: overview.technicianWorkload.map((item) => item.active_orders), backgroundColor: "#4f46e5" },
                      { label: "Kasne", data: overview.technicianWorkload.map((item) => item.overdue_orders), backgroundColor: "#ef4444" },
                    ],
                  }}
                  options={{ responsive: true, maintainAspectRatio: false }}
                />
              </ChartCard>
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-5">
                  <h2 className="font-bold text-slate-900">Nalozi u kašnjenju</h2>
                  <p className="text-sm text-slate-500">Zahtijevaju intervenciju rukovoditelja</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {overview.overdueOrders.map((order) => (
                    <button key={order.id} onClick={() => navigate(`/work-orders/${order.id}`)} className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-slate-50">
                      <div><div className="font-semibold text-slate-800">{order.title}</div><div className="text-xs text-slate-500">{order.client_name} · {order.station_name}</div></div>
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">{order.days_overdue} dana</span>
                    </button>
                  ))}
                  {!overview.overdueOrders.length && <div className="p-10 text-center text-slate-400">Nema zakašnjelih naloga.</div>}
                </div>
              </section>
            </div>
          </>
        )}

        {tab === "planner" && (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="rounded-lg p-2 hover:bg-slate-100"><FaChevronLeft /></button>
              <div className="text-center">
                <h2 className="text-xl font-bold capitalize text-slate-900">{new Intl.DateTimeFormat("hr-HR", { month: "long", year: "numeric" }).format(cursor)}</h2>
                <p className="text-sm text-slate-500">{planner.orders.length} planiranih intervencija</p>
              </div>
              <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="rounded-lg p-2 hover:bg-slate-100"><FaChevronRight /></button>
            </div>
            <div className="grid grid-cols-7 border-b bg-slate-50 text-center text-xs font-bold uppercase text-slate-500">
              {["Pon", "Uto", "Sri", "Čet", "Pet", "Sub", "Ned"].map((day) => <div key={day} className="p-3">{day}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {days.map((date, index) => {
                const key = date ? isoDate(date) : "";
                const dayOrders = key ? ordersByDate[key] || [] : [];
                const isToday = key === isoDate(new Date());
                return (
                  <div key={`${key}-${index}`} className="min-h-32 border-b border-r border-slate-100 p-2">
                    {date && (
                      <>
                        <div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-full text-sm ${isToday ? "bg-indigo-600 font-bold text-white" : "text-slate-500"}`}>{date.getDate()}</div>
                        <div className="space-y-1">
                          {dayOrders.map((order) => (
                            <button key={order.id} onClick={() => openOrder(order)} className={`block w-full truncate rounded-lg border px-2 py-1 text-left text-xs font-semibold ${statusColor[order.status] || "border-slate-200 bg-slate-100 text-slate-700"}`} title={`${order.title} · ${order.client_name}`}>
                              {order.title}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4">
          <form onSubmit={saveSchedule} className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-6">
              <div><div className="text-sm font-bold text-indigo-600">{selectedOrder.work_order_number || `WO-${selectedOrder.id}`}</div><h2 className="mt-1 text-xl font-bold text-slate-900">{selectedOrder.title}</h2><p className="mt-1 text-sm text-slate-500">{selectedOrder.client_name} · {selectedOrder.station_name}</p></div>
              <button type="button" onClick={() => setSelectedOrder(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><FaTimes /></button>
            </div>
            <div className="space-y-4 p-6">
              <label><span className="mb-2 block text-sm font-semibold text-slate-700">Planirani datum</span><input required type="date" value={scheduleForm.planned_date} onChange={(event) => setScheduleForm({ ...scheduleForm, planned_date: event.target.value })} className="w-full rounded-xl border border-slate-300 p-3" /></label>
              <label><span className="mb-2 block text-sm font-semibold text-slate-700">Status</span><select value={scheduleForm.status} onChange={(event) => setScheduleForm({ ...scheduleForm, status: event.target.value })} className="w-full rounded-xl border border-slate-300 p-3"><option>Open</option><option>In Progress</option><option>On Hold</option><option>Cancelled</option></select><span className="mt-1 block text-xs text-slate-400">Nalog se završava kroz njegov detaljni ekran, nakon checkliste i završne napomene.</span></label>
              <label><span className="mb-2 block text-sm font-semibold text-slate-700">Serviser</span><select value={scheduleForm.assigned_to[0] || ""} onChange={(event) => setScheduleForm({ ...scheduleForm, assigned_to: event.target.value ? [Number(event.target.value)] : [] })} className="w-full rounded-xl border border-slate-300 p-3"><option value="">Nije dodijeljeno</option>{planner.technicians.map((item) => <option key={item.id} value={item.id}>{item.firstname} {item.lastname}</option>)}</select></label>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 p-6"><button type="button" onClick={() => setSelectedOrder(null)} className="rounded-xl px-5 py-3 font-semibold text-slate-600">Odustani</button><button className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white">Spremi raspored</button></div>
          </form>
        </div>
      )}
    </div>
  );
};

const TabButton = ({ active, onClick, icon: Icon, children }) => <button onClick={onClick} className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold ${active ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}><Icon /> {children}</button>;

const kpiColors = {
  indigo: "bg-indigo-100 text-indigo-700",
  red: "bg-red-100 text-red-700",
  blue: "bg-blue-100 text-blue-700",
  orange: "bg-orange-100 text-orange-700",
  cyan: "bg-cyan-100 text-cyan-700",
  emerald: "bg-emerald-100 text-emerald-700",
};

const Kpi = ({ label, value, icon: Icon, color }) => <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className={`inline-flex rounded-xl p-3 ${kpiColors[color]}`}><Icon /></div><div className="mt-3 text-3xl font-bold text-slate-900">{value}</div><div className="mt-1 text-sm text-slate-500">{label}</div></div>;

const ChartCard = ({ title, children, className = "" }) => <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}><h2 className="mb-4 font-bold text-slate-900">{title}</h2><div className="h-72">{children}</div></section>;

export default Management;
