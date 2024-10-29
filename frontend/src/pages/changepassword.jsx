import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { changePassword } from '../services/usersServices.js';
import useStore from '../store';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';

const ChangePassword = () => {
    const navigate = useNavigate();
    const { user } = useStore();
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [error, setError] = useState(null);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const validatePassword = (password) => {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        return password.length >= minLength && hasUpperCase && hasSpecialChar;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (formData.newPassword !== formData.confirmPassword) {
            setError("New password and confirmation do not match.");
            return;
        }

        if (!validatePassword(formData.newPassword)) {
            setError("New password must be at least 8 characters, including one uppercase letter and one special character.");
            return;
        }

        try {
            await changePassword({
                id: user.id,
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword,
                confirmPassword: formData.confirmPassword,
            });
            toast.success("Password changed successfully!");
            navigate('/profile');
        } catch (error) {
            toast.error(error.response?.data?.message || "An error occurred. Please try again.");
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
                <h2 className="text-2xl font-semibold mb-6 text-center">Change Password</h2>
                {error && <div className="mb-4 text-red-600">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-gray-700 font-medium mb-1" htmlFor="currentPassword">Current Password:</label>
                        <div className="relative">
                            <input 
                                type={showCurrentPassword ? 'text' : 'password'} 
                                name="currentPassword" 
                                value={formData.currentPassword} 
                                onChange={handleChange} 
                                required
                                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-400 transition duration-150"
                            />
                            <button type="button" className="absolute right-3 top-3" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                                {showCurrentPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-gray-700 font-medium mb-1" htmlFor="newPassword">New Password:</label>
                        <div className="relative">
                            <input 
                                type={showNewPassword ? 'text' : 'password'} 
                                name="newPassword" 
                                value={formData.newPassword} 
                                onChange={handleChange} 
                                required
                                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-400 transition duration-150"
                            />
                            <button type="button" className="absolute right-3 top-3" onClick={() => setShowNewPassword(!showNewPassword)}>
                                {showNewPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-gray-700 font-medium mb-1" htmlFor="confirmPassword">Confirm New Password:</label>
                        <div className="relative">
                            <input 
                                type={showConfirmPassword ? 'text' : 'password'} 
                                name="confirmPassword" 
                                value={formData.confirmPassword} 
                                onChange={handleChange} 
                                required
                                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-blue-400 transition duration-150"
                            />
                            <button type="button" className="absolute right-3 top-3" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                {showConfirmPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
                            </button>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button 
                            type="submit" 
                            className="w-full bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 transition duration-200"
                        >
                            Change Password
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChangePassword;
