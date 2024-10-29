import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useStore from '../store';
import { deleteUser, getRoles, getUsers, saveUser } from '../services/usersServices';
import { toast } from 'sonner';

const UserForm = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]); // State for roles
    const user = location.state?.user || {};
    const { permissions } = useStore();

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    };

    const [formData, setFormData] = useState({
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email || '',
        address: user.address || '',
        contact: user.contact || '',
        country: user.country || '',
        currency: user.currency || '',
        roles_id: user.roles_id || '',
        status: user.status ,
        // startDate: formatDate(user.created_at),
        // end_date: formatDate(user.end_date),
    });

    console.log(formData);

    useEffect(() => {
        const fetchData = async () => {
          try {
            const [usersResponse, rolesResponse] = await Promise.all([getUsers(), getRoles()]);
            setUsers(usersResponse.data);
            setRoles(rolesResponse.data);

              // Ako postoji korisnik, postavi role_id i ime uloge
              if (user) {
                const userRoleId = user.roles_id || '';
                console.log(user.roles_id);
                console.log(rolesResponse.data);
                const userRole = rolesResponse.data.find(role => role.id === userRoleId); // Pronađi ulogu po ID-u

                setFormData((prevData) => ({
                    ...prevData,
                    role_name: userRole ? userRole.name : '', // Postavi naziv uloge ako postoji
                }));
            }

          } catch (err) {
            setError(err);
          } finally {
            setLoading(false);
          }
        };
    
        fetchData();
      }, []);

    const roleMap = {};
    roles.forEach(role => {
      roleMap[role.id] = role.name; // Adjust according to your data structure
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'status') {
            // Convert the selected value to boolean
            setFormData({ ...formData, [name]: value === 'Active' });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log("Form Data before submission:", formData); // Debugging line
        try {
            await saveUser(formData);
            toast.success("Client saved successfully!");
            navigate('/users');
        } catch (error) {
            toast.error(error.response?.data?.message || "An error occurred. Please try again.");
        }
    };

    const handleGenerateReport = () => {
        // Logika za generiranje izvještaja
        console.log("Izvještaj generiran za projekat:", formData);
    };

    const handleGenerateCertificate = () => {
        // Logika za generiranje certifikata
        console.log("Certifikat generiran za projekat:", formData);
    };

    const removeUser = async (user_id) => {
        await deleteUser(user_id); // Pozovi API funkciju
        navigate('/users');
    };

    return (
        <div className="bg-gray-100 min-h-screen p-4 mt-14 sm:ml-16">
            <div className="w-full">
                <h2 className="text-3xl p-4 font-bold text-center">{user.firstname + ' ' + user.lastname || 'New User'}</h2>
                <div className="absolute right-4">
                    <button type="button" onClick={handleGenerateReport} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition mr-2">Generiraj izvještaj</button>
                    {permissions.includes('create_users') && (
                        <button type="button" onClick={handleGenerateCertificate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">Generiraj certifikat</button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="relative">
                    

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Ime korisnika:</label>
                            <input 
                                type="text" 
                                name="firstname" 
                                value={formData.firstname} 
                                onChange={handleChange} 
                                readOnly={!permissions.includes('create_users')}
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_users') ? 'bg-gray-200' : ''}`}
                            />
                            {/* readOnly --- ako ne zelis da se moze editirati input  */}
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Prezime korisnika:</label>
                            <input 
                                type="text" 
                                name="lastname" 
                                value={formData.lastname} 
                                onChange={handleChange} 
                                readOnly={!permissions.includes('create_users')}
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_users') ? 'bg-gray-200' : ''}`} 
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Email:</label>
                            <input 
                                type="email" 
                                name="email" 
                                value={formData.email} 
                                onChange={handleChange} 
                                readOnly={!permissions.includes('create_users')}
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_users') ? 'bg-gray-200' : ''}`} 
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Adresa:</label>
                            <input 
                                type="text" 
                                name="address" 
                                value={formData.address} 
                                onChange={handleChange} 
                                readOnly={!permissions.includes('create_users')}
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_users') ? 'bg-gray-200' : ''}`} 
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Phone:</label>
                            <input 
                                type="number" 
                                name="contact" 
                                value={formData.contact} 
                                onChange={handleChange} 
                                readOnly={!permissions.includes('create_users')} 
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_users') ? 'bg-gray-200' : ''}`} 
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Role:</label>
                            <select 
                                name="roles_id" // Ovdje koristi role_id
                                disabled={!permissions.includes('create_users')} 
                                value={formData.roles_id|| ''} // Postavi vrednost na role_id
                                onChange={handleChange} 
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_users') ? 'bg-gray-200' : ''}`}
                            >
                                <option value="" disabled>Select a role</option> {/* Opcija za odabir */}
                                {roles.map(role => (
                                    <option key={role.id} value={role.id}>
                                        {role.name} {/* Prikazuje ime uloge */}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div 
                        // className="col-span-1 md:col-span-2"
                        >
                            <label className="block text-gray-700 font-medium mb-2">Status:</label>
                            <select 
                                name="status" 
                                disabled={!permissions.includes('create_users')} 
                                value={formData.status ? 'Active' : 'InActive'} // Set display value based on boolean
                                onChange={handleChange} 
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_users') ? 'bg-gray-200' : ''}`}
                            >
                                <option value="Active">Active</option>
                                <option value="InActive">InActive</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Country:</label>
                            <input 
                                type="text" 
                                name="country" 
                                value={formData.country} 
                                onChange={handleChange} 
                                readOnly={!permissions.includes('create_users')}  
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_users') ? 'bg-gray-200' : ''}`} 
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Currency:</label>
                            <input 
                                type="text" 
                                name="currency" 
                                value={formData.currency} 
                                onChange={handleChange} 
                                readOnly={!permissions.includes('create_users')}  
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_users') ? 'bg-gray-200' : ''}`} 
                            />
                        </div>

                        {/* <div>
                            <label className="block text-gray-700 font-medium mb-2">Datum početka:</label>
                            <input 
                                type="date" 
                                name="startDate" 
                                value={formData.startDate} 
                                onChange={handleChange} 
                                readOnly={!permissions.includes('create_users')}
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_users') ? 'bg-gray-200' : ''}`} 
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Datum završetka:</label>
                            <input 
                                type="date" 
                                name="end_date" 
                                value={formData.end_date} 
                                onChange={handleChange} 
                                readOnly={!permissions.includes('create_users')}
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_users') ? 'bg-gray-200' : ''}`}
                            />
                        </div> */}

                        {/* <div 
                        // className="col-span-1 md:col-span-2"
                        >
                            <label className="block text-gray-700 font-medium mb-2">Project Type:</label>
                            <select 
                                name="user_type" 
                                disabled={!permissions.includes('create_users')} 
                                value={formData.user_type} 
                                onChange={handleChange} 
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_users') ? 'bg-gray-200' : ''}`}
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
                                disabled={!permissions.includes('create_users')} 
                                value={formData.status} 
                                onChange={handleChange} 
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_users') ? 'bg-gray-200' : ''}`}
                            >
                                <option value="Active">Aktivan</option>
                                <option value="Completed">Završen</option>
                                <option value="Pending">Odgođen</option>
                            </select>
                        </div> */}

                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-gray-700 font-medium mb-2">Opis korisnika:</label>
                            <textarea 
                                name="description" 
                                value={formData.description} 
                                onChange={handleChange} 
                                readOnly={!permissions.includes('create_users')}
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_users') ? 'bg-gray-200' : ''}`} 
                                rows="4" 
                            />
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between mt-6">
                    {permissions.includes('update_users') && (
                        <button type="submit" className="bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 transition mb-2 sm:mb-0 sm:w-auto">Spremi</button>
                    )}
                    {permissions.includes('delete_users') && user.id && (
                        <button 
                            type="button" 
                            onClick={() => removeUser(user.id)} 
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

export default UserForm;
