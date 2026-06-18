import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FaGasPump, FaHeadset, FaMapMarkerAlt, FaPlus, FaTimes } from "react-icons/fa";
import { toast } from "sonner";
import useStore from "../store/index.js";
import { getClients } from "../services/clientsServices.js";
import {
  createServiceRequest,
  getServiceRequests,
  getStations,
} from "../services/serviceCenterServices.js";

const initialForm = {
  client_id: "",
  station_id: "",
  category: "service",
  priority: "normal",
  subject: "",
  description: "",
  desired_date: "",
};

const statusLabel = {
  new: "Novo",
  triage: "U obradi",
  scheduled: "Zakazano",
  in_progress: "U tijeku",
  waiting_client: "Čeka klijenta",
  resolved: "Riješeno",
  cancelled: "Otkazano",
};

const ServiceCenter = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useStore();
  const [tab, setTab] = useState("requests");
  const [requests, setRequests] = useState([]);
  const [stations, setStations] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(searchParams.get("newRequest") === "true");

  const load = async () => {
    setLoading(true);
    try {
      const [requestsResponse, stationsResponse] = await Promise.all([
        getServiceRequests(),
        getStations(),
      ]);
      setRequests(requestsResponse.data);
      setStations(stationsResponse.data);

      if (!user?.client_id) {
        const clientsResponse = await getClients();
        setClients(clientsResponse.data);
      }
    } catch {
      toast.error("Nije moguće učitati servisni centar.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const availableStations = useMemo(() => {
    if (user?.client_id) return stations;
    if (!form.client_id) return [];
    return stations.filter((station) => String(station.client_id) === String(form.client_id));
  }, [form.client_id, stations, user?.client_id]);

  const closeForm = () => {
    setShowForm(false);
    setSearchParams({});
    setForm(initialForm);
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createServiceRequest(form);
      toast.success("Servisni zahtjev je uspješno zaprimljen.");
      closeForm();
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Zahtjev nije moguće spremiti.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 pb-10 pt-24 sm:ml-16 sm:px-7">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Operativa</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Servisni centar</h1>
            <p className="mt-2 text-slate-500">Prijave kvarova, naručivanje servisa i pregled benzinskih stanica.</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700"
          >
            <FaPlus /> Novi zahtjev
          </button>
        </div>

        <div className="mb-5 flex gap-2 rounded-xl bg-white p-2 shadow-sm">
          <button
            onClick={() => setTab("requests")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold ${tab === "requests" ? "bg-indigo-600 text-white" : "text-slate-600"}`}
          >
            <FaHeadset /> Servisni zahtjevi
          </button>
          <button
            onClick={() => setTab("stations")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold ${tab === "stations" ? "bg-indigo-600 text-white" : "text-slate-600"}`}
          >
            <FaGasPump /> Benzinske stanice
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-12 text-center text-slate-500">Učitavanje…</div>
        ) : tab === "requests" ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Broj</th>
                    <th className="px-5 py-4">Zahtjev</th>
                    <th className="px-5 py-4">Klijent / stanica</th>
                    <th className="px-5 py-4">Prioritet</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Otvoreno</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map((request) => (
                    <tr key={request.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-5 py-4 text-sm font-bold text-indigo-600">{request.request_number}</td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800">{request.subject}</div>
                        <div className="mt-1 max-w-md truncate text-sm text-slate-500">{request.description}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        <div>{request.client_name}</div>
                        <div className="text-slate-400">{request.station_name || "Sve lokacije"}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">{request.priority}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                          {statusLabel[request.status] || request.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                        {new Intl.DateTimeFormat("hr-HR").format(new Date(request.created_at))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!requests.length && <div className="p-12 text-center text-slate-400">Nema servisnih zahtjeva.</div>}
            </div>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {stations.map((station) => (
              <div key={station.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
                    <FaGasPump />
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${station.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {station.active ? "Aktivna" : "Neaktivna"}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">{station.name}</h3>
                <p className="text-sm text-slate-500">{station.client_name}</p>
                <div className="mt-4 flex items-start gap-2 text-sm text-slate-600">
                  <FaMapMarkerAlt className="mt-1 text-slate-400" />
                  <span>{[station.address, station.city].filter(Boolean).join(", ") || "Adresa nije unesena"}</span>
                </div>
                <div className="mt-4 border-t border-slate-100 pt-4 text-sm font-semibold text-slate-600">
                  Evidentirana oprema: {station.registered_assets}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
          <form onSubmit={submitRequest} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Novi servisni zahtjev</h2>
                <p className="mt-1 text-sm text-slate-500">Opišite kvar, potreban servis ili pitanje za podršku.</p>
              </div>
              <button type="button" onClick={closeForm} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <FaTimes />
              </button>
            </div>
            <div className="grid gap-5 p-6 sm:grid-cols-2">
              {!user?.client_id && (
                <label className="sm:col-span-2">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Klijent *</span>
                  <select
                    required
                    value={form.client_id}
                    onChange={(event) => setForm({ ...form, client_id: event.target.value, station_id: "" })}
                    className="w-full rounded-xl border border-slate-300 p-3"
                  >
                    <option value="">Odaberite klijenta</option>
                    {clients.map((client) => <option key={client.id} value={client.id}>{client.company_name}</option>)}
                  </select>
                </label>
              )}
              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">Benzinska stanica</span>
                <select
                  value={form.station_id}
                  onChange={(event) => setForm({ ...form, station_id: event.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-3"
                >
                  <option value="">Sve lokacije / nije određeno</option>
                  {availableStations.map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">Vrsta zahtjeva</span>
                <select
                  value={form.category}
                  onChange={(event) => setForm({ ...form, category: event.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-3"
                >
                  <option value="service">Servis</option>
                  <option value="calibration">Umjeravanje / ovjera</option>
                  <option value="inspection">Pregled</option>
                  <option value="documentation">Dokumentacija</option>
                  <option value="support">Tehnička podrška</option>
                </select>
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">Prioritet</span>
                <select
                  value={form.priority}
                  onChange={(event) => setForm({ ...form, priority: event.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-3"
                >
                  <option value="low">Nizak</option>
                  <option value="normal">Normalan</option>
                  <option value="high">Visok</option>
                  <option value="urgent">Hitno</option>
                </select>
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">Željeni datum</span>
                <input
                  type="date"
                  value={form.desired_date}
                  onChange={(event) => setForm({ ...form, desired_date: event.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-3"
                />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Naslov *</span>
                <input
                  required
                  value={form.subject}
                  onChange={(event) => setForm({ ...form, subject: event.target.value })}
                  placeholder="npr. Točionik 2 ne prikazuje ispravnu količinu"
                  className="w-full rounded-xl border border-slate-300 p-3"
                />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Opis problema *</span>
                <textarea
                  required
                  rows={5}
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  placeholder="Navedite što se dogodilo, kada je problem počeo i utječe li na rad stanice."
                  className="w-full rounded-xl border border-slate-300 p-3"
                />
              </label>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 p-6">
              <button type="button" onClick={closeForm} className="rounded-xl px-5 py-3 font-semibold text-slate-600 hover:bg-slate-100">
                Odustani
              </button>
              <button disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                {saving ? "Spremanje…" : "Pošalji zahtjev"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ServiceCenter;
