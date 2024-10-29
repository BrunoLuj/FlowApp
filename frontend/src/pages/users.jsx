import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/index.js';
import { deleteUser, getUsers, getRoles } from '../services/usersServices.js';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]); // State for roles
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

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  // Create a mapping from role ID to role name
  const roleMap = {};
  roles.forEach(role => {
    roleMap[role.id] = role.name; // Adjust according to your data structure
  });

  const filteredUsers = users.filter(user => {
    const matchesName = user.firstname.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && user.status) || 
      (statusFilter === 'inactive' && !user.status);
    return matchesName && matchesStatus;
  });

  const getStatusClass = (status) => {
    return status ? { class: 'bg-green-100' } : { class: 'bg-red-100' };
  };

  const removeUser = async (user) => {
    await deleteUser(user.id);
    setUsers(users.filter(p => p.id !== user.id));
  };

  const startEditing = (user) => {
    navigate('/user', { state: { user } });
  };

  return (
    <div className="bg-gray-100 min-h-screen p-4 mt-14 sm:ml-16">
      <h1 className="text-2xl font-bold mb-6">Users</h1>

      {permissions.includes('create_users') && (
        <button
          onClick={() => navigate('/user/')}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg mb-4 w-full sm:w-auto"
        >
          Add User
        </button>
      )}

      <div className="mb-6 flex flex-col sm:flex-row sm:space-x-4">
        <input 
          type="text" 
          placeholder="Search by user name" 
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
              <th className="py-3 px-4 border-b">First Name</th>
              <th className="py-3 px-4 border-b">Last Name</th>
              <th className="py-3 px-4 border-b">Email</th>
              <th className="py-3 px-4 border-b">Role</th>
              <th className="py-3 px-4 border-b">Contact</th>
              <th className="py-3 px-4 border-b">Address</th>
              <th className="py-3 px-4 border-b">Country</th>
              <th className="py-3 px-4 border-b">Currency</th>
              <th className="py-3 px-4 border-b">Status</th>
              <th className="py-3 px-4 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => {
              const { class: statusClass } = getStatusClass(user.status);
              return (
                <tr 
                  key={user.id} 
                  className={`hover:bg-gray-100 cursor-pointer ${statusClass}`} 
                  onClick={() => startEditing(user)}
                >
                  <td className="py-3 px-4 border-b">{user.firstname}</td>
                  <td className="py-3 px-4 border-b">{user.lastname}</td>
                  <td className="py-3 px-4 border-b">{user.email}</td>
                  <td className="py-3 px-4 border-b">{roleMap[user.roles_id] || 'Unknown Role'}</td>
                  <td className="py-3 px-4 border-b">{user.contact}</td>
                  <td className="py-3 px-4 border-b">{user.address}</td>
                  <td className="py-3 px-4 border-b">{user.country}</td>
                  <td className="py-3 px-4 border-b">{user.currency}</td>
                  <td className="py-3 px-4 border-b text-center">
                    <span className={`py-2 px-3 border rounded-md ${user.status ? 'bg-green-400' : 'bg-red-400'}`}>
                      {user.status ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4 border-b">
                    {permissions.includes('update_users') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); startEditing(user); }}
                        className="bg-yellow-500 text-white px-4 py-1 rounded-lg shadow hover:bg-yellow-600 transition mr-2"
                      >
                        Edit
                      </button>
                    )}
                    {permissions.includes('delete_users') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeUser(user); }}
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

export default Users;
