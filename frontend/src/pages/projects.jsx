import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/index.js';
import { deleteProject, getProjects } from '../services/projectsServices.js';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const navigate = useNavigate();

  const { permissions } = useStore();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await getProjects(); // Pozovi API funkciju
        console.log(response);
        setProjects(response.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterType ? project.project_type === filterType : true) &&
    (filterStatus ? project.status === filterStatus : true)
  );

  const getRowClass = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100';
      case 'Completed':
        return 'bg-blue-100';
      case 'Pending':
        return 'bg-yellow-100';
      default:
        return '';
    }
  };

  const removeProject = async (project) => {
    await deleteProject(project.id); // Pozovi API funkciju

    // Ažuriraj stanje lista projekata
    const updatedProjects = projects.filter(p => p.id !== project.id);
    setProjects(updatedProjects);
  };

  const startEditing = (project) => {
    console.log(project);
    navigate('/project', { state: { project } });
  };

  return (
    <div className="bg-gray-100 min-h-screen p-4 mt-14 sm:ml-16">
      <h1 className="text-2xl font-bold mb-6">Projects</h1>
      
      {permissions.includes('create_projects') && (
          <button
              onClick={() => navigate('/project/')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg mb-4 w-full sm:w-auto"
          >
              Add Project
          </button>
      )}
      
      <div className="mb-6 flex flex-col sm:flex-row sm:space-x-4">
        <input 
          type="text" 
          placeholder="Search by project name" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 p-3 rounded-lg shadow-sm focus:outline-none focus:ring focus:ring-blue-300 transition w-full"
        />
        <div className="flex space-x-4 sm:mt-0">
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 p-3 rounded-lg shadow-sm focus:outline-none focus:ring focus:ring-blue-300 transition w-full"
          >
            <option value="">Filter by Service Type</option>
            <option value="Volumetri">Volumetri</option>
            <option value="AMN">AMN</option>
            <option value="Mjerna Letva">Mjerna Letva</option>
            <option value="Rezerovari">Rezerovari</option>
          </select>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 p-3 rounded-lg shadow-sm focus:outline-none focus:ring focus:ring-blue-300 transition w-full"
          >
            <option value="">Filter by Status</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300 rounded-lg shadow-md">
          <thead>
            <tr className="bg-gray-200 text-gray-700">
              <th className="py-3 px-4 border-b text-left">Project Name</th>
              <th className="py-3 px-4 border-b text-left">Service Type</th>
              <th className="py-3 px-4 border-b text-left">Responsible Person</th>
              <th className="py-3 px-4 border-b text-left">Service Executor</th>
              <th className="py-3 px-4 border-b text-left">Service Status</th>
              <th className="py-3 px-4 border-b text-left">Service Date</th>
              <th className="py-3 px-4 border-b text-left">Deadline</th>
              <th className="py-3 px-4 border-b text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.map((project, index) => (
              <tr 
                key={index} 
                className={`hover:bg-gray-100 cursor-pointer ${getRowClass(project.status)}`} 
                onClick={() => startEditing(project)}
              >
                <td className="py-3 px-4 border-b">{project.name}</td>
                <td className="py-3 px-4 border-b">{project.project_type}</td>
                <td className="py-3 px-4 border-b">{project.responsible_person}</td>
                <td className="py-3 px-4 border-b">
                    {Array.isArray(project.service_executors) && project.service_executors.length > 0 
                        ? project.service_executors.map(executor => {
                            const user = JSON.parse(executor);
                            return user.fullName;
                        }).join(', ') 
                        : 'Nema izvršitelja'}
                </td>
                <td className="py-3 px-4 border-b">{project.status}</td>
                <td className="py-3 px-4 border-b">{new Date(project.created_at).toLocaleDateString()}</td>
                <td className="py-3 px-4 border-b">{new Date(project.end_date).toLocaleDateString()}</td>
                <td className="py-3 px-4 border-b">
                  
                  {permissions.includes('update_projects') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); startEditing(project); }}
                        className="bg-yellow-500 text-white px-4 py-1 rounded-lg shadow hover:bg-yellow-600 transition mr-2"
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Projects;
