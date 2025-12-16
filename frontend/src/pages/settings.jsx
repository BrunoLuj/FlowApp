import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import useStore from '../store';
import api from '../libs/apiCall';

const Settings = () => {
    const { theme, setTheme, language, setLanguage } = useStore();
    const [loading, setLoading] = useState(true);
    const [defaultWorkOrderType, setDefaultWorkOrderType] = useState('');

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/settings');
                const settings = res.data;
                setDefaultWorkOrderType(settings.defaultWorkOrderType);
            } catch (err) {
                console.error(err);
                toast.error("Error fetching settings");
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        try {
            await api.post('/settings', { defaultWorkOrderType });
            toast.success("Settings saved!");
        } catch (err) {
            console.error(err);
            toast.error("Error saving settings");
        }
    };

    if (loading) return <div className="p-6">Loading...</div>;

    return (
        <div className="bg-gray-100 min-h-screen p-6 mt-14 sm:ml-16">
            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-6">
                <h1 className="text-2xl font-semibold mb-6 text-center">Admin Settings</h1>

                <div className="mb-6">
                    <label className="block text-gray-700 mb-2">Theme</label>
                    <select
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        className="w-full border p-3 rounded-lg bg-white focus:outline-none focus:ring focus:ring-blue-300"
                    >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                    </select>
                </div>

                <div className="mb-6">
                    <label className="block text-gray-700 mb-2">Language</label>
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full border p-3 rounded-lg bg-white focus:outline-none focus:ring focus:ring-blue-300"
                    >
                        <option value="en">English</option>
                        <option value="hr">Hrvatski</option>
                    </select>
                </div>

                <div className="mb-6">
                    <label className="block text-gray-700 mb-2">Default Work Order Type</label>
                    <input
                        type="text"
                        value={defaultWorkOrderType}
                        onChange={(e) => setDefaultWorkOrderType(e.target.value)}
                        className="w-full border p-3 rounded-lg bg-white focus:outline-none focus:ring focus:ring-blue-300"
                    />
                </div>

                <div className="flex justify-end mt-4">
                    <button
                        onClick={handleSave}
                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold shadow hover:scale-105 transition"
                    >
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
