import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaClipboardList,
  FaFileAlt,
  FaGasPump,
  FaPlus,
  FaTools,
  FaTrash,
  FaWrench,
} from "react-icons/fa";
import { toast } from "sonner";
import useStore from "../store";
import {
  createAsset,
  deleteAsset,
  getStation,
  updateAsset,
} from "../services/serviceCenterServices";

const emptyAsset = {
  id: null,
  asset_code: "",
  category: "Točionik",
  name: "",
  manufacturer: "",
  model: "",
  serial_number: "",
  official_mark: "",
  fuel_type: "",
  status: "active",
  criticality: "normal",
  location_description: "",
  next_service_at: "",
  calibration_expires_at: "",
  warranty_expires_at: "",
  notes: "",
};

const formatDate = (value) =>
  value ? new Intl.DateTimeFormat("hr-HR").format(new Date(value)) : "—";

const dateInput = (value) => value ? String(value).slice(0, 10) : "";

const StationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { permissions } = useStore();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("assets");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assetForm, setAssetForm] = useState(emptyAsset);
  const [showAssetForm, setShowAssetForm] = useState(false);

  const canManageAssets = permissions.includes("update_clients");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getStation(id);
      setData(response.data);
    } catch (error) {
      toast.error(error.response?.data?.error || "Nije moguće učitati benzinsku stanicu.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const openAssetForm = (asset = null) => {
    setAssetForm(asset ? {
      ...emptyAsset,
      ...asset,
      next_service_at: dateInput(asset.next_service_at),
      calibration_expires_at: dateInput(asset.calibration_expires_at),
      warranty_expires_at: dateInput(asset.warranty_expires_at),
    } : emptyAsset);
    setShowAssetForm(true);
  };

  const saveAsset = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (assetForm.id) {
        await updateAsset(assetForm.id, assetForm);
        toast.success("Oprema je ažurirana.");
      } else {
        await createAsset(id, assetForm);
        toast.success("Oprema je dodana u registar.");
      }
      setShowAssetForm(false);
      setAssetForm(emptyAsset);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Opremu nije moguće spremiti.");
    } finally {
      setSaving(false);
    }
  };

  const removeAsset = async (asset) => {
    if (!window.confirm(`Obrisati uređaj "${asset.name}" iz registra?`)) return;
    try {
      await deleteAsset(asset.id);
      toast.success("Oprema je uklonjena.");
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Opremu nije moguće obrisati.");
    }
  };

  const tabs = useMemo(() => [
    { id: "assets", label: "Oprema", count: data?.assets?.length || 0, icon: FaTools },
    { id: "requests", label: "Zahtjevi", count: data?.requests?.length || 0, icon: FaClipboardList },
    { id: "workOrders", label: "Radni nalozi", count: data?.workOrders?.length || 0, icon: FaWrench },
    { id: "documents", label: "Dokumenti", count: data?.documents?.length || 0, icon: FaFileAlt },
    { id: "deadlines", label: "Rokovi", count: data?.deadlines?.length || 0, icon: FaClipboardList },
  ], [data]);

  if (loading) {
    return <div className="min-h-screen bg-slate-100 pt-28 text-center text-slate-500">Učitavanje stanice…</div>;
  }
  if (!data) {
    return <div className="min-h-screen bg-slate-100 pt-28 text-center text-slate-500">Stanica nije pronađena.</div>;
  }

  const { station, summary } = data;

  return (
    <div className="min-h-screen bg-slate-100 px-4 pb-10 pt-24 sm:ml-16 sm:px-7">
      <div className="mx-auto max-w-7xl">
        <button onClick={() => navigate("/service-center")} className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600">
          <FaArrowLeft /> Servisni centar
        </button>

        <section className="rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-900 p-6 text-white shadow-xl">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div className="flex gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-2xl">
                <FaGasPump />
              </div>
              <div>
                <div className="text-sm font-semibold uppercase tracking-widest text-indigo-200">{station.client_name}</div>
                <h1 className="mt-1 text-3xl font-bold">{station.name}</h1>
                <p className="mt-2 text-slate-300">
                  {[station.address, station.city].filter(Boolean).join(", ") || "Adresa nije unesena"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {station.station_code && <span className="rounded-full bg-white/10 px-3 py-1">Šifra: {station.station_code}</span>}
                  {station.sttn && <span className="rounded-full bg-white/10 px-3 py-1">STTN: {station.sttn}</span>}
                  <span className={`rounded-full px-3 py-1 ${station.active ? "bg-emerald-500/30" : "bg-slate-500/30"}`}>
                    {station.active ? "Aktivna" : "Neaktivna"}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate(`/service-center?newRequest=true&stationId=${station.id}&clientId=${station.client_id}`)}
              className="rounded-xl bg-white px-5 py-3 font-bold text-indigo-800 hover:bg-indigo-50"
            >
              + Novi servisni zahtjev
            </button>
          </div>
        </section>

        <div className="my-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Oprema", summary.assets, "text-cyan-700 bg-cyan-100"],
            ["Otvoreni zahtjevi", summary.openRequests, "text-orange-700 bg-orange-100"],
            ["Aktivni nalozi", summary.activeWorkOrders, "text-indigo-700 bg-indigo-100"],
            ["Aktivni rokovi", summary.upcomingDeadlines, "text-red-700 bg-red-100"],
          ].map(([label, value, color]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className={`inline-flex rounded-lg px-3 py-1 text-xs font-bold ${color}`}>{label}</div>
              <div className="mt-3 text-3xl font-bold text-slate-900">{value}</div>
            </div>
          ))}
        </div>

        <div className="mb-5 flex gap-2 overflow-x-auto rounded-xl bg-white p-2 shadow-sm">
          {tabs.map(({ id: tabId, label, count, icon: Icon }) => (
            <button
              key={tabId}
              onClick={() => setTab(tabId)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 font-semibold ${
                tab === tabId ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon /> {label} <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs">{count}</span>
            </button>
          ))}
        </div>

        {tab === "assets" && (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="font-bold text-slate-900">Jedinstveni registar opreme</h2>
                <p className="text-sm text-slate-500">Sva oprema vezana uz ovu benzinsku stanicu</p>
              </div>
              {canManageAssets && (
                <button onClick={() => openAssetForm()} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white">
                  <FaPlus /> Dodaj opremu
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Oprema</th>
                    <th className="px-5 py-4">Identifikacija</th>
                    <th className="px-5 py-4">Lokacija</th>
                    <th className="px-5 py-4">Sljedeći servis</th>
                    <th className="px-5 py-4">Ovjera / kalibracija</th>
                    <th className="px-5 py-4">Status</th>
                    {canManageAssets && <th className="px-5 py-4">Akcije</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.assets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <button onClick={() => canManageAssets && openAssetForm(asset)} className="text-left">
                          <div className="font-bold text-slate-800">{asset.name}</div>
                          <div className="text-xs text-slate-500">{asset.category} · {[asset.manufacturer, asset.model].filter(Boolean).join(" ") || "—"}</div>
                        </button>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <div>{asset.asset_code || "Bez interne šifre"}</div>
                        <div className="text-xs text-slate-400">S/N: {asset.serial_number || "—"}</div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{asset.location_description || "—"}</td>
                      <td className="px-5 py-4 text-slate-600">{formatDate(asset.next_service_at)}</td>
                      <td className="px-5 py-4 text-slate-600">{formatDate(asset.calibration_expires_at)}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                          asset.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                        }`}>{asset.status}</span>
                      </td>
                      {canManageAssets && (
                        <td className="px-5 py-4">
                          <button onClick={() => removeAsset(asset)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><FaTrash /></button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.assets.length && <div className="p-12 text-center text-slate-400">Oprema još nije unesena u novi registar.</div>}
            </div>
          </section>
        )}

        {tab === "requests" && <SimpleList items={data.requests} empty="Nema servisnih zahtjeva." render={(item) => (
          <>
            <div><b>{item.request_number}</b> · {item.subject}</div>
            <div className="text-sm text-slate-500">{item.status} · {item.priority}</div>
          </>
        )} />}
        {tab === "workOrders" && <SimpleList items={data.workOrders} empty="Nema radnih naloga." render={(item) => (
          <>
            <div><b>{item.work_order_number || `WO-${item.id}`}</b> · {item.title}</div>
            <div className="text-sm text-slate-500">{item.status} · planirano {formatDate(item.planned_date)}</div>
          </>
        )} />}
        {tab === "documents" && <SimpleList items={data.documents} empty="Nema dokumenata." render={(item) => (
          <>
            <div><b>{item.title}</b></div>
            <div className="text-sm text-slate-500">{item.document_type} · vrijedi do {formatDate(item.valid_until)}</div>
          </>
        )} />}
        {tab === "deadlines" && <SimpleList items={data.deadlines} empty="Nema aktivnih rokova." render={(item) => (
          <>
            <div><b>{item.title}</b></div>
            <div className={`text-sm ${item.days_remaining < 0 ? "text-red-600" : "text-slate-500"}`}>
              {formatDate(item.due_date)} · {item.days_remaining < 0 ? `isteklo prije ${Math.abs(item.days_remaining)} dana` : `još ${item.days_remaining} dana`}
            </div>
          </>
        )} />}
      </div>

      {showAssetForm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4">
          <form onSubmit={saveAsset} className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 p-6">
              <h2 className="text-xl font-bold text-slate-900">{assetForm.id ? "Uredi opremu" : "Dodaj opremu"}</h2>
              <p className="mt-1 text-sm text-slate-500">Identifikacija, lokacija i servisno-mjeriteljski rokovi.</p>
            </div>
            <div className="grid gap-4 p-6 md:grid-cols-3">
              <Field label="Interna šifra"><input value={assetForm.asset_code} onChange={(e) => setAssetForm({ ...assetForm, asset_code: e.target.value })} /></Field>
              <Field label="Kategorija *"><input required value={assetForm.category} onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })} /></Field>
              <Field label="Naziv *"><input required value={assetForm.name} onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })} /></Field>
              <Field label="Proizvođač"><input value={assetForm.manufacturer} onChange={(e) => setAssetForm({ ...assetForm, manufacturer: e.target.value })} /></Field>
              <Field label="Model"><input value={assetForm.model} onChange={(e) => setAssetForm({ ...assetForm, model: e.target.value })} /></Field>
              <Field label="Serijski broj"><input value={assetForm.serial_number} onChange={(e) => setAssetForm({ ...assetForm, serial_number: e.target.value })} /></Field>
              <Field label="Službena oznaka"><input value={assetForm.official_mark} onChange={(e) => setAssetForm({ ...assetForm, official_mark: e.target.value })} /></Field>
              <Field label="Gorivo"><input value={assetForm.fuel_type} onChange={(e) => setAssetForm({ ...assetForm, fuel_type: e.target.value })} /></Field>
              <Field label="Lokacija na stanici"><input value={assetForm.location_description} onChange={(e) => setAssetForm({ ...assetForm, location_description: e.target.value })} /></Field>
              <Field label="Status"><select value={assetForm.status} onChange={(e) => setAssetForm({ ...assetForm, status: e.target.value })}><option value="active">Aktivno</option><option value="inactive">Neaktivno</option><option value="out_of_service">Izvan funkcije</option></select></Field>
              <Field label="Kritičnost"><select value={assetForm.criticality} onChange={(e) => setAssetForm({ ...assetForm, criticality: e.target.value })}><option value="low">Niska</option><option value="normal">Normalna</option><option value="high">Visoka</option><option value="critical">Kritična</option></select></Field>
              <Field label="Sljedeći servis"><input type="date" value={assetForm.next_service_at} onChange={(e) => setAssetForm({ ...assetForm, next_service_at: e.target.value })} /></Field>
              <Field label="Istek ovjere / kalibracije"><input type="date" value={assetForm.calibration_expires_at} onChange={(e) => setAssetForm({ ...assetForm, calibration_expires_at: e.target.value })} /></Field>
              <Field label="Istek jamstva"><input type="date" value={assetForm.warranty_expires_at} onChange={(e) => setAssetForm({ ...assetForm, warranty_expires_at: e.target.value })} /></Field>
              <label className="md:col-span-3"><span className="mb-2 block text-sm font-semibold text-slate-700">Napomena</span><textarea rows={3} value={assetForm.notes} onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })} className="w-full rounded-xl border border-slate-300 p-3" /></label>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 p-6">
              <button type="button" onClick={() => setShowAssetForm(false)} className="rounded-xl px-5 py-3 font-semibold text-slate-600 hover:bg-slate-100">Odustani</button>
              <button disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{saving ? "Spremanje…" : "Spremi opremu"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const Field = ({ label, children }) => (
  <label>
    <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
    {React.cloneElement(children, {
      className: "w-full rounded-xl border border-slate-300 p-3",
    })}
  </label>
);

const SimpleList = ({ items, empty, render }) => (
  <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
    {items.length ? items.map((item) => <div key={item.id} className="p-5">{render(item)}</div>) : <div className="p-12 text-center text-slate-400">{empty}</div>}
  </div>
);

export default StationDetails;
