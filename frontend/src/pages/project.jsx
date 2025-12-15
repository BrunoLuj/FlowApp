import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useStore from '../store';
import { saveProject, deleteProject } from '../services/projectsServices';
import { toast } from 'sonner';
import { getClients } from '../services/clientsServices';

const ProjectForm = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { permissions } = useStore();
  const [clients, setClients] = useState([]);
  const project = location.state?.project || {};

  const [formData, setFormData] = useState({
    id: project.id || '',
    client_id: project.client_id || '',
    name: project.name || '',
    address: project.address || '',
    city: project.city || '',
    gps_lat: project.gps_lat || '',
    gps_lng: project.gps_lng || '',
    active: project.active ?? true,
  });

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await getClients();
        setClients(res.data);
      } catch (err) {
        console.error('Error fetching clients:', err);
      }
    };
    fetchClients();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    console.log(formData);
    e.preventDefault();
    if (!formData.client_id || !formData.name) {
      toast.error('Molimo odaberite klijenta i unesite naziv lokacije.');
      return;
    }
    try {
      await saveProject(formData);
      toast.success('Project saved successfully!');
      navigate('/projects');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Došlo je do greške.');
    }
  };

  const handleDelete = async () => {
    if (!project.id) return;
    try {
      await deleteProject(project.id);
      toast.success('Project deleted successfully!');
      navigate('/projects');
    } catch (err) {
      toast.error('Došlo je do greške pri brisanju.');
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen p-4 mt-14 sm:ml-16">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-6">{project.id ? 'Edit Project' : 'New Project'}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Klijent */}
          <div>
            <label className="block mb-1 font-medium">Klijent:</label>
            <select
              name="client_id"
              value={formData.client_id}
              onChange={handleChange}
              disabled={!permissions.includes('create_projects')}
              className="w-full border p-2 rounded"
            >
              <option value="">Odaberite klijenta</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.company_name}</option>
              ))}
            </select>
          </div>

          {/* Naziv */}
          <div>
            <label className="block mb-1 font-medium">Naziv lokacije:</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              disabled={!permissions.includes('create_projects')}
              className="w-full border p-2 rounded"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block mb-1 font-medium">Adresa:</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full border p-2 rounded"
            />
          </div>

          {/* City */}
          <div>
            <label className="block mb-1 font-medium">Grad:</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="w-full border p-2 rounded"
            />
          </div>

          {/* STTN */}
          <div>
            <label className="block mb-1 font-medium">STTN:</label>
            <input
              type="text"
              name="sttn"
              value={formData.sttn}
              onChange={handleChange}
              className="w-full border p-2 rounded"
            />
          </div>

          {/* GPS */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-medium">GPS Lat:</label>
              <input
                type="text"
                name="gps_lat"
                value={formData.gps_lat}
                onChange={handleChange}
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">GPS Lng:</label>
              <input
                type="text"
                name="gps_lng"
                value={formData.gps_lng}
                onChange={handleChange}
                className="w-full border p-2 rounded"
              />
            </div>
          </div>

          {/* Active */}
          <div>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                name="active"
                checked={formData.active}
                onChange={handleChange}
                className="mr-2"
              />
              Active
            </label>
          </div>

          {/* Dugmad */}
          <div className="flex space-x-4">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Spremi
            </button>
            {project.id && permissions.includes('delete_projects') && (
              <button
                type="button"
                onClick={handleDelete}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Izbriši
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectForm;
