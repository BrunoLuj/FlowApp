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
    navigate('/project-details', { state: { project } });
  };

  const startEditing = (project) => {
    navigate('/project', { state: { project } });
  };

  const getStatusClass = (active) => {
    return active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
  };

  const getStatusText = (active) => {
    return active ? 'Active' : 'Inactive';
  };

  if (loading) return <div className="text-center py-6 text-gray-500">Loading...</div>;
  if (error) return <div className="text-center py-6 text-red-500">{error.message || 'Error loading projects'}</div>;

  return (
    <div className="bg-gray-100 min-h-screen p-4 mt-14 sm:ml-16">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Projects (Locations)</h1>

        {permissions.includes('create_projects') && (
          <button
            onClick={() => navigate('/project')}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold shadow-lg hover:scale-105 transition transform"
          >
            Add Project
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-6 w-full sm:w-96">
        <input
          type="text"
          placeholder="Search by name or city"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full p-3 rounded-xl border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 pl-10 transition"
        />
        <FaSearch className="absolute left-3 top-3 text-gray-400"/>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-2xl shadow-xl overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left text-gray-600">Client</th>
              <th className="p-3 text-left text-gray-600">Name</th>
              <th className="p-3 text-left text-gray-600">Address</th>
              <th className="p-3 text-left text-gray-600">City</th>
              <th className="p-3 text-left text-gray-600">STTN</th>
              <th className="p-3 text-left text-gray-600">Active</th>
              <th className="p-3 text-left text-gray-600">Created</th>
              <th className="p-3 text-left text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-6 text-gray-500">No projects found</td>
              </tr>
            ) : (
              filteredProjects.map(project => (
                <tr
                  key={project.id}
                  className="hover:bg-gray-50 cursor-pointer transition"
                  onClick={() => openProject(project)}
                >
                  <td className="p-3 border-b">{project.client_name}</td>
                  <td className="p-3 border-b font-medium">{project.name}</td>
                  <td className="p-3 border-b">{project.address}</td>
                  <td className="p-3 border-b">{project.city}</td>
                  <td className="p-3 border-b">{project.sttn}</td>
                  <td className="p-3 border-b text-center">
                    <span className={`px-3 py-1 rounded-full font-semibold ${getStatusClass(project.active)}`}>
                      {getStatusText(project.active)}
                    </span>
                  </td>
                  <td className="p-3 border-b">{new Date(project.created_at).toLocaleDateString()}</td>
                  <td className="p-3 border-b flex gap-2 flex-wrap">
                    {permissions.includes('update_projects') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); startEditing(project); }}
                        className="bg-yellow-400 text-white px-4 py-1 rounded-lg shadow hover:bg-yellow-500 transition"
                      >
                        Edit
                      </button>
                    )}
                    {permissions.includes('delete_projects') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeProject(project); }}
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

export default Projects;
