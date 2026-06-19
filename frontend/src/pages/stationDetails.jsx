import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaClipboardList,
  FaDownload,
  FaFileAlt,
  FaGasPump,
  FaPlus,
  FaQrcode,
  FaTools,
  FaTrash,
  FaWrench,
} from "react-icons/fa";
import { toast } from "sonner";
import useStore from "../store";
import {
  createAsset,
  createDeadline,
  deleteAsset,
  deleteDeadline,
  deleteDocument,
  getStation,
  downloadDocument,
  uploadDocument,
  updateDeadline,
  updateAsset,
} from "../services/serviceCenterServices";
import { downloadBlob } from "../libs/downloadBlob.js";
import QRCode from "qrcode";
import { ensureAssetToken } from "../services/maintenanceServices.js";

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

const emptyDocument = {
  document_type: "Servisni zapisnik",
  title: "",
  document_number: "",
  file: null,
  asset_id: "",
  issued_at: "",
  valid_until: "",
  visible_to_client: true,
};

const emptyDeadline = {
  deadline_type: "Umjeravanje",
  title: "",
  due_date: "",
  warning_days: 30,
  asset_id: "",
  document_id: "",
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
  const [documentForm, setDocumentForm] = useState(emptyDocument);
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  const [deadlineForm, setDeadlineForm] = useState(emptyDeadline);
  const [showDeadlineForm, setShowDeadlineForm] = useState(false);
  const [qrAsset, setQrAsset] = useState(null);
  const [qrImage, setQrImage] = useState("");

  const canManageAssets = permissions.includes("manage_assets");
  const canDeleteAssets = permissions.includes("delete_assets");
  const canManageAssetQr = permissions.includes("manage_asset_qr");
  const canManageDocuments = permissions.includes("create_documents");
  const canDeleteDocuments = permissions.includes("delete_documents");
  const canManageDeadlines = permissions.includes("manage_deadlines");

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

  const showQr = async (asset) => {
    try {
      let token = asset.public_token;
      if (!token) {
        const response = await ensureAssetToken(asset.id);
        token = response.data.public_token;
      }
      const url = `${window.location.origin}/asset/${token}`;
      const image = await QRCode.toDataURL(url, {
        width: 320,
        margin: 2,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      setQrAsset({ ...asset, public_token: token, url });
      setQrImage(image);
    } catch {
      toast.error("QR oznaku nije moguće generirati.");
    }
  };

  const printQr = () => {
    const printWindow = window.open("", "_blank", "width=640,height=760");
    if (!printWindow || !qrAsset) return;
    printWindow.document.write(`
      <html><head><title>QR - ${qrAsset.name}</title>
      <style>body{font-family:Arial;text-align:center;padding:32px;color:#0f172a}
      img{width:320px;height:320px}.card{border:2px solid #0f172a;border-radius:18px;padding:28px}
      h1{margin:10px 0 4px}.muted{color:#64748b}</style></head>
      <body><div class="card"><div class="muted">FlowApp servisna kartica</div>
      <h1>${qrAsset.name}</h1><div>${qrAsset.asset_code || qrAsset.serial_number || ""}</div>
      <img src="${qrImage}" alt="QR kod"/><div class="muted">${qrAsset.url}</div></div></body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  const saveDocument = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await uploadDocument(id, documentForm);
      toast.success("Dokument je učitan.");
      setDocumentForm(emptyDocument);
      setShowDocumentForm(false);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Dokument nije moguće spremiti.");
    } finally {
      setSaving(false);
    }
  };

  const downloadStoredDocument = async (document) => {
    try {
      const response = await downloadDocument(document.id);
      downloadBlob(response.data, document.file_name);
    } catch (error) {
      toast.error(error.response?.data?.error || "Dokument nije moguće preuzeti.");
    }
  };

  const removeDocument = async (document) => {
    if (!window.confirm(`Obrisati dokument "${document.title}"?`)) return;
    try {
      await deleteDocument(document.id);
      toast.success("Dokument je obrisan.");
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Dokument nije moguće obrisati.");
    }
  };

  const saveDeadline = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createDeadline(id, deadlineForm);
      toast.success("Rok je dodan.");
      setDeadlineForm(emptyDeadline);
      setShowDeadlineForm(false);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Rok nije moguće spremiti.");
    } finally {
      setSaving(false);
    }
  };

  const completeDeadline = async (deadline) => {
    try {
      await updateDeadline(deadline.id, { status: "completed" });
      toast.success("Rok je označen završenim.");
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Rok nije moguće ažurirati.");
    }
  };

  const removeDeadline = async (deadline) => {
    if (!window.confirm(`Obrisati rok "${deadline.title}"?`)) return;
    try {
      await deleteDeadline(deadline.id);
      toast.success("Rok je obrisan.");
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Rok nije moguće obrisati.");
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
                    {(canManageAssets || canDeleteAssets || canManageAssetQr) && <th className="px-5 py-4">Akcije</th>}
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
                      {(canManageAssets || canDeleteAssets || canManageAssetQr) && (
                        <td className="flex gap-1 px-5 py-4">
                          {canManageAssetQr && <button onClick={() => showQr(asset)} className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50" title="QR oznaka"><FaQrcode /></button>}
                          {canDeleteAssets && <button onClick={() => removeAsset(asset)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><FaTrash /></button>}
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
        {tab === "documents" && (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeader
              title="Dokumentni centar"
              subtitle="Certifikati, zapisnici, ugovori i ostala dokumentacija"
              canAdd={canManageDocuments}
              onAdd={() => setShowDocumentForm(true)}
              addLabel="Dodaj dokument"
            />
            <div className="divide-y divide-slate-100">
              {data.documents.map((item) => (
                <div key={item.id} className="flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center">
                  <div>
                    <div className="font-bold text-slate-800">{item.title}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {item.document_type} · {item.document_number || "bez broja"} · {item.file_name}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Vrijedi do {formatDate(item.valid_until)} · {item.visible_to_client ? "vidljivo klijentu" : "interno"}
                    </div>
                  </div>
                  {canDeleteDocuments && (
                    <div className="flex gap-2">
                      <button onClick={() => downloadStoredDocument(item)} className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50" title="Preuzmi"><FaDownload /></button>
                      <button onClick={() => removeDocument(item)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" title="Obriši"><FaTrash /></button>
                    </div>
                  )}
                  {!canDeleteDocuments && (
                    <button onClick={() => downloadStoredDocument(item)} className="self-start rounded-lg p-2 text-indigo-600 hover:bg-indigo-50" title="Preuzmi"><FaDownload /></button>
                  )}
                </div>
              ))}
              {!data.documents.length && <EmptyState text="Nema dokumenata." />}
            </div>
          </section>
        )}
        {tab === "deadlines" && (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeader
              title="Rokovi i usklađenost"
              subtitle="Umjeravanja, ovjere, pregledi, servisi i ugovori"
              canAdd={canManageDeadlines}
              onAdd={() => setShowDeadlineForm(true)}
              addLabel="Dodaj rok"
            />
            <div className="divide-y divide-slate-100">
              {data.deadlines.map((item) => (
                <div key={item.id} className="flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center">
                  <div>
                    <div className="font-bold text-slate-800">{item.title}</div>
                    <div className={`mt-1 text-sm ${item.days_remaining < 0 ? "font-semibold text-red-600" : "text-slate-500"}`}>
                      {item.deadline_type} · {formatDate(item.due_date)} · {item.days_remaining < 0 ? `isteklo prije ${Math.abs(item.days_remaining)} dana` : `još ${item.days_remaining} dana`}
                    </div>
                  </div>
                  {canManageDeadlines && (
                    <div className="flex gap-2">
                      <button onClick={() => completeDeadline(item)} className="rounded-lg bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700">Završeno</button>
                      <button onClick={() => removeDeadline(item)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><FaTrash /></button>
                    </div>
                  )}
                </div>
              ))}
              {!data.deadlines.length && <EmptyState text="Nema aktivnih rokova." />}
            </div>
          </section>
        )}
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

      {showDocumentForm && (
        <ModalForm title="Dodaj dokument" onClose={() => setShowDocumentForm(false)} onSubmit={saveDocument} saving={saving}>
          <Field label="Vrsta dokumenta *"><input required value={documentForm.document_type} onChange={(e) => setDocumentForm({ ...documentForm, document_type: e.target.value })} /></Field>
          <Field label="Naziv dokumenta *"><input required value={documentForm.title} onChange={(e) => setDocumentForm({ ...documentForm, title: e.target.value })} /></Field>
          <Field label="Broj dokumenta"><input value={documentForm.document_number} onChange={(e) => setDocumentForm({ ...documentForm, document_number: e.target.value })} /></Field>
          <Field label="Datoteka *"><input required type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx" onChange={(e) => setDocumentForm({ ...documentForm, file: e.target.files?.[0] || null })} /></Field>
          <Field label="Povezana oprema"><select value={documentForm.asset_id} onChange={(e) => setDocumentForm({ ...documentForm, asset_id: e.target.value })}><option value="">Cijela stanica</option>{data.assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select></Field>
          <Field label="Datum izdavanja"><input type="date" value={documentForm.issued_at} onChange={(e) => setDocumentForm({ ...documentForm, issued_at: e.target.value })} /></Field>
          <Field label="Vrijedi do"><input type="date" value={documentForm.valid_until} onChange={(e) => setDocumentForm({ ...documentForm, valid_until: e.target.value })} /></Field>
          <label className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <input type="checkbox" checked={documentForm.visible_to_client} onChange={(e) => setDocumentForm({ ...documentForm, visible_to_client: e.target.checked })} />
            <span className="text-sm font-semibold text-slate-700">Dokument je vidljiv klijentu</span>
          </label>
        </ModalForm>
      )}

      {showDeadlineForm && (
        <ModalForm title="Dodaj rok" onClose={() => setShowDeadlineForm(false)} onSubmit={saveDeadline} saving={saving}>
          <Field label="Vrsta roka *"><select value={deadlineForm.deadline_type} onChange={(e) => setDeadlineForm({ ...deadlineForm, deadline_type: e.target.value })}><option>Umjeravanje</option><option>Ovjera</option><option>Redovni servis</option><option>Tehnički pregled</option><option>Dokument</option><option>Ugovor</option><option>Jamstvo</option></select></Field>
          <Field label="Naziv roka *"><input required value={deadlineForm.title} onChange={(e) => setDeadlineForm({ ...deadlineForm, title: e.target.value })} /></Field>
          <Field label="Datum isteka *"><input required type="date" value={deadlineForm.due_date} onChange={(e) => setDeadlineForm({ ...deadlineForm, due_date: e.target.value })} /></Field>
          <Field label="Upozori dana prije"><input type="number" min="0" value={deadlineForm.warning_days} onChange={(e) => setDeadlineForm({ ...deadlineForm, warning_days: e.target.value })} /></Field>
          <Field label="Povezana oprema"><select value={deadlineForm.asset_id} onChange={(e) => setDeadlineForm({ ...deadlineForm, asset_id: e.target.value })}><option value="">Cijela stanica</option>{data.assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select></Field>
          <Field label="Povezani dokument"><select value={deadlineForm.document_id} onChange={(e) => setDeadlineForm({ ...deadlineForm, document_id: e.target.value })}><option value="">Bez dokumenta</option>{data.documents.map((document) => <option key={document.id} value={document.id}>{document.title}</option>)}</select></Field>
          <label className="md:col-span-2"><span className="mb-2 block text-sm font-semibold text-slate-700">Napomena</span><textarea rows={3} value={deadlineForm.notes} onChange={(e) => setDeadlineForm({ ...deadlineForm, notes: e.target.value })} className="w-full rounded-xl border border-slate-300 p-3" /></label>
        </ModalForm>
      )}

      {qrAsset && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="text-sm font-semibold uppercase tracking-widest text-indigo-600">QR servisna kartica</div>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">{qrAsset.name}</h2>
            <p className="mt-1 text-sm text-slate-500">{qrAsset.asset_code || qrAsset.serial_number || "Bez interne oznake"}</p>
            <img src={qrImage} alt={`QR kod za ${qrAsset.name}`} className="mx-auto my-5 h-72 w-72" />
            <p className="break-all rounded-xl bg-slate-50 p-3 text-xs text-slate-500">{qrAsset.url}</p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setQrAsset(null)} className="flex-1 rounded-xl border px-4 py-3 font-semibold text-slate-600">Zatvori</button>
              <button onClick={printQr} className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white">Ispiši naljepnicu</button>
            </div>
          </div>
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

const SectionHeader = ({ title, subtitle, canAdd, onAdd, addLabel }) => (
  <div className="flex items-center justify-between border-b border-slate-100 p-5">
    <div><h2 className="font-bold text-slate-900">{title}</h2><p className="text-sm text-slate-500">{subtitle}</p></div>
    {canAdd && <button onClick={onAdd} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white"><FaPlus /> {addLabel}</button>}
  </div>
);

const EmptyState = ({ text }) => <div className="p-12 text-center text-slate-400">{text}</div>;

const ModalForm = ({ title, onClose, onSubmit, saving, children }) => (
  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4">
    <form onSubmit={onSubmit} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
      <div className="border-b border-slate-100 p-6"><h2 className="text-xl font-bold text-slate-900">{title}</h2></div>
      <div className="grid gap-4 p-6 md:grid-cols-2">{children}</div>
      <div className="flex justify-end gap-3 border-t border-slate-100 p-6">
        <button type="button" onClick={onClose} className="rounded-xl px-5 py-3 font-semibold text-slate-600 hover:bg-slate-100">Odustani</button>
        <button disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{saving ? "Spremanje…" : "Spremi"}</button>
      </div>
    </form>
  </div>
);

export default StationDetails;
