import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store';
import { deleteUser, getRoles, saveUser, saveUserProfile } from '../services/usersServices';
import { toast } from 'sonner';

const Profile = () => {
    const navigate = useNavigate();
    const { user, permissions, setCredentials } = useStore();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        id: '',
        firstname: '',
        lastname: '',
        email: '',
        address: '',
        contact: '',
        country: '',
        currency: '',
        roles_id: '',
        status: false,
        description: '',
    });

    useEffect(() => {
        const fetchData = async () => {
            if (!user) {
                navigate('/sign-in');
                return;
            }
            
            try {
                setFormData({
                    id: user.id,
                    firstname: user.firstname,
                    lastname: user.lastname,
                    email: user.email || '',
                    address: user.address || '',
                    contact: user.contact || '',
                    country: user.country || '',
                    currency: user.currency || '',
                    roles_id: user.roles_id || '',
                    status: user.status,
                    description: user.description || '',
                });
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: name === 'status' ? value === 'Active' : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response  = await saveUserProfile(formData);
            const updatedUser = response.data.user; 
            setCredentials(updatedUser);
            toast.success("Podaci su uspešno ažurirani!");
            navigate('/');
        } catch (error) {
            toast.error(error.response?.data?.message || "Došlo je do greške. Pokušajte ponovo.");
        }
    };

    const removeUser = async (userId) => {
        await deleteUser(userId);
        navigate('/users');
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;

    return (
        <div className="bg-gray-100 min-h-screen p-4 mt-14 sm:ml-16">
            <div className="w-full">
                <h2 className="text-3xl p-4 font-bold text-center">
                    {formData.firstname || formData.lastname ? `${formData.firstname} ${formData.lastname}` : ''}
                </h2>
                 {/* Change Password */}
                 <div className="flex justify-end mt-1">
                        <button 
                            type="button" 
                            onClick={() => navigate('/change-password')} 
                            className="bg-green-600 text-white px-5 py-3 rounded-lg hover:bg-green-700 transition"
                        >
                            Change Password
                        </button>
                    </div>
                <form onSubmit={handleSubmit} className="relative">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
                        {['firstname', 'lastname', 'address', 'contact', 'country', 'currency'].map((field, index) => (
                            <div key={index}>
                                <label className="block text-gray-700 font-medium mb-2">{field.charAt(0).toUpperCase() + field.slice(1)}:</label>
                                <input 
                                    type={field === 'contact' ? 'number' : 'text'} 
                                    name={field} 
                                    value={formData[field]} 
                                    onChange={handleChange} 
                                    readOnly={!permissions.includes('update_profile')}
                                    className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('update_profile') ? 'bg-gray-200' : ''}`}
                                />
                            </div>
                        ))}
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Email:</label>
                            <input 
                                type="email" 
                                name="email" 
                                value={formData.email} 
                                onChange={handleChange} 
                                readOnly
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_user') ? 'bg-gray-200' : ''}`}
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Status:</label>
                            <select 
                                name="status" 
                                disabled
                                value={formData.status ? 'Active' : 'InActive'}
                                onChange={handleChange} 
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('create_users') ? 'bg-gray-200' : ''}`}
                            >
                                <option value="Active">Active</option>
                                <option value="InActive">InActive</option>
                            </select>
                        </div>
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-gray-700 font-medium mb-2">Opis korisnika:</label>
                            <textarea 
                                name="description" 
                                value={formData.description} 
                                onChange={handleChange} 
                                readOnly={!permissions.includes('update_profile')}
                                className={`w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-300 ${!permissions.includes('update_profile') ? 'bg-gray-200' : ''}`} 
                                rows="4" 
                            />
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between mt-6">
                        {permissions.includes('update_profile') && (
                            <button type="submit" className="bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 transition mb-2 sm:mb-0 sm:w-auto">Update</button>
                        )}
                    </div>

                </form>
            </div>
        </div>
    );
};

export default Profile;
