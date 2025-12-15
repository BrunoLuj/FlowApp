import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/index.js';
import { deleteUser, getUsers, getRoles } from '../services/usersServices.js';
import { FaSearch } from 'react-icons/fa';
import { toast } from 'sonner';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
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
        toast.error("Failed to load users or roles");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="text-center py-6 text-gray-500">Loading...</div>;
  if (error) return <div className="text-center py-6 text-red-500">{error.message}</div>;

  const roleMap = Object.fromEntries(roles.map(r => [r.id, r.name]));

  const filteredUsers = users.filter(user =>
    user.firstname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const removeUser = async (user) => {
    if (!window.confirm(`Are you sure you want to remove ${user.firstname}?`)) return;
    try {
      await deleteUser(user.id);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      toast.success(`${user.firstname} removed successfully`);
    } catch {
      toast.error("Failed to remove user");
    }
  };

  const startEditing = (user) => navigate('/user', { state: { user } });
  const openUser = (user) => navigate('/user', { state: { user } });

  const getStatusClass = (active) => active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
  const getStatusText = (active) => active ? 'Active' : 'Inactive';

  return (
    <div className="bg-gray-100 min-h-screen p-4 mt-14 sm:ml-16">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Users</h1>
        {permissions.includes('create_users') && (
          <button
            onClick={() => navigate('/user')}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold shadow-lg hover:scale-105 transition transform"
          >
            Add User
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-6 w-full sm:w-96">
        <input
          type="text"
          placeholder="Search by name or email"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full p-3 rounded-xl border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 pl-10 transition"
        />
        <FaSearch className="absolute left-3 top-3 text-gray-400"/>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-2xl shadow-xl overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              {['First Name','Last Name','Email','Role','Contact','Address','Country','Currency','Status','Actions'].map(h => (
                <th key={h} className="p-3 text-left text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-6 text-gray-500">No users found</td>
              </tr>
            ) : filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-gray-50 cursor-pointer transition" onClick={() => openUser(user)}>
                <td className="p-3 border-b">{user.firstname}</td>
                <td className="p-3 border-b">{user.lastname}</td>
                <td className="p-3 border-b">{user.email}</td>
                <td className="p-3 border-b">{roleMap[user.roles_id] || 'Unknown'}</td>
                <td className="p-3 border-b">{user.contact}</td>
                <td className="p-3 border-b">{user.address}</td>
                <td className="p-3 border-b">{user.country}</td>
                <td className="p-3 border-b">{user.currency}</td>
                <td className="p-3 border-b text-center">
                  <span className={`px-3 py-1 rounded-full font-semibold ${getStatusClass(user.status)}`}>
                    {getStatusText(user.status)}
                  </span>
                </td>
                <td className="p-3 border-b flex gap-2 flex-wrap">
                  {permissions.includes('update_users') && (
                    <button onClick={e => { e.stopPropagation(); startEditing(user); }}
                      className="bg-yellow-400 text-white px-4 py-1 rounded-lg shadow hover:bg-yellow-500 transition">
                      Edit
                    </button>
                  )}
                  {permissions.includes('delete_users') && (
                    <button onClick={e => { e.stopPropagation(); removeUser(user); }}
                      className="bg-red-500 text-white px-4 py-1 rounded-lg shadow hover:bg-red-600 transition">
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
