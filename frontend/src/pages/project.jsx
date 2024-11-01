import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useStore from '../store';
import { deleteProject, saveProject } from '../services/projectsServices';
import { toast } from 'sonner';
import { getClients } from '../services/clientsServices';
import { getRoles, getUsers } from '../services/usersServices';
import UserMultiSelectDropdown from '../components/ui/multiselectdropdown';

const ProjectForm = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const project = location.state?.project || {};
    const { permissions } = useStore();

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().slice(0, 16); // Uzimamo do sekundi (YYYY-MM-DDTHH:mm)
    };

    const [formData, setFormData] = useState({
        id: project.id || '',
        name: project.name || '',
        responsible_person: project.responsible_person || '',
        service_executors: project.service_executors || [],
        project_type: project.project_type || '',
        start_date: formatDate(project.start_date),
        end_date: formatDate(project.end_date),
        status: project.status || 'Active',
        description: project.description || '',
        budget: project.budget || 0,
        costs: project.costs || 0,
    });

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const response = await getClients();
                setClients(response.data);
                const [usersResponse, rolesResponse] = await Promise.all([getUsers(), getRoles()]);
                setUsers(usersResponse.data);
                setRoles(rolesResponse.data);

            // Postavi odabrane korisnike ako postoji projekt
            if (project.service_executors) {
                const selectedServiceExecutors = project.service_executors.map(item => JSON.parse(item));
                setSelectedUsers(selectedServiceExecutors);
            }

            } catch (error) {
                console.error("Error fetching clients:", error);
            }
        };

        fetchClients();
    }, []);

    const responsiblePersons = users.filter(user => user.roles_id === 2);
    const serviceExecutors = users.filter(user => [3].includes(user.roles_id));

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Validacija
        if (!formData.name || !formData.responsible_person) {
            toast.error("Molimo popunite obavezna polja.");
            return;
        }
        
            // Pripremi niz objekata kao stringove
            const serviceExecutors = selectedUsers.map(user => 
                JSON.stringify({ id: user.id, fullName: user.firstname + ' ' + user.lastname })
            );

            const updatedFormData = {
                ...formData,
                service_executors: serviceExecutors, // Sada šalješ objekte
            };
    
        try {
            await saveProject(updatedFormData);
            toast.success("Project saved successfully!");
            navigate('/projects');
        } catch (error) {
            toast.error(error.response?.data?.message || "An error occurred. Please try again.");
        }
    };


    const handleGenerateReport = () => {
        const reportData = {
            name: formData.name,
            responsible_person: formData.responsible_person,
            service_executors: selectedUsers,
            project_type: formData.project_type,
            start_date: formData.start_date,
            end_date: formData.end_date,
            status: formData.status,
            description: formData.description,
            budget: formData.budget,
            costs: formData.costs,
        };
        
        navigate('/inspectionResult', { state: { reportData } });
    };


    const handleGenerateCertificate = () => {
        // Logika za generiranje certifikata
        console.log("Certifikat generiran za projekat:", formData);
    };

    const removeProject = async (project_id) => {
        await deleteProject(project_id); // Pozovi API funkciju
        navigate('/projects');
    };

    const handleSelectionChange = (selectedValues) => {
        setSelectedUsers(selectedValues);
        console.log('Odabrani korisnici:', selectedValues);
    };

    return (
        <div className="bg-gray-100 min-h-screen p-4 mt-14 sm:ml-16">
            <div className="w-full">
                <h2 className="text-3xl p-4 font-bold text-center">{project.name || 'New Project'}</h2>
                <div className="absolute right-4">
                    <button type="button" onClick={handleGenerateReport} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition mr-2">Generiraj izvještaj</button>
                    {permissions.includes('create_projects') && (
                        <button type="button" onClick={handleGenerateCertificate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">Generiraj certifikat</button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="relative">
                    

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
                        {/* <div>
                            <label className="block text-gray-700 font-medium mb-2">Naziv klijenta:</label>
                            <input 
                                type="text" 
                                name="name" 
                                value={formData.name} 
                                onChange={handleChange} 
                                readOnly={!permissions.includes('create_projects')}
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_projects') ? 'bg-gray-200' : ''}`} */}
                            {/* /> */}
                            {/* readOnly --- ako ne zelis da se moze editirati input  */}
                        {/* </div> */}
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Naziv klijenta:</label>
                            <select 
                                name="name" 
                                value={formData.name} 
                                onChange={handleChange} 
                                disabled={!permissions.includes('create_projects')}
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_projects') ? 'bg-gray-200' : ''}`}
                            >
                                <option value="">Odaberite klijenta</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.company_name}>
                                        {client.company_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Responsible Person selection */}
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Odgovorna osoba:</label>
                            <select 
                                name="responsible_person" 
                                value={formData.responsible_person} 
                                onChange={handleChange} 
                                disabled={!permissions.includes('create_projects')}
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_projects') ? 'bg-gray-200' : ''}`}
                            >
                                <option value="">Odaberite odgovornu osobu</option>
                                {responsiblePersons.map(user => (
                                    <option key={user.id} value={user.firstname + ' ' + user.lastname}>
                                        {user.firstname + ' ' + user.lastname}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Service Executors selection */}
                        <div>
                        <label className="block text-gray-700 font-medium mb-2">Odaberi izvršitelje usluge:</label>
                            <UserMultiSelectDropdown
                                users={serviceExecutors}
                                selectedUsers={selectedUsers}
                                onSelectionChange={setSelectedUsers}
                            />
                        </div>
                        

                        {/* <div>
                            <label className="block text-gray-700 font-medium mb-2">ID projekta:</label>
                            <input 
                                type="text" 
                                name="id" 
                                value={formData.id} 
                                readOnly 
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_projects') ? 'bg-gray-200' : ''}`} 
                            />
                        </div> */}

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Datum početka:</label>
                            <input 
                                type="datetime-local" 
                                name="start_date" 
                                value={formData.start_date} 
                                onChange={handleChange} 
                                readOnly={!permissions.includes('create_projects')}
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_projects') ? 'bg-gray-200' : ''}`} 
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Datum završetka:</label>
                            <input 
                                type="datetime-local" 
                                name="end_date" 
                                value={formData.end_date} 
                                onChange={handleChange} 
                                readOnly={!permissions.includes('create_projects')}
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_projects') ? 'bg-gray-200' : ''}`}
                            />
                        </div>

                        <div 
                        // className="col-span-1 md:col-span-2"
                        >
                            <label className="block text-gray-700 font-medium mb-2">Project Type:</label>
                            <select 
                                name="project_type" 
                                disabled={!permissions.includes('create_projects')} 
                                value={formData.project_type} 
                                onChange={handleChange} 
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_projects') ? 'bg-gray-200' : ''}`}
                            >
                                <option value="Volumetri">Volumetri</option>
                                <option value="Rezervoar">Rezervoar</option>
                                <option value="AMN">AMN</option>
                                <option value="Mjerna Letva">Mjerna Letva</option>
                            </select>
                        </div>

                        <div 
                        // className="col-span-1 md:col-span-2"
                        >
                            <label className="block text-gray-700 font-medium mb-2">Status:</label>
                            <select 
                                name="status" 
                                disabled={!permissions.includes('create_projects')} 
                                value={formData.status} 
                                onChange={handleChange} 
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_projects') ? 'bg-gray-200' : ''}`}
                            >
                                <option value="Active">Active</option>
                                <option value="Completed">Completed</option>
                                <option value="Pending">Pending</option>
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

                        {/* <div>
                            <label className="block text-gray-700 font-medium mb-2">Budžet:</label>
                            <input 
                                type="number" 
                                name="budget" 
                                value={formData.budget} 
                                onChange={handleChange} 
                                readOnly={!permissions.includes('create_projects')}
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_projects') ? 'bg-gray-200' : ''}`}
                            />
                        </div> */}

                        {/* <div>
                            <label className="block text-gray-700 font-medium mb-2">Troškovi do sada:</label>
                            <input 
                                type="number" 
                                name="costs" 
                                value={formData.costs}
                                onChange={handleChange} 
                                readOnly={!permissions.includes('create_projects')}
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_projects') ? 'bg-gray-200' : ''}`} 
                            />
                        </div> */}
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between mt-6">
                    {permissions.includes('update_projects') && (
                        <button type="submit" className="bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 transition mb-2 sm:mb-0 sm:w-auto">Spremi</button>
                    )}
                    {permissions.includes('delete_projects') && project.id && (
                        <button 
                            type="button" 
                            onClick={() => removeProject(project.id)} 
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
