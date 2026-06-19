import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaArchive, FaDownload, FaExclamationTriangle, FaFileAlt,
  FaHistory, FaSearch, FaUpload,
} from "react-icons/fa";
import { toast } from "sonner";
import useStore from "../store";
import {
  getDocumentCenter,
  getDocumentVersions,
  uploadDocumentVersion,
} from "../services/documentCenterServices.js";
import { downloadDocument } from "../services/serviceCenterServices.js";
import { downloadBlob } from "../libs/downloadBlob.js";

const initialFilters = {
  search: "", client_id: "", station_id: "", document_type: "", status: "", visibility: "",
};

const statusStyles = {
  expired: "bg-red-100 text-red-700",
  expiring: "bg-amber-100 text-amber-700",
  valid: "bg-emerald-100 text-emerald-700",
};

const DocumentCenter = () => {
  const permissions = useStore((state) => state.permissions);
  const canVersion = permissions.includes("manage_document_versions");
  const [data, setData] = useState({
    documents: [], summary: {}, filters: { clients: [], stations: [], types: [] },
  });
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState(null);
  const [versionDocument, setVersionDocument] = useState(null);
  const [versionForm, setVersionForm] = useState({
    file: null, issued_at: "", valid_until: "", tags: "", visible_to_client: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getDocumentCenter(filters);
      setData(response.data);
    } catch (error) {
      toast.error(error.response?.data?.error || "Dokumentni centar nije moguće učitati.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const visibleStations = useMemo(() => (
    filters.client_id
      ? data.filters.stations.filter((station) => String(station.client_id) === String(filters.client_id))
      : data.filters.stations
  ), [data.filters.stations, filters.client_id]);

  const showVersions = async (document) => {
    try {
      const response = await getDocumentVersions(document.id);
      setVersions({ document, items: response.data });
    } catch {
      toast.error("Povijest verzija nije moguće učitati.");
    }
  };

  const download = async (document) => {
    try {
      const response = await downloadDocument(document.id);
      downloadBlob(response.data, document.file_name);
    } catch {
      toast.error("Dokument nije moguće preuzeti.");
    }
  };

  const openVersionForm = (document) => {
    setVersionDocument(document);
    setVersionForm({
      file: null,
      issued_at: document.issued_at ? String(document.issued_at).slice(0, 10) : "",
      valid_until: "",
      tags: (document.tags || []).join(", "),
      visible_to_client: document.visible_to_client,
    });
  };

  const saveVersion = async (event) => {
    event.preventDefault();
    if (!versionForm.file) return;
    try {
      await uploadDocumentVersion(versionDocument.id, versionForm);
      toast.success("Nova verzija dokumenta je spremljena, prethodna je arhivirana.");
      setVersionDocument(null);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Novu verziju nije moguće spremiti.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 pb-10 pt-24 sm:ml-16 sm:px-7">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Dokumentacija</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Centralni dokumentni centar</h1>
          <p className="mt-2 text-slate-500">Sve potvrde, certifikati, zapisnici i ugovori s kontrolom verzija i isteka.</p>
        </header>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Summary label="Aktualni dokumenti" value={data.summary.total || 0} icon={FaFileAlt} color="indigo" />
          <Summary label="Istječu u 60 dana" value={data.summary.expiring || 0} icon={FaExclamationTriangle} color="amber" />
          <Summary label="Istekli" value={data.summary.expired || 0} icon={FaArchive} color="red" />
          <Summary label="Vidljivi klijentu" value={data.summary.client_visible || 0} icon={FaFileAlt} color="emerald" />
        </div>

        <section className="mb-5 rounded-2xl border bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <label className="relative md:col-span-2">
              <FaSearch className="absolute left-3 top-3.5 text-slate-400" />
              <input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Naziv, broj, datoteka, klijent…" className="w-full rounded-xl border py-3 pl-10 pr-3" />
            </label>
            <Filter value={filters.client_id} onChange={(value) => setFilters({ ...filters, client_id: value, station_id: "" })}>
              <option value="">Svi klijenti</option>
              {data.filters.clients.map((client) => <option key={client.id} value={client.id}>{client.company_name}</option>)}
            </Filter>
            <Filter value={filters.station_id} onChange={(value) => setFilters({ ...filters, station_id: value })}>
              <option value="">Sve stanice</option>
              {visibleStations.map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}
            </Filter>
            <Filter value={filters.document_type} onChange={(value) => setFilters({ ...filters, document_type: value })}>
              <option value="">Sve vrste</option>
              {data.filters.types.map((type) => <option key={type} value={type}>{type}</option>)}
            </Filter>
            <Filter value={filters.status} onChange={(value) => setFilters({ ...filters, status: value })}>
              <option value="">Svi statusi</option>
              <option value="valid">Važeći</option>
              <option value="expiring">Uskoro istječu</option>
              <option value="expired">Istekli</option>
            </Filter>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-4">Dokument</th><th className="p-4">Klijent / stanica</th>
                  <th className="p-4">Vrijedi do</th><th className="p-4">Verzija</th><th className="p-4">Akcije</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.documents.map((document) => (
                  <tr key={document.id} className="hover:bg-slate-50">
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{document.title}</div>
                      <div className="text-xs text-slate-400">{document.document_type} · {document.document_number || "bez broja"}</div>
                      {!!document.tags?.length && <div className="mt-1 flex flex-wrap gap-1">{document.tags.map((tag) => <span key={tag} className="rounded bg-slate-100 px-2 py-0.5 text-xs">{tag}</span>)}</div>}
                    </td>
                    <td className="p-4"><b>{document.client_name}</b><div className="text-xs text-slate-400">{document.station_name || "Bez stanice"}{document.asset_name ? ` · ${document.asset_name}` : ""}</div></td>
                    <td className="p-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[document.validity_status]}`}>
                        {document.valid_until ? new Intl.DateTimeFormat("hr-HR").format(new Date(document.valid_until)) : "Bez isteka"}
                      </span>
                      {document.days_remaining != null && <div className="mt-1 text-xs text-slate-400">{document.days_remaining < 0 ? `${Math.abs(document.days_remaining)} dana istekao` : `${document.days_remaining} dana`}</div>}
                    </td>
                    <td className="p-4 font-semibold">v{document.version_number}</td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <Action onClick={() => download(document)} title="Preuzmi"><FaDownload /></Action>
                        <Action onClick={() => showVersions(document)} title="Povijest"><FaHistory /></Action>
                        {canVersion && <Action onClick={() => openVersionForm(document)} title="Nova verzija"><FaUpload /></Action>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && !data.documents.length && <div className="p-12 text-center text-slate-400">Nema dokumenata za odabrane filtre.</div>}
          {loading && <div className="p-12 text-center text-slate-400">Učitavanje dokumenata…</div>}
        </section>
      </div>

      {versions && <Modal title={`Verzije · ${versions.document.title}`} onClose={() => setVersions(null)}>
        <div className="space-y-2">
          {versions.items.map((item) => (
            <button key={item.id} onClick={() => download(item)} className="flex w-full items-center justify-between rounded-xl border p-3 text-left hover:bg-slate-50">
              <span><b>v{item.version_number}</b> · {item.file_name}<span className="ml-2 text-xs text-slate-400">{item.uploaded_by_name}</span></span>
              <span className={`rounded-full px-2 py-1 text-xs ${item.is_current ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{item.is_current ? "Aktualna" : "Arhivirana"}</span>
            </button>
          ))}
        </div>
      </Modal>}

      {versionDocument && <Modal title={`Nova verzija · ${versionDocument.title}`} onClose={() => setVersionDocument(null)}>
        <form onSubmit={saveVersion} className="space-y-3">
          <input required type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx" onChange={(e) => setVersionForm({ ...versionForm, file: e.target.files?.[0] || null })} className="w-full rounded-xl border p-3" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Datum izdavanja"><input type="date" value={versionForm.issued_at} onChange={(e) => setVersionForm({ ...versionForm, issued_at: e.target.value })} /></Field>
            <Field label="Vrijedi do"><input type="date" value={versionForm.valid_until} onChange={(e) => setVersionForm({ ...versionForm, valid_until: e.target.value })} /></Field>
          </div>
          <Field label="Oznake"><input value={versionForm.tags} onChange={(e) => setVersionForm({ ...versionForm, tags: e.target.value })} placeholder="certifikat, AMN, godišnji" /></Field>
          <label className="flex items-center gap-2"><input type="checkbox" checked={versionForm.visible_to_client} onChange={(e) => setVersionForm({ ...versionForm, visible_to_client: e.target.checked })} /> Vidljivo klijentu</label>
          <button className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white">Spremi novu verziju</button>
        </form>
      </Modal>}
    </div>
  );
};

const colors = {
  indigo: "bg-indigo-100 text-indigo-700", amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700", emerald: "bg-emerald-100 text-emerald-700",
};
const Summary = ({ label, value, icon: Icon, color }) => <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className={`inline-flex rounded-xl p-3 ${colors[color]}`}><Icon /></div><div className="mt-3 text-3xl font-bold">{value}</div><div className="text-sm text-slate-500">{label}</div></div>;
const Filter = ({ value, onChange, children }) => <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-xl border p-3">{children}</select>;
const Action = ({ onClick, title, children }) => <button onClick={onClick} title={title} className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50">{children}</button>;
const Field = ({ label, children }) => <label><span className="mb-1 block text-sm font-semibold text-slate-600">{label}</span>{React.cloneElement(children, { className: "w-full rounded-xl border p-3" })}</label>;
const Modal = ({ title, onClose, children }) => <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6"><div className="mb-4 flex justify-between"><h2 className="text-xl font-bold">{title}</h2><button onClick={onClose}>✕</button></div>{children}</div></div>;

export default DocumentCenter;
