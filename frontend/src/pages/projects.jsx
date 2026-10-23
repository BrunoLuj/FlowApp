import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store';
import { deleteProject, getProjects } from '../services/projectsServices';
import { FaSearch } from 'react-icons/fa';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { permissions } = useStore();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const res = await getProjects();
      setProjects(res.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const removeProject = async (project) => {
    await deleteProject(project.id);
    setProjects(prev => prev.filter(p => p.id !== project.id));
  };

  const openProject = (project) => {
    navigate(`/service-center/stations/${project.id}`);
  };

  const startEditing = (project) => {
    navigate('/project', { state: { project } });
  };

  const getStatusClass = (active) => {
    return active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
  };

  const getStatusText = (active) => {
    return active ? 'Aktivna' : 'Neaktivna';
  };

  if (loading) return <div className="min-h-screen bg-slate-100 pt-28 text-center text-slate-500">Učitavanje benzinskih stanica…</div>;
  if (error) return <div className="min-h-screen bg-slate-100 pt-28 text-center text-red-600">{error.message || 'Stanice nije moguće učitati.'}</div>;

  return (
    <div className="min-h-screen bg-slate-100 px-4 pb-10 pt-24 sm:px-7"><div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-black uppercase tracking-widest text-orange-600">Lokacije i oprema</p><h1 className="text-3xl font-black text-slate-900">Benzinske stanice</h1><p className="mt-2 text-slate-500">Pregled lokacija, STTN oznaka i statusa stanica.</p></div>

        {permissions.includes('create_projects') && (
          <button
            onClick={() => navigate('/project')}
            className="rounded-xl bg-orange-500 px-5 py-3 font-bold text-white shadow-lg shadow-orange-200 hover:bg-orange-600"
          >
            + Nova stanica
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-6 w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:max-w-xl">
        <input
          type="text"
          placeholder="Pretraži naziv, grad ili lokaciju…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-3"
        />
        <FaSearch className="absolute left-3 top-3 text-gray-400"/>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th>Stanica i vlasnik</th><th>Lokacija</th><th>FMT / STTN</th><th>Status</th><th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">Nema pronađenih benzinskih stanica.</td>
              </tr>
            ) : (
              filteredProjects.map(project => (
                <tr
                  key={project.id}
                  className="hover:bg-gray-50 cursor-pointer transition"
                  onClick={() => openProject(project)}
                >
                  <td><div className="font-black text-slate-900">{project.name}</div><div className="mt-1 text-xs text-slate-500">{project.client_name}</div></td>
                  <td><div>{project.address || "—"}</div><div className="mt-1 text-xs text-slate-500">{project.city || "Grad nije unesen"}</div></td>
                  <td className="font-bold text-slate-700">{project.sttn || "—"}</td>
                  <td>
                    <span className={`px-3 py-1 rounded-full font-semibold ${getStatusClass(project.active)}`}>
                      {getStatusText(project.active)}
                    </span>
                    <div className="mt-2 text-xs text-slate-400">{project.created_at ? new Date(project.created_at).toLocaleDateString("hr-HR") : "—"}</div>
                  </td>
                  <td className="p-3 border-b flex gap-2 flex-wrap">
                    {permissions.includes('update_projects') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); startEditing(project); }}
                        className="bg-yellow-400 text-white px-4 py-1 rounded-lg shadow hover:bg-yellow-500 transition"
                      >
                        Uredi
                      </button>
                    )}
                    {permissions.includes('delete_projects') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeProject(project); }}
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
      </div></div></div></div>
  );
};

export default Projects;
