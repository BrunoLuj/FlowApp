import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FaGasPump, FaHeadset, FaMapMarkerAlt, FaPlus, FaTimes } from "react-icons/fa";
import { toast } from "sonner";
import useStore from "../store/index.js";
import { getClients } from "../services/clientsServices.js";
import {
  addServiceRequestMessage,
  convertServiceRequestToWorkOrder,
  createServiceRequest,
  getServiceRequest,
  getServiceRequests,
  getStations,
} from "../services/serviceCenterServices.js";
import { getUsers } from "../services/usersServices.js";

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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, permissions } = useStore();
  const [tab, setTab] = useState("requests");
  const [requests, setRequests] = useState([]);
  const [stations, setStations] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(searchParams.get("newRequest") === "true");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [workOrderForm, setWorkOrderForm] = useState({
    assigned_to: [],
    planned_date: "",
    status: "Open",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [requestsResponse, stationsResponse] = await Promise.all([
        getServiceRequests(),
        getStations(),
      ]);
      setRequests(requestsResponse.data);
      setStations(stationsResponse.data);

      if (!user?.client_id) {
        const [clientsResponse, usersResponse] = await Promise.all([
          getClients(),
          getUsers(),
        ]);
        setClients(clientsResponse.data);
        setUsers(usersResponse.data || []);
      }
    } catch {
      toast.error("Nije moguće učitati servisni centar.");
    } finally {
      setLoading(false);
    }
  }, [user?.client_id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const stationId = searchParams.get("stationId");
    const clientId = searchParams.get("clientId");
    if (stationId || clientId) {
      setForm((current) => ({
        ...current,
        station_id: stationId || current.station_id,
        client_id: clientId || current.client_id,
      }));
    }
  }, [searchParams]);

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

  const openRequest = async (id) => {
    setRequestLoading(true);
    try {
      const response = await getServiceRequest(id);
      setSelectedRequest(response.data);
      setWorkOrderForm({
        assigned_to: response.data.assigned_to ? [response.data.assigned_to] : [],
        planned_date: response.data.desired_date ? String(response.data.desired_date).slice(0, 10) : "",
        status: "Open",
      });
    } catch (error) {
      toast.error(error.response?.data?.error || "Zahtjev nije moguće otvoriti.");
    } finally {
      setRequestLoading(false);
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!message.trim()) return;
    try {
      await addServiceRequestMessage(selectedRequest.id, { message: message.trim() });
      setMessage("");
      await openRequest(selectedRequest.id);
    } catch (error) {
      toast.error(error.response?.data?.error || "Poruku nije moguće poslati.");
    }
  };

  const createWorkOrder = async () => {
    try {
      const response = await convertServiceRequestToWorkOrder(selectedRequest.id, workOrderForm);
      toast.success(`Radni nalog ${response.data.workOrder.work_order_number || ""} je kreiran.`);
      setSelectedRequest(null);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Radni nalog nije moguće kreirati.");
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
                    <tr
                      key={request.id}
                      onClick={() => openRequest(request.id)}
                      className="cursor-pointer hover:bg-slate-50"
                    >
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
              <button
                key={station.id}
                onClick={() => navigate(`/service-center/stations/${station.id}`)}
                className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
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
              </button>
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

      {(selectedRequest || requestLoading) && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {requestLoading && !selectedRequest ? (
              <div className="p-12 text-center text-slate-500">Učitavanje zahtjeva…</div>
            ) : selectedRequest && (
              <>
                <div className="flex items-start justify-between border-b border-slate-100 p-6">
                  <div>
                    <div className="text-sm font-bold text-indigo-600">{selectedRequest.request_number}</div>
                    <h2 className="mt-1 text-2xl font-bold text-slate-900">{selectedRequest.subject}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedRequest.client_name} · {selectedRequest.station_name || "Stanica nije određena"}
                    </p>
                  </div>
                  <button onClick={() => setSelectedRequest(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><FaTimes /></button>
                </div>

                <div className="grid gap-6 p-6 lg:grid-cols-3">
                  <div className="space-y-5 lg:col-span-2">
                    <section>
                      <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Opis problema</h3>
                      <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-slate-700">{selectedRequest.description}</p>
                    </section>
                    <section>
                      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Razgovor</h3>
                      <div className="space-y-3">
                        {selectedRequest.messages?.map((item) => (
                          <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                            <div className="flex justify-between gap-3 text-xs text-slate-400">
                              <b className="text-slate-600">{item.author_name || "Korisnik"}</b>
                              <span>{new Intl.DateTimeFormat("hr-HR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.created_at))}</span>
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{item.message}</p>
                          </div>
                        ))}
                        {!selectedRequest.messages?.length && <div className="text-sm text-slate-400">Još nema poruka.</div>}
                      </div>
                      <form onSubmit={sendMessage} className="mt-4 flex gap-2">
                        <input
                          value={message}
                          onChange={(event) => setMessage(event.target.value)}
                          placeholder="Dodaj poruku…"
                          className="flex-1 rounded-xl border border-slate-300 p-3"
                        />
                        <button className="rounded-xl bg-slate-900 px-5 font-semibold text-white">Pošalji</button>
                      </form>
                    </section>
                  </div>

                  <aside className="space-y-4">
                    <div className="rounded-xl border border-slate-200 p-4 text-sm">
                      <div className="mb-3 font-bold text-slate-800">Podaci zahtjeva</div>
                      <div className="space-y-2 text-slate-600">
                        <div>Status: <b>{statusLabel[selectedRequest.status] || selectedRequest.status}</b></div>
                        <div>Prioritet: <b>{selectedRequest.priority}</b></div>
                        <div>Vrsta: <b>{selectedRequest.category}</b></div>
                        <div>Oprema: <b>{selectedRequest.asset_name || "Nije odabrana"}</b></div>
                        <div>Željeni datum: <b>{selectedRequest.desired_date ? new Intl.DateTimeFormat("hr-HR").format(new Date(selectedRequest.desired_date)) : "—"}</b></div>
                      </div>
                    </div>

                    {permissions.includes("create_work_orders") && !selectedRequest.converted_work_order_id && (
                      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                        <div className="font-bold text-indigo-900">Kreiraj radni nalog</div>
                        <p className="mt-1 text-xs text-indigo-700">Zahtjev će prijeći u status “Zakazano”.</p>
                        <label className="mt-4 block text-xs font-bold text-slate-600">Planirani datum</label>
                        <input
                          type="date"
                          value={workOrderForm.planned_date}
                          onChange={(event) => setWorkOrderForm({ ...workOrderForm, planned_date: event.target.value })}
                          className="mt-1 w-full rounded-lg border border-indigo-200 bg-white p-2"
                        />
                        <label className="mt-3 block text-xs font-bold text-slate-600">Dodijeli serviseru</label>
                        <select
                          value={workOrderForm.assigned_to[0] || ""}
                          onChange={(event) => setWorkOrderForm({ ...workOrderForm, assigned_to: event.target.value ? [Number(event.target.value)] : [] })}
                          className="mt-1 w-full rounded-lg border border-indigo-200 bg-white p-2"
                        >
                          <option value="">Nije dodijeljeno</option>
                          {users.map((item) => <option key={item.id} value={item.id}>{item.firstname} {item.lastname}</option>)}
                        </select>
                        <button
                          onClick={createWorkOrder}
                          className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-3 font-bold text-white hover:bg-indigo-700"
                        >
                          Kreiraj radni nalog
                        </button>
                      </div>
                    )}

                    {selectedRequest.converted_work_order_id && (
                      <div className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                        Radni nalog je već kreiran.
                      </div>
                    )}
                  </aside>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceCenter;
