import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/index.js';
import { deleteClient, getClients } from '../services/clientsServices.js';
import { FaSearch } from 'react-icons/fa';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const navigate = useNavigate();
  const { permissions } = useStore();

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await getClients();
        setClients(response.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  const filteredClients = clients.filter(client => {
    const matchesName = client.company_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && client.status) || 
      (statusFilter === 'inactive' && !client.status);
    return matchesName && matchesStatus;
  });

  const getStatusClass = (status) => {
    return status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
  };

  const getStatusText = (status) => {
    return status ? 'Aktivan' : 'Neaktivan';
  }

  const removeClient = async (client) => {
    await deleteClient(client.id);
    setClients(clients.filter(p => p.id !== client.id));
  };

  const startEditing = (client) => {
    navigate('/client', { state: { client } });
  };

  return (

    <div className="min-h-screen bg-slate-100 px-4 pb-10 pt-24 sm:px-7">
      <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-black uppercase tracking-widest text-orange-600">Organizacija</p><h1 className="text-3xl font-black text-slate-900">Klijenti</h1><p className="mt-2 text-slate-500">Centralni registar poslovnih korisnika i kontakata.</p></div>
        {permissions.includes('create_clients') && (
          <button
            onClick={() => navigate('/client/')}
            className="rounded-xl bg-orange-500 px-5 py-3 font-bold text-white shadow-lg shadow-orange-200 hover:bg-orange-600"
          >
            + Novi klijent
          </button>
        )}
      </div>

      {/* Search & Filter */}
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Pretraži naziv klijenta…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-3"
          />
          <FaSearch className="absolute left-3 top-3 text-gray-400"/>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full rounded-xl border border-slate-300 p-3 sm:w-48"
        >
          <option value="all">Svi statusi</option>
          <option value="active">Aktivni</option>
          <option value="inactive">Neaktivni</option>
        </select>
      </div>

      {/* Clients Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th>Klijent</th><th>Lokacija</th><th>Identifikacija</th><th>Kontakt</th><th>Status</th><th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-12 text-center text-slate-400">Učitavanje klijenata…</td></tr>
            ) : error ? (
              <tr><td colSpan={6} className="text-center py-6 text-red-500">{error.message}</td></tr>
            ) : (
              filteredClients.map(client => (
                <tr key={client.id} className="hover:bg-gray-50 cursor-pointer transition" onClick={() => startEditing(client)}>
                  <td><div className="font-black text-slate-900">{client.company_name}</div><div className="mt-1 text-xs text-slate-400">{client.contact_person || "Kontakt osoba nije unesena"}</div></td>
                  <td><div>{client.address || "—"}</div></td>
                  <td><div className="text-xs text-slate-500">ID: <b className="text-slate-700">{client.idbroj || "—"}</b></div><div className="mt-1 text-xs text-slate-500">PDV: <b className="text-slate-700">{client.pdvbroj || "—"}</b></div></td>
                  <td><div>{client.phone || "—"}</div><div className="mt-1 text-xs text-slate-500">{client.email || "E-mail nije unesen"}</div></td>
                  <td className="py-3 px-4 border-b text-center">
                    <span className={`px-3 py-1 rounded-full font-semibold ${getStatusClass(client.status)}`}>
                      {getStatusText(client.status)}
                    </span>
                  </td>
                  <td className="py-3 px-4 border-b flex gap-2 flex-wrap">
                    {permissions.includes('update_clients') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); startEditing(client); }}
                        className="bg-yellow-400 text-white px-4 py-1 rounded-lg shadow hover:bg-yellow-500 transition"
                      >
                        Uredi
                      </button>
                    )}
                    {permissions.includes('delete_clients') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeClient(client); }}
                        className="bg-red-500 text-white px-4 py-1 rounded-lg shadow hover:bg-red-600 transition"
                      >
                        Izbriši
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div></div></div>
    </div>
  );
};

export default Clients;
