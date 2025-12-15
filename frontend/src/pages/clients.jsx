import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/index.js';
import { deleteClient, getClients } from '../services/clientsServices.js';

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

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  const filteredClients = clients.filter(client => {
    const matchesName = client.company_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && client.status) || 
      (statusFilter === 'inactive' && !client.status);
    return matchesName && matchesStatus;
  });

  const getStatusClass = (status) => {
    return status ? { class: 'bg-green-100' } : { class: 'bg-red-100' };
  };

  const getStatusText = (status) => {
    return status ? { text: 'Active', class: 'bg-green-400' } : { text: 'Inactive', class: 'bg-red-400' };
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
      <h1 className="text-2xl font-bold mb-6">Clients</h1>
      
      {permissions.includes('create_clients') && (
        <button
          onClick={() => navigate('/client/')}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg mb-4 w-full sm:w-auto"
        >
          Add Client
        </button>
      )}

      <div className="mb-6 flex flex-col sm:flex-row sm:space-x-4">
        <input 
          type="text" 
          placeholder="Search by client name" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 p-3 rounded-lg shadow-sm focus:outline-none focus:ring focus:ring-blue-300 transition w-full"
        />
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)} 
          className="border border-gray-300 p-3 rounded-lg shadow-sm focus:outline-none focus:ring focus:ring-blue-300 transition w-full"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300 rounded-lg shadow-md">
          <thead>
            <tr className="bg-gray-200 text-gray-700">
              <th className="py-3 px-4 border-b text-left">Company Name</th>
              <th className="py-3 px-4 border-b text-left">Address</th>
              <th className="py-3 px-4 border-b text-left">ID Number</th>
              <th className="py-3 px-4 border-b text-left">PDV Number</th>
              {/*<th className="py-3 px-4 border-b text-left">STTN Number</th>*/}
              <th className="py-3 px-4 border-b text-left">Contact Person</th>
              <th className="py-3 px-4 border-b text-left">Phone</th>
              <th className="py-3 px-4 border-b text-left">Email</th>
              <th className="py-3 px-4 border-b text-left">Status</th>
              <th className="py-3 px-4 border-b text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map((client) => {
              const { class: statusClass } = getStatusClass(client.status);
              const { text, class: statusClass1 } = getStatusText(client.status);
              return (
                <tr 
                  key={client.id} 
                  className={`hover:bg-gray-100 cursor-pointer ${statusClass}`} 
                  onClick={() => startEditing(client)}
                >
                  <td className="py-3 px-4 border-b">{client.company_name}</td>
                  <td className="py-3 px-4 border-b">{client.address}</td>
                  <td className="py-3 px-4 border-b">{client.idbroj}</td>
                  <td className="py-3 px-4 border-b">{client.pdvbroj}</td>
                  {/*<td className="py-3 px-4 border-b">{client.sttn_broj}</td>*/}
                  <td className="py-3 px-4 border-b">{client.contact_person}</td>
                  <td className="py-3 px-4 border-b">{client.phone}</td>
                  <td className="py-3 px-4 border-b">{client.email}</td>
                  <td className="py-3 px-4 border-b text-center">
                    <span className={`py-2 px-3 border rounded-md ${statusClass1}`}>
                      {text}
                    </span>
                  </td>
                  <td className="py-3 px-4 border-b">
                    {permissions.includes('update_clients') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); startEditing(client); }}
                        className="bg-yellow-500 text-white px-4 py-1 rounded-lg shadow hover:bg-yellow-600 transition mr-2"
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Clients;
