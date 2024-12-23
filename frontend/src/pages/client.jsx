import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useStore from '../store';
import { deleteClient, saveClient } from '../services/clientsServices';
import { toast } from 'sonner';

const ClientForm = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const client = location.state?.client || {};
    const { permissions } = useStore();

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    };

    const [formData, setFormData] = useState({
        id: client.id,
        company_name: client.company_name || '',
        contact_person: client.contact_person || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        idbroj: client.idbroj || '',
        pdvbroj: client.pdvbroj || '',
        sttn_broj: client.sttn_broj || '',
        status: client.status,
        description: client.description || '',
        logo: null // Postavljamo logo na null
        // startDate: formatDate(client.created_at),
        // end_date: formatDate(client.end_date),
    });

    const [logoPreview, setLogoPreview] = useState(null); // State for logo preview

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'status') {
            setFormData({ ...formData, [name]: value === 'Active' });
        } else if (name === 'logo') {
            const file = e.target.files[0];

            if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    // Postavljamo logo kao binarni string
                    setFormData(prev => ({ ...prev, logo: reader.result }));
                    setLogoPreview(reader.result); // Postavljamo prethodni logo
                };
                reader.readAsDataURL(file); // Čitamo datoteku kao Data URL
            } else {
                // Ako se ne izabere datoteka, resetujemo prethodni logo
                setLogoPreview(null);
                setFormData(prev => ({ ...prev, logo: null })); // Postavljamo logo na null
            }
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Logiku za slanje podataka kao JSON
        const dataToSubmit = {
            ...formData,
            logo: formData.logo // Uključujemo logo, koji je sada binarni string
        };

        console.log("Data to submit:", JSON.stringify(dataToSubmit));

        try {
            await saveClient(dataToSubmit); // Pošaljemo JSON na API
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

    const removeProject = async (client_id) => {
        await deleteClient(client_id); // Pozovi API funkciju
        navigate('/clients');
    };

    return (
        <div className="bg-gray-100 min-h-screen p-4 mt-14 sm:ml-16">
            <div className="w-full">
                <h2 className="text-3xl p-4 font-bold text-center">{client.company_name || 'New Client'}</h2>
                <div className="absolute right-4">
                    <button type="button" onClick={handleInspectionData} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition mr-2">Inspection Data</button>
                    {permissions.includes('create_clients') && (
                    <button type="button" onClick={handleNavigateToEquipment} className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition mr-2">
                        Add Equipment
                    </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="relative">
                    

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">

                    {/* Logo Preview or Existing Logo */}
                    <div className="col-span-1 md:col-span-2 mt-4 flex justify-center">
                        {logoPreview ? (
                            <img 
                                src={logoPreview} // Preview of the newly uploaded logo
                                alt="Logo Preview" 
                                className="max-w-[300px] max-h-[200px] w-auto h-auto rounded-lg border border-gray-300 mt-2" 
                            />
                        ) : client.logo ? (
                            <img 
                                src={client.logo} // Display the existing logo from the client data
                                alt="Client Logo" 
                                className="max-w-[300px] max-h-[200px] w-auto h-auto rounded-lg border border-gray-300 mt-2"
                            />
                        ) : (
                            <span>No logo available</span> // Inform user that no logo is available
                        )}
                    </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Naziv Kompanije:</label>
                            <input 
                                type="text" 
                                name="company_name" 
                                value={formData.company_name} 
                                onChange={handleChange} 
                                readOnly={!permissions.includes('create_clients')}
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_clients') ? 'bg-gray-200' : ''}`}
                            />
                            {/* readOnly --- ako ne zelis da se moze editirati input  */}
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Logo:</label>
                            <input 
                                type="file" 
                                name="logo" 
                                onChange={handleChange} 
                                accept="image/*" 
                                disabled={!permissions.includes('create_clients')}
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_clients') ? 'bg-gray-200' : ''}`}
                            />
                        </div>

                     

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Address:</label>
                            <input 
                                type="text" 
                                name="address" 
                                value={formData.address} 
                                onChange={handleChange} 
                                readOnly={!permissions.includes('create_clients')}
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_clients') ? 'bg-gray-200' : ''}`} 
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">ID broj:</label>
                            <input 
                                type="number" 
                                name="idbroj" 
                                value={formData.idbroj} 
                                onChange={handleChange} 
                                readOnly={!permissions.includes('create_clients')}
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_clients') ? 'bg-gray-200' : ''}`} 
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">PDV broj:</label>
                            <input 
                                type="number" 
                                name="pdvbroj" 
                                value={formData.pdvbroj} 
                                onChange={handleChange} 
                                readOnly={!permissions.includes('create_clients')}
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_clients') ? 'bg-gray-200' : ''}`} 
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">STTN broj:</label>
                            <input 
                                type="number" 
                                name="sttn_broj" 
                                value={formData.sttn_broj} 
                                onChange={handleChange} 
                                readOnly={!permissions.includes('create_clients')} 
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_clients') ? 'bg-gray-200' : ''}`} 
                            />
                        </div>

                        <div 
                        // className="col-span-1 md:col-span-2"
                        >
                            <label className="block text-gray-700 font-medium mb-2">Status:</label>
                            <select 
                                name="status" 
                                disabled={!permissions.includes('create_clients')} 
                                value={formData.status ? 'Active' : 'InActive'} // Set display value based on boolean
                                onChange={handleChange} 
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_clients') ? 'bg-gray-200' : ''}`}
                            >
                                <option value="Active">Active</option>
                                <option value="InActive">InActive</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Contact Person:</label>
                            <input 
                                type="text" 
                                name="contact_person" 
                                value={formData.contact_person} 
                                onChange={handleChange} 
                                readOnly={!permissions.includes('create_clients')}  
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_clients') ? 'bg-gray-200' : ''}`} 
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Email:</label>
                            <input 
                                type="email" 
                                name="email" 
                                value={formData.email} 
                                onChange={handleChange} 
                                readOnly={!permissions.includes('create_clients')}  
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_clients') ? 'bg-gray-200' : ''}`} 
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Phone:</label>
                            <input 
                                type="phone" 
                                name="phone" 
                                value={formData.phone} 
                                onChange={handleChange} 
                                readOnly={!permissions.includes('create_clients')} 
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_clients') ? 'bg-gray-200' : ''}`} 
                            />
                        </div>

                        {/* <div>
                            <label className="block text-gray-700 font-medium mb-2">Datum početka:</label>
                            <input 
                                type="date" 
                                name="startDate" 
                                value={formData.startDate} 
                                onChange={handleChange} 
                                readOnly={!permissions.includes('create_clients')}
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_clients') ? 'bg-gray-200' : ''}`} 
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Datum završetka:</label>
                            <input 
                                type="date" 
                                name="end_date" 
                                value={formData.end_date} 
                                onChange={handleChange} 
                                readOnly={!permissions.includes('create_clients')}
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_clients') ? 'bg-gray-200' : ''}`}
                            />
                        </div> */}

                        {/* <div 
                        // className="col-span-1 md:col-span-2"
                        >
                            <label className="block text-gray-700 font-medium mb-2">Project Type:</label>
                            <select 
                                name="client_type" 
                                disabled={!permissions.includes('create_clients')} 
                                value={formData.client_type} 
                                onChange={handleChange} 
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_clients') ? 'bg-gray-200' : ''}`}
                            >
                                <option value="Volumetri">Volumetri</option>
                                <option value="Rezervoar">Rezervoar</option>
                                <option value="AMN">AMN</option>
                                <option value="Mjerna Letva">Mjerna Letva</option>
                            </select>
                        </div> */}

                        {/* <div 
                        // className="col-span-1 md:col-span-2"
                        >
                            <label className="block text-gray-700 font-medium mb-2">Status:</label>
                            <select 
                                name="status" 
                                disabled={!permissions.includes('create_clients')} 
                                value={formData.status} 
                                onChange={handleChange} 
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_clients') ? 'bg-gray-200' : ''}`}
                            >
                                <option value="Active">Aktivan</option>
                                <option value="Completed">Završen</option>
                                <option value="Pending">Odgođen</option>
                            </select>
                        </div> */}

                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-gray-700 font-medium mb-2">Opis klijenta:</label>
                            <textarea 
                                name="description" 
                                value={formData.description} 
                                onChange={handleChange} 
                                readOnly={!permissions.includes('create_clients')}
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_clients') ? 'bg-gray-200' : ''}`} 
                                rows="4" 
                            />
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between mt-6">
                    {permissions.includes('update_clients') && (
                        <button type="submit" className="bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 transition mb-2 sm:mb-0 sm:w-auto">Spremi</button>
                    )}
                    {permissions.includes('delete_clients') && client.id && (
                        <button 
                            type="button" 
                            onClick={() => removeProject(client.id)} 
                            className="bg-red-600 text-white px-5 py-3 rounded-lg hover:bg-red-700 transition"
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

export default ClientForm;
