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
        toast.error("Korisnike ili role nije moguće učitati.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="min-h-screen bg-slate-100 pt-28 text-center text-slate-500">Učitavanje korisnika…</div>;
  if (error) return <div className="text-center py-6 text-red-500">{error.message}</div>;

  const roleMap = Object.fromEntries(roles.map(r => [r.id, r.name]));

  const normalizedSearchTerm = searchTerm.toLowerCase();

  const filteredUsers = users.filter(user =>
    (user.firstname ?? '').toLowerCase().includes(normalizedSearchTerm) ||
    (user.lastname ?? '').toLowerCase().includes(normalizedSearchTerm) ||
    (user.email ?? '').toLowerCase().includes(normalizedSearchTerm)
  );

  const removeUser = async (user) => {
    if (!window.confirm(`Želite li izbrisati korisnika ${user.firstname}?`)) return;
    try {
      await deleteUser(user.id);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      toast.success(`Korisnik ${user.firstname} je izbrisan.`);
    } catch {
      toast.error("Korisnika nije moguće izbrisati.");
    }
  };

  const startEditing = (user) => navigate('/user', { state: { user } });
  const openUser = (user) => navigate('/user', { state: { user } });

  const getStatusClass = (active) => active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
  const getStatusText = (active) => active ? 'Aktivan' : 'Neaktivan';

  return (
    <div className="min-h-screen bg-slate-100 px-4 pb-10 pt-24 sm:px-7"><div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-black uppercase tracking-widest text-orange-600">Administracija</p><h1 className="text-3xl font-black text-slate-900">Korisnici</h1><p className="mt-2 text-slate-500">Korisnički računi, pristup i pripadajuće role.</p></div>
        {permissions.includes('create_users') && (
          <button
            onClick={() => navigate('/user')}
            className="rounded-xl bg-orange-500 px-5 py-3 font-bold text-white shadow-lg shadow-orange-200 hover:bg-orange-600"
          >
            + Novi korisnik
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-6 w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:max-w-xl">
        <input
          type="text"
          placeholder="Pretraži ime, prezime ili e-mail…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-3"
        />
        <FaSearch className="absolute left-3 top-3 text-gray-400"/>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              {['Korisnik','Pristup','Kontakt i lokacija','Status','Akcije'].map(h => (
                <th key={h} className="p-3 text-left text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">Nema pronađenih korisnika.</td>
              </tr>
            ) : filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-gray-50 cursor-pointer transition" onClick={() => openUser(user)}>
                <td><div className="font-black text-slate-900">{user.firstname} {user.lastname}</div><div className="mt-1 text-xs text-slate-500">{user.email}</div></td>
                <td><div className="font-bold text-slate-700">{roleMap[user.roles_id] || 'Nije dodijeljena'}</div><div className="mt-1 text-xs text-slate-400">{user.client_name || 'Interni korisnik'}</div></td>
                <td><div>{user.contact || "—"}</div><div className="mt-1 text-xs text-slate-500">{[user.address,user.country].filter(Boolean).join(", ") || "Lokacija nije unesena"}{user.currency ? ` · ${user.currency}` : ""}</div></td>
                <td className="p-3 border-b text-center">
                  <span className={`px-3 py-1 rounded-full font-semibold ${getStatusClass(user.status)}`}>
                    {getStatusText(user.status)}
                  </span>
                </td>
                <td className="p-3 border-b flex gap-2 flex-wrap">
                  {permissions.includes('update_users') && (
                    <button onClick={e => { e.stopPropagation(); startEditing(user); }}
                      className="bg-yellow-400 text-white px-4 py-1 rounded-lg shadow hover:bg-yellow-500 transition">
                      Uredi
                    </button>
                  )}
                  {permissions.includes('delete_users') && (
                    <button onClick={e => { e.stopPropagation(); removeUser(user); }}
                      className="bg-red-500 text-white px-4 py-1 rounded-lg shadow hover:bg-red-600 transition">
                      Izbriši
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div></div></div></div>
  );
};

export default Users;
