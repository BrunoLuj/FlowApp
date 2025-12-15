import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store';
import { saveUserProfile } from '../services/usersServices';
import { toast } from 'sonner';

const Profile = () => {
    const navigate = useNavigate();
    const { user, permissions, updateCredentials } = useStore();
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
        if (!user) {
            navigate('/sign-in');
            return;
        }

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
        setLoading(false);
    }, [user, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'status' ? value === 'Active' : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await saveUserProfile(formData);
            updateCredentials(response.data.user);
            toast.success("Podaci su uspešno ažurirani!");
            navigate('/');
        } catch (error) {
            toast.error(error.response?.data?.message || "Došlo je do greške. Pokušajte ponovo.");
        }
    };

    if (loading) return <div className="p-6">Loading...</div>;
    if (error) return <div className="p-6 text-red-600">Error: {error.message}</div>;

    return (
        <div className="bg-gray-100 min-h-screen p-6 mt-14 sm:ml-16">
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-3xl font-bold text-center mb-6">
                    {formData.firstname || formData.lastname ? `${formData.firstname} ${formData.lastname}` : 'Profil'}
                </h2>

                <div className="flex justify-end mb-6">
                    <button
                        type="button"
                        onClick={() => navigate('/change-password')}
                        className="bg-gradient-to-r from-green-500 to-green-700 text-white px-5 py-3 rounded-lg hover:from-green-600 hover:to-green-800 transition"
                    >
                        Change Password
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {['firstname', 'lastname', 'address', 'contact', 'country', 'currency'].map((field, idx) => (
                            <div key={idx}>
                                <label className="block text-gray-700 mb-2 capitalize">{field}:</label>
                                <input
                                    type={field === 'contact' ? 'number' : 'text'}
                                    name={field}
                                    value={formData[field]}
                                    onChange={handleChange}
                                    readOnly={!permissions.includes('update_profile')}
                                    className={`w-full border p-3 rounded-lg focus:ring focus:ring-blue-300 ${
                                        !permissions.includes('update_profile') ? 'bg-gray-200' : 'bg-white'
                                    }`}
                                />
                            </div>
                        ))}

                        <div>
                            <label className="block text-gray-700 mb-2">Email:</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                readOnly
                                className="w-full border p-3 rounded-lg bg-gray-200 focus:ring focus:ring-blue-300"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 mb-2">Status:</label>
                            <select
                                name="status"
                                value={formData.status ? 'Active' : 'InActive'}
                                disabled
                                className="w-full border p-3 rounded-lg bg-gray-200 focus:ring focus:ring-blue-300"
                            >
                                <option value="Active">Active</option>
                                <option value="InActive">InActive</option>
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-gray-700 mb-2">Opis korisnika:</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                readOnly={!permissions.includes('update_profile')}
                                className={`w-full border p-3 rounded-lg focus:ring focus:ring-blue-300 ${
                                    !permissions.includes('update_profile') ? 'bg-gray-200' : 'bg-white'
                                }`}
                                rows="4"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between gap-4 mt-6">
                        {permissions.includes('update_profile') && (
                            <button
                                type="submit"
                                className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-5 py-3 rounded-lg hover:from-blue-600 hover:to-blue-800 transition w-full sm:w-auto"
                            >
                                Update
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Profile;
