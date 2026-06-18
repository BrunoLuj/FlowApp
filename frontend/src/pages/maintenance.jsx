import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaClock,
  FaCog,
  FaExclamationTriangle,
  FaPlay,
  FaPlus,
  FaQrcode,
} from "react-icons/fa";
import { toast } from "sonner";
import useStore from "../store";
import {
  createMaintenancePlan,
  generateDueMaintenance,
  generateMaintenancePlan,
  getMaintenanceAssets,
  getMaintenancePlans,
  updateMaintenancePlan,
} from "../services/maintenanceServices.js";
import { getUsers } from "../services/usersServices.js";

const emptyPlan = {
  id: null,
  asset_id: "",
  name: "",
  work_order_type: "Preventive",
  description: "",
  interval_value: 6,
  interval_unit: "months",
  lead_days: 14,
  next_due_date: "",
  assigned_to: [],
  checklist_text: "",
  active: true,
};

const Maintenance = () => {
  const { permissions } = useStore();
  const [plans, setPlans] = useState([]);
  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyPlan);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");
  const canManage = permissions.includes("manage_maintenance_plans");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [plansResponse, assetsResponse, usersResponse] = await Promise.all([
        getMaintenancePlans(),
        getMaintenanceAssets(),
        getUsers().catch(() => ({ data: [] })),
      ]);
      setPlans(plansResponse.data);
      setAssets(assetsResponse.data);
      setUsers(usersResponse.data || []);
    } catch {
      toast.error("Planove održavanja nije moguće učitati.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredPlans = useMemo(() => plans.filter((plan) => {
    if (filter === "due") return plan.active && plan.days_remaining <= plan.lead_days;
    if (filter === "overdue") return plan.active && plan.days_remaining < 0;
    if (filter === "inactive") return !plan.active;
    return true;
  }), [filter, plans]);

  const openForm = (plan = null) => {
    setForm(plan ? {
      ...emptyPlan,
      ...plan,
      next_due_date: String(plan.next_due_date).slice(0, 10),
      checklist_text: (plan.checklist_template || [])
        .map((item) => typeof item === "string" ? item : item.label)
        .join("\n"),
    } : emptyPlan);
    setShowForm(true);
  };

  const save = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      checklist_template: form.checklist_text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((label) => ({ label, required: false })),
    };
    try {
      if (form.id) await updateMaintenancePlan(form.id, payload);
      else await createMaintenancePlan(payload);
      toast.success(form.id ? "Plan je ažuriran." : "Plan održavanja je kreiran.");
      setShowForm(false);
      setForm(emptyPlan);
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Plan nije moguće spremiti.");
    }
  };

  const generateOne = async (plan) => {
    try {
      const response = await generateMaintenancePlan(plan.id);
      toast.success(response.data.skipped
        ? "Radni nalog za ovaj termin već postoji."
        : "Preventivni radni nalog je generiran.");
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Nalog nije moguće generirati.");
    }
  };

  const generateDue = async () => {
    try {
      const response = await generateDueMaintenance();
      toast.success(`Generirano: ${response.data.generated}, preskočeno: ${response.data.skipped}.`);
      load();
    } catch {
      toast.error("Dospjele naloge nije moguće generirati.");
    }
  };

  const summary = {
    active: plans.filter((plan) => plan.active).length,
    due: plans.filter((plan) => plan.active && plan.days_remaining <= plan.lead_days).length,
    overdue: plans.filter((plan) => plan.active && plan.days_remaining < 0).length,
    coveredAssets: new Set(plans.filter((plan) => plan.active).map((plan) => plan.asset_id)).size,
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-100 pt-28 text-center text-slate-500">Učitavanje planova održavanja…</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 pb-10 pt-24 sm:ml-16 sm:px-7">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Preventivni servis</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Planovi održavanja</h1>
            <p className="mt-2 text-slate-500">Automatski ciklusi, checkliste i generiranje radnih naloga.</p>
          </div>
          {canManage && <div className="flex gap-2">
            <button onClick={generateDue} className="rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white"><FaPlay className="mr-2 inline" />Generiraj dospjele</button>
            <button onClick={() => openForm()} className="rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white"><FaPlus className="mr-2 inline" />Novi plan</button>
          </div>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Summary label="Aktivni planovi" value={summary.active} icon={FaCog} tone="bg-indigo-100 text-indigo-700" />
          <Summary label="U periodu najave" value={summary.due} icon={FaClock} tone="bg-amber-100 text-amber-700" />
          <Summary label="Zakašnjeli planovi" value={summary.overdue} icon={FaExclamationTriangle} tone="bg-red-100 text-red-700" />
          <Summary label="Pokrivena oprema" value={`${summary.coveredAssets}/${assets.length}`} icon={FaQrcode} tone="bg-emerald-100 text-emerald-700" />
        </div>

        <div className="my-6 flex flex-wrap gap-2 rounded-xl bg-white p-2 shadow-sm">
          {[["all", "Svi"], ["due", "Dospjeli"], ["overdue", "Zakašnjeli"], ["inactive", "Neaktivni"]].map(([value, label]) => (
            <button key={value} onClick={() => setFilter(value)} className={`rounded-lg px-4 py-2 font-semibold ${filter === value ? "bg-indigo-600 text-white" : "text-slate-600"}`}>{label}</button>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {filteredPlans.map((plan) => (
            <section key={plan.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-indigo-600">{plan.work_order_type}</div>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">{plan.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">{plan.client_name} · {plan.station_name} · {plan.asset_name}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                  !plan.active ? "bg-slate-100 text-slate-500"
                    : plan.days_remaining < 0 ? "bg-red-100 text-red-700"
                    : plan.days_remaining <= plan.lead_days ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}>
                  {!plan.active ? "Neaktivan" : plan.days_remaining < 0 ? `${Math.abs(plan.days_remaining)} dana kasni` : `za ${plan.days_remaining} dana`}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                <div><b>Sljedeći termin</b><br />{new Intl.DateTimeFormat("hr-HR").format(new Date(plan.next_due_date))}</div>
                <div><b>Interval</b><br />svakih {plan.interval_value} {plan.interval_unit}</div>
                <div><b>Najava</b><br />{plan.lead_days} dana prije</div>
                <div><b>Checklista</b><br />{plan.checklist_template?.length || 0} stavki</div>
              </div>
              {canManage && <div className="mt-4 flex gap-2">
                <button onClick={() => openForm(plan)} className="flex-1 rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700">Uredi</button>
                <button onClick={() => generateOne(plan)} disabled={!plan.active} className="flex-1 rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-40">Generiraj nalog</button>
              </div>}
            </section>
          ))}
          {!filteredPlans.length && <div className="rounded-2xl bg-white p-12 text-center text-slate-400 lg:col-span-2">Nema planova u odabranom prikazu.</div>}
        </div>
      </div>

      {showForm && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4">
        <form onSubmit={save} className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
          <div className="border-b p-6"><h2 className="text-xl font-bold">{form.id ? "Uredi plan održavanja" : "Novi plan održavanja"}</h2></div>
          <div className="grid gap-4 p-6 md:grid-cols-2">
            <Field label="Oprema *"><select required disabled={Boolean(form.id)} value={form.asset_id} onChange={(e) => setForm({ ...form, asset_id: e.target.value })}><option value="">Odaberite opremu</option>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.client_name} · {asset.station_name} · {asset.name}</option>)}</select></Field>
            <Field label="Naziv plana *"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Vrsta naloga"><select value={form.work_order_type} onChange={(e) => setForm({ ...form, work_order_type: e.target.value })}><option>Preventive</option><option>Calibration</option><option>Inspection</option><option>Service</option></select></Field>
            <Field label="Sljedeći termin *"><input required type="date" value={form.next_due_date} onChange={(e) => setForm({ ...form, next_due_date: e.target.value })} /></Field>
            <Field label="Interval *"><input required type="number" min="1" value={form.interval_value} onChange={(e) => setForm({ ...form, interval_value: e.target.value })} /></Field>
            <Field label="Jedinica intervala"><select value={form.interval_unit} onChange={(e) => setForm({ ...form, interval_unit: e.target.value })}><option value="days">dana</option><option value="weeks">tjedana</option><option value="months">mjeseci</option><option value="years">godina</option></select></Field>
            <Field label="Najava dana prije"><input type="number" min="0" value={form.lead_days} onChange={(e) => setForm({ ...form, lead_days: e.target.value })} /></Field>
            <Field label="Odgovorni serviser"><select value={form.assigned_to[0] || ""} onChange={(e) => setForm({ ...form, assigned_to: e.target.value ? [Number(e.target.value)] : [] })}><option value="">Nije dodijeljen</option>{users.map((user) => <option key={user.id} value={user.id}>{user.firstname} {user.lastname}</option>)}</select></Field>
            <label className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /><span className="font-semibold">Aktivan plan</span></label>
            <label className="md:col-span-2"><span className="mb-2 block text-sm font-semibold">Opis posla</span><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-xl border p-3" /></label>
            <label className="md:col-span-2"><span className="mb-2 block text-sm font-semibold">Checklista — jedna stavka po retku</span><textarea rows={6} value={form.checklist_text} onChange={(e) => setForm({ ...form, checklist_text: e.target.value })} className="w-full rounded-xl border p-3" /></label>
          </div>
          <div className="flex justify-end gap-3 border-t p-6"><button type="button" onClick={() => setShowForm(false)} className="px-5 py-3">Odustani</button><button className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white">Spremi plan</button></div>
        </form>
      </div>}
    </div>
  );
};

const Summary = ({ label, value, icon: Icon, tone }) => <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className={`inline-flex rounded-xl p-3 ${tone}`}><Icon /></div><div className="mt-3 text-3xl font-bold">{value}</div><div className="text-sm text-slate-500">{label}</div></div>;
const Field = ({ label, children }) => <label><span className="mb-2 block text-sm font-semibold">{label}</span>{React.cloneElement(children, { className: "w-full rounded-xl border p-3" })}</label>;

export default Maintenance;
