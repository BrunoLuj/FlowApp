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
    return status ? 'Active' : 'Inactive';
  }

  const removeClient = async (client) => {
    await deleteClient(client.id);
    setClients(clients.filter(p => p.id !== client.id));
  };

  const startEditing = (client) => {
    navigate('/client', { state: { client } });
  };

  return (

    <div className="bg-gray-100 min-h-screen p-4 mt-14 sm:ml-16">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Clients</h1>
        {permissions.includes('create_clients') && (
          <button
            onClick={() => navigate('/client/')}
            className="mb-6 px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold shadow-lg hover:scale-105 transition transform"
          >
            Add Client
          </button>
        )}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by client name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 rounded-xl border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 pl-10 transition"
          />
          <FaSearch className="absolute left-3 top-3 text-gray-400"/>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-3 rounded-xl border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition w-full sm:w-48"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Clients Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-2xl shadow-xl overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3 px-4 text-left text-gray-600">Company Name</th>
              <th className="py-3 px-4 text-left text-gray-600">Address</th>
              <th className="py-3 px-4 text-left text-gray-600">ID Number</th>
              <th className="py-3 px-4 text-left text-gray-600">PDV Number</th>
              <th className="py-3 px-4 text-left text-gray-600">Contact Person</th>
              <th className="py-3 px-4 text-left text-gray-600">Phone</th>
              <th className="py-3 px-4 text-left text-gray-600">Email</th>
              <th className="py-3 px-4 text-left text-gray-600">Status</th>
              <th className="py-3 px-4 text-left text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-6 text-gray-500">Loading...</td></tr>
            ) : error ? (
              <tr><td colSpan={9} className="text-center py-6 text-red-500">{error.message}</td></tr>
            ) : (
              filteredClients.map(client => (
                <tr key={client.id} className="hover:bg-gray-50 cursor-pointer transition" onClick={() => startEditing(client)}>
                  <td className="py-3 px-4 border-b">{client.company_name}</td>
                  <td className="py-3 px-4 border-b">{client.address}</td>
                  <td className="py-3 px-4 border-b">{client.idbroj}</td>
                  <td className="py-3 px-4 border-b">{client.pdvbroj}</td>
                  <td className="py-3 px-4 border-b">{client.contact_person}</td>
                  <td className="py-3 px-4 border-b">{client.phone}</td>
                  <td className="py-3 px-4 border-b">{client.email}</td>
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
                        Edit
                      </button>
                    )}
                    {permissions.includes('delete_clients') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeClient(client); }}
                        className="bg-red-500 text-white px-4 py-1 rounded-lg shadow hover:bg-red-600 transition"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Clients;
