import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// import ProjectForm from './ProjectForm';

const Projects = () => {
  const [projects, setProjects] = useState([
    { name: 'Project A', serviceType: 'Type 1', serviceStatus: 'Active', serviceDate: '2024-01-01', deadline: '2024-06-01' },
    { name: 'Project B', serviceType: 'Type 2', serviceStatus: 'Completed', serviceDate: '2024-02-01', deadline: '2024-07-01' },
    { name: 'Project C', serviceType: 'Type 3', serviceStatus: 'Pending', serviceDate: '2024-03-01', deadline: '2024-08-01' },
  ]);
  const [editIndex, setEditIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const navigate = useNavigate();

  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterType ? project.serviceType === filterType : true) &&
    (filterStatus ? project.serviceStatus === filterStatus : true)
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

  const addOrUpdateProject = (projectData) => {
    if (editIndex !== null) {
      const updatedProjects = projects.map((project, index) => (index === editIndex ? projectData : project));
      setProjects(updatedProjects);
      setEditIndex(null);
    } else {
      setProjects([...projects, projectData]);
    }
    navigate('/projects');
  };

  const removeProject = (index) => {
    const updatedProjects = projects.filter((_, i) => i !== index);
    setProjects(updatedProjects);
  };

  const startEditing = (index) => {
    setEditIndex(index);
    navigate('/projects/form');
  };

  return (
    <div className="bg-gray-100 min-h-screen p-4 mt-14 sm:ml-16">
      <h1 className="text-2xl font-bold mb-6">Projects</h1>
      
      <button
        onClick={() => navigate('/projects/form')}
        className="bg-blue-600 text-white px-6 py-2 rounded-lg mb-4 w-full sm:w-auto"
      >
        Add Project
      </button>
      
      <div className="mb-6 flex flex-col sm:flex-row sm:space-x-4">
        <input 
          type="text" 
          placeholder="Search by project name" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 p-3 rounded-lg shadow-sm focus:outline-none focus:ring focus:ring-blue-300 transition w-full"
        />
        <div className="flex space-x-4 mt-2 sm:mt-0">
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 p-3 rounded-lg shadow-sm focus:outline-none focus:ring focus:ring-blue-300 transition w-full"
          >
            <option value="">Filter by Service Type</option>
            <option value="Type 1">Type 1</option>
            <option value="Type 2">Type 2</option>
            <option value="Type 3">Type 3</option>
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
                className={`hover:bg-gray-100 cursor-pointer ${getRowClass(project.serviceStatus)}`} 
                onClick={() => startEditing(index)}
              >
                <td className="py-3 px-4 border-b">{project.name}</td>
                <td className="py-3 px-4 border-b">{project.serviceType}</td>
                <td className="py-3 px-4 border-b">{project.serviceStatus}</td>
                <td className="py-3 px-4 border-b">{project.serviceDate}</td>
                <td className="py-3 px-4 border-b">{project.deadline}</td>
                <td className="py-3 px-4 border-b">
                  <button
                    onClick={(e) => { e.stopPropagation(); startEditing(index); }}
                    className="bg-yellow-500 text-white px-4 py-1 rounded-lg shadow hover:bg-yellow-600 transition mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeProject(index); }}
                    className="bg-red-500 text-white px-4 py-1 rounded-lg shadow hover:bg-red-600 transition"
                  >
                    Remove
                  </button>
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
