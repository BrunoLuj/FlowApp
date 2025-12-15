import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store';
import { deleteProject, getProjects } from '../services/projectsServices';

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
    navigate(`/projects/${project.id}`);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading projects</div>;

  return (
    <div className="bg-gray-100 min-h-screen p-4 mt-14 sm:ml-16">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Projects (Locations)</h1>

        {permissions.includes('create_projects') && (
          <button
            onClick={() => navigate('/project')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Add Project
          </button>
        )}
      </div>

      <input
        type="text"
        placeholder="Search by name or city"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="border p-3 rounded-lg w-full mb-4"
      />

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border rounded-lg shadow">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-3 text-left">Client</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Address</th>
              <th className="p-3 text-left">City</th>
              <th className="p-3 text-left">Active</th>
              <th className="p-3 text-left">Created</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.map(project => (
              <tr
                key={project.id}
                className="border-t hover:bg-gray-50 cursor-pointer"
                onClick={() => openProject(project)}
              >
                <td className="p-3">{project.client_id}</td>
                <td className="p-3 font-medium">{project.name}</td>
                <td className="p-3">{project.address}</td>
                <td className="p-3">{project.city}</td>
                <td className="p-3">{project.active ? 'Yes' : 'No'}</td>
                <td className="p-3">
                  {new Date(project.created_at).toLocaleDateString()}
                </td>
                <td className="p-3 space-x-2">
                  {permissions.includes('update_projects') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/project', { state: project });
                      }}
                      className="bg-yellow-500 text-white px-3 py-1 rounded"
                    >
                      Edit
                    </button>
                  )}
                  {permissions.includes('delete_projects') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeProject(project);
                      }}
                      className="bg-red-500 text-white px-3 py-1 rounded"
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

export default Projects;
