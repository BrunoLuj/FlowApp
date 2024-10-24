import React, { useState } from 'react';

// Dummy data for clients
const initialClientsData = [
  { id: 1, name: 'Client A', address: 'Address A', taxId: '123456789', phone: '0123456789', isActive: true },
  { id: 2, name: 'Client B', address: 'Address B', taxId: '987654321', phone: '9876543210', isActive: false },
  // Add more clients as needed
];

const Clients = () => {
  const [clientsData, setClientsData] = useState(initialClientsData);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const handleSearch = (event) => setSearchTerm(event.target.value);
  const handleStatusFilterChange = (event) => setStatusFilter(event.target.value);

  const filteredClients = clientsData.filter(client => {
    const matchesName = client.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && client.isActive) || 
      (statusFilter === 'inactive' && !client.isActive);
    return matchesName && matchesStatus;
  });

  const handleAddClient = () => {
    console.log('Add a new client');
  };

  const handleUpdateClient = (id) => {
    console.log(`Update client with ID: ${id}`);
  };

  const handleDeleteClient = (id) => {
    setClientsData(clientsData.filter(client => client.id !== id));
  };

  const toggleStatus = (id) => {
    setClientsData(clientsData.map(client =>
      client.id === id ? { ...client, isActive: !client.isActive } : client
    ));
  };

  return (
    <div className="p-4 sm:ml-16 mt-14">
      <h2 className="text-2xl font-bold mb-6">Our Clients</h2>
      
      <div className="mb-4 flex flex-col sm:flex-row items-center">
        <input 
          type="text" 
          placeholder="Search by name..." 
          value={searchTerm} 
          onChange={handleSearch}
          className="border border-gray-300 p-2 rounded mb-2 sm:mb-0 sm:mr-4 w-full sm:w-auto"
        />
        <select 
          value={statusFilter} 
          onChange={handleStatusFilterChange} 
          className="border border-gray-300 p-2 rounded mb-2 sm:mb-0 sm:mr-4 w-full sm:w-auto"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button 
          onClick={handleAddClient} 
          className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 w-full sm:w-auto"
        >
          Add Client
        </button>
      </div>

      {/* Table for larger screens */}
      <div className="hidden sm:block">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-200 text-left">
              {['ID', 'Name', 'Address', 'Tax ID', 'Phone', 'Status', 'Options'].map(header => (
                <th key={header} className="py-2 px-4 border-b">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredClients.map(client => (
              <tr key={client.id} className="hover:bg-gray-100">
                <td className="py-2 px-4 border-b">{client.id}</td>
                <td className="py-2 px-4 border-b">{client.name}</td>
                <td className="py-2 px-4 border-b">{client.address}</td>
                <td className="py-2 px-4 border-b">{client.taxId}</td>
                <td className="py-2 px-4 border-b">{client.phone}</td>
                <td className="py-2 px-4 border-b">
                  <span className={`inline-block px-2 py-1 rounded ${client.isActive ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    {client.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button 
                    onClick={() => toggleStatus(client.id)} 
                    className="ml-2 bg-gray-300 text-black py-1 px-2 rounded hover:bg-gray-400"
                  >
                    Toggle Status
                  </button>
                </td>
                <td className="py-2 px-4 border-b">
                  <button 
                    onClick={() => handleUpdateClient(client.id)} 
                    className="bg-yellow-500 text-white py-1 px-3 rounded mr-2 hover:bg-yellow-600"
                  >
                    Update
                  </button>
                  <button 
                    onClick={() => handleDeleteClient(client.id)} 
                    className="bg-red-500 text-white py-1 px-3 rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards for smaller screens */}
      <div className="sm:hidden">
        {filteredClients.map(client => (
          <div key={client.id} className="border rounded p-4 mb-4 bg-white shadow">
            <h3 className="text-lg font-bold">{client.name}</h3>
            <p><strong>ID:</strong> {client.id}</p>
            <p><strong>Address:</strong> {client.address}</p>
            <p><strong>Tax ID:</strong> {client.taxId}</p>
            <p><strong>Phone:</strong> {client.phone}</p>
            <span className={`inline-block px-2 py-1 rounded ${client.isActive ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
              {client.isActive ? 'Active' : 'Inactive'}
            </span>
            <div className="mt-2">
              <button 
                onClick={() => toggleStatus(client.id)} 
                className="bg-gray-300 text-black py-1 px-2 rounded hover:bg-gray-400 mr-2"
              >
                Toggle Status
              </button>
              <button 
                onClick={() => handleUpdateClient(client.id)} 
                className="bg-yellow-500 text-white py-1 px-3 rounded mr-2 hover:bg-yellow-600"
              >
                Update
              </button>
              <button 
                onClick={() => handleDeleteClient(client.id)} 
                className="bg-red-500 text-white py-1 px-3 rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Clients;
