import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import useStore from '../store';

const ProjectForm = ({ onSave }) => {
    const location = useLocation();
    const project = location.state?.project || {};
    const { permissions } = useStore();

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    };

    const [formData, setFormData] = useState({
        id: project.id || '',
        name: project.name || '',
        startDate: formatDate(project.created_at),
        endDate: formatDate(project.due_date),
        status: project.status || 'aktivan',
        description: project.description || '',
        budget: project.budget || 0,
        costs: project.costs || 0,
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const handleGenerateReport = () => {
        // Logika za generiranje izvještaja
        console.log("Izvještaj generiran za projekat:", formData);
    };

    const handleGenerateCertificate = () => {
        // Logika za generiranje certifikata
        console.log("Certifikat generiran za projekat:", formData);
    };

    const onDelete = () =>{
        // Logika za brisanje certifikata
        console.log("Brisanje projekata:", formData);
    }

    return (
        <div className="bg-gray-100 min-h-screen p-4 mt-14 sm:ml-16">
            <div className="w-full">
                <h2 className="text-3xl p-4 font-bold text-center">{project.name || 'Novi Projekat'}</h2>
                <div className="absolute right-4"> {/* Pozicioniranje dugmadi */}
                    <button type="button" onClick={handleGenerateReport} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition mr-2">Generiraj izvještaj</button>
                    {permissions.includes('create_projects') && (
                        <button type="button" onClick={handleGenerateCertificate} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition">Generiraj certifikat</button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="relative">
                    

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Naziv projekta:</label>
                            <input 
                                type="text" 
                                name="name" 
                                value={formData.name} 
                                onChange={handleChange} 
                                readOnly={!permissions.includes('create_projects')}
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_projects') ? 'bg-gray-200' : ''}`}
                            />
                            {/* readOnly --- ako ne zelis da se moze editirati input  */}
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">ID projekta:</label>
                            <input 
                                type="text" 
                                name="id" 
                                value={formData.id} 
                                readOnly 
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_projects') ? 'bg-gray-200' : ''}`} 
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Datum početka:</label>
                            <input 
                                type="date" 
                                name="startDate" 
                                value={formData.startDate} 
                                onChange={handleChange} 
                                readOnly={!permissions.includes('create_projects')}
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_projects') ? 'bg-gray-200' : ''}`} 
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Datum završetka:</label>
                            <input 
                                type="date" 
                                name="endDate" 
                                value={formData.endDate} 
                                onChange={handleChange} 
                                readOnly={!permissions.includes('create_projects')}
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_projects') ? 'bg-gray-200' : ''}`}
                            />
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-gray-700 font-medium mb-2">Status:</label>
                            <select 
                                name="status" 
                                disabled={!permissions.includes('create_projects')} 
                                value={formData.status} 
                                onChange={handleChange} 
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_projects') ? 'bg-gray-200' : ''}`}
                            >
                                <option value="aktivan">Aktivan</option>
                                <option value="završen">Završen</option>
                                <option value="odgođen">Odgođen</option>
                            </select>
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-gray-700 font-medium mb-2">Opis projekta:</label>
                            <textarea 
                                name="description" 
                                value={formData.description} 
                                onChange={handleChange} 
                                readOnly={!permissions.includes('create_projects')}
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_projects') ? 'bg-gray-200' : ''}`} 
                                rows="4" 
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Budžet:</label>
                            <input 
                                type="number" 
                                name="budget" 
                                value={formData.budget} 
                                onChange={handleChange} 
                                readOnly={!permissions.includes('create_projects')}
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_projects') ? 'bg-gray-200' : ''}`}
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Troškovi do sada:</label>
                            <input 
                                type="number" 
                                name="costs" 
                                value={formData.costs}
                                onChange={handleChange} 
                                readOnly={!permissions.includes('create_projects')}
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_projects') ? 'bg-gray-200' : ''}`} 
                            />
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between mt-6">
                    {permissions.includes('update_projects') && (
                        <button type="submit" className="bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 transition mb-2 sm:mb-0 sm:w-auto">Spremi</button>
                    )}
                    {permissions.includes('delete_projects') && project.id && (
                        <button 
                            type="button" 
                            onClick={() => onDelete(project.id)} 
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

export default ProjectForm;
