import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useStore from '../store';
import { deleteClient, saveClient } from '../services/clientsServices';
import { toast } from 'sonner';
import { FaUpload } from 'react-icons/fa';

const ClientForm = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const client = location.state?.client || {};
  const { permissions } = useStore();

  const [formData, setFormData] = useState({
    id: client.id,
    company_name: client.company_name || '',
    contact_person: client.contact_person || '',
    email: client.email || '',
    phone: client.phone || '',
    address: client.address || '',
    idbroj: client.idbroj || '',
    pdvbroj: client.pdvbroj || '',
    status: client.status,
    description: client.description || '',
    logo: null,
  });

  const [logoPreview, setLogoPreview] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'status') {
      setFormData({ ...formData, [name]: value === 'Active' });
    } else if (name === 'logo') {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({ ...prev, logo: reader.result }));
          setLogoPreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setLogoPreview(null);
        setFormData(prev => ({ ...prev, logo: null }));
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await saveClient(formData);
      toast.success("Client saved successfully!");
      navigate('/clients');
    } catch (error) {
      toast.error(error.response?.data?.message || "An error occurred. Please try again.");
    }
  };

  const handleInspectionData = () => {
    navigate('/equipmentmanagement', { state: { client } });
  };

  const handleNavigateToEquipment = () => {
    navigate('/equipment', { state: { client } });
  };

  const removeClientHandler = async (client_id) => {
    await deleteClient(client_id);
    navigate('/clients');
  };

  return (
    <div className="bg-gray-100 min-h-screen p-4 mt-14 flex justify-center sm:ml-16">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl p-8 relative">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800 text-center sm:text-left">
            {client.company_name || 'New Client'}
          </h2>
          <div className="flex gap-3 mt-4 sm:mt-0">
            <button 
              type="button" 
              onClick={handleInspectionData} 
              className="px-4 py-2 rounded-xl bg-green-500 text-white font-semibold shadow hover:bg-green-600 transition"
            >
              Inspection Data
            </button>
            {permissions.includes('create_clients') && (
              <button 
                type="button" 
                onClick={handleNavigateToEquipment} 
                className="px-4 py-2 rounded-xl bg-orange-500 text-white font-semibold shadow hover:bg-orange-600 transition"
              >
                Add Equipment
              </button>
            )}
          </div>
        </div>

        {/* Logo Preview */}
        <div className="flex justify-center mb-6">
          {logoPreview ? (
            <img src={logoPreview} alt="Logo Preview" className="max-w-xs max-h-48 rounded-xl border border-gray-300 shadow"/>
          ) : client.logo ? (
            <img src={client.logo} alt="Client Logo" className="max-w-xs max-h-48 rounded-xl border border-gray-300 shadow"/>
          ) : (
            <div className="text-gray-400 italic">No logo available</div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Company Name</label>
              <input 
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                readOnly={!permissions.includes('create_clients')}
                className={`w-full p-3 rounded-lg border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${!permissions.includes('create_clients') ? 'bg-gray-200' : ''}`}
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Logo</label>
              <div className="flex items-center gap-2">
                <input 
                  type="file"
                  name="logo"
                  onChange={handleChange}
                  accept="image/*"
                  disabled={!permissions.includes('create_clients')}
                  className="w-full p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <FaUpload className="text-gray-400"/>
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Address</label>
              <input type="text" name="address" value={formData.address} onChange={handleChange} readOnly={!permissions.includes('create_clients')} className={`w-full p-3 rounded-lg border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${!permissions.includes('create_clients') ? 'bg-gray-200' : ''}`} />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">ID Number</label>
              <input type="number" name="idbroj" value={formData.idbroj} onChange={handleChange} readOnly={!permissions.includes('create_clients')} className={`w-full p-3 rounded-lg border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${!permissions.includes('create_clients') ? 'bg-gray-200' : ''}`} />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">PDV Number</label>
              <input type="number" name="pdvbroj" value={formData.pdvbroj} onChange={handleChange} readOnly={!permissions.includes('create_clients')} className={`w-full p-3 rounded-lg border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${!permissions.includes('create_clients') ? 'bg-gray-200' : ''}`} />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Status</label>
              <select name="status" value={formData.status ? 'Active' : 'InActive'} onChange={handleChange} disabled={!permissions.includes('create_clients')} className={`w-full p-3 rounded-lg border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${!permissions.includes('create_clients') ? 'bg-gray-200' : ''}`}>
                <option value="Active">Active</option>
                <option value="InActive">InActive</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Contact Person</label>
              <input type="text" name="contact_person" value={formData.contact_person} onChange={handleChange} readOnly={!permissions.includes('create_clients')} className={`w-full p-3 rounded-lg border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${!permissions.includes('create_clients') ? 'bg-gray-200' : ''}`} />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} readOnly={!permissions.includes('create_clients')} className={`w-full p-3 rounded-lg border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${!permissions.includes('create_clients') ? 'bg-gray-200' : ''}`} />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Phone</label>
              <input type="phone" name="phone" value={formData.phone} onChange={handleChange} readOnly={!permissions.includes('create_clients')} className={`w-full p-3 rounded-lg border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${!permissions.includes('create_clients') ? 'bg-gray-200' : ''}`} />
            </div>

            <div className="md:col-span-2">
              <label className="block text-gray-700 font-medium mb-2">Description</label>
              <textarea name="description" value={formData.description} onChange={handleChange} readOnly={!permissions.includes('create_clients')} rows="4" className={`w-full p-3 rounded-lg border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${!permissions.includes('create_clients') ? 'bg-gray-200' : ''}`} />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-6 justify-center">
            {permissions.includes('update_clients') && (
              <button type="submit" className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold shadow hover:scale-105 transition">
                Save
              </button>
            )}
            {permissions.includes('delete_clients') && client.id && (
              <button type="button" onClick={() => removeClientHandler(client.id)} className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold shadow hover:scale-105 transition">
                Delete
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientForm;
