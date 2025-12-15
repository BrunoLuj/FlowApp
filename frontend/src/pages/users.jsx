import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/index.js';
import { deleteUser, getUsers, getRoles } from '../services/usersServices.js';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const navigate = useNavigate();
  const { permissions } = useStore();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersResponse, rolesResponse] = await Promise.all([getUsers(), getRoles()]);
        setUsers(usersResponse.data);
        setRoles(rolesResponse.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error.message}</div>;

  const roleMap = Object.fromEntries(roles.map(r => [r.id, r.name]));

  const filteredUsers = users.filter(user => {
    const matchesName = user.firstname.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && user.status) ||
      (statusFilter === 'inactive' && !user.status);
    return matchesName && matchesStatus;
  });

  const removeUser = async (user) => {
    if (!window.confirm(`Are you sure you want to remove ${user.firstname}?`)) return;
    await deleteUser(user.id);
    setUsers(users.filter(u => u.id !== user.id));
  };

  const startEditing = (user) => {
    navigate('/user', { state: { user } });
  };

  return (
    <div className="bg-gray-100 min-h-screen p-4 mt-14 sm:ml-16">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 sm:mb-0">Users</h1>
        {permissions.includes('create_users') && (
          <button
            onClick={() => navigate('/user/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Add User
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:space-x-4 mb-6 gap-2">
        <input
          type="text"
          placeholder="Search by user name"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="border border-gray-300 p-3 rounded-lg shadow-sm focus:outline-none focus:ring focus:ring-blue-300 transition w-full sm:w-1/2"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 p-3 rounded-lg shadow-sm focus:outline-none focus:ring focus:ring-blue-300 transition w-full sm:w-1/4"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['First Name', 'Last Name', 'Email', 'Role', 'Contact', 'Address', 'Country', 'Currency', 'Status', 'Actions'].map(header => (
                <th key={header} className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredUsers.map(user => (
              <tr
                key={user.id}
                className="hover:bg-gray-50 cursor-pointer transition"
                onClick={() => startEditing(user)}
              >
                <td className="px-4 py-3">{user.firstname}</td>
                <td className="px-4 py-3">{user.lastname}</td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">{roleMap[user.roles_id] || 'Unknown'}</td>
                <td className="px-4 py-3">{user.contact}</td>
                <td className="px-4 py-3">{user.address}</td>
                <td className="px-4 py-3">{user.country}</td>
                <td className="px-4 py-3">{user.currency}</td>
                <td className="px-4 py-3">
                  <span className={`px-3 py-1 rounded-full text-white text-sm ${user.status ? 'bg-green-500' : 'bg-red-500'}`}>
                    {user.status ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 flex space-x-2">
                  {permissions.includes('update_users') && (
                    <button
                      onClick={e => { e.stopPropagation(); startEditing(user); }}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md transition"
                    >
                      Edit
                    </button>
                  )}
                  {permissions.includes('delete_users') && (
                    <button
                      onClick={e => { e.stopPropagation(); removeUser(user); }}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md transition"
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;
