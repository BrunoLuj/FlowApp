import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import useStore from '../store';
import api from '../libs/apiCall';

const Settings = () => {
    const { theme, setTheme, language, setLanguage } = useStore();
    const [loading, setLoading] = useState(true);
    const [defaultWorkOrderType, setDefaultWorkOrderType] = useState('');

    useEffect(() => {
        // Ako imaš backend za globalne postavke
        const fetchSettings = async () => {
            try {
                const res = await api.get('/settings'); // backend endpoint za admin settings
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

    if (loading) return <p>Loading...</p>;

    return (
        <div className="p-4 sm:ml-16 mt-14 max-w-3xl mx-auto">
            <h1 className="text-2xl font-semibold mb-6">Admin Settings</h1>

            <div className="mb-4">
                <label className="block mb-1">Theme</label>
                <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="border rounded px-3 py-2 w-full"
                >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                </select>
            </div>

            <div className="mb-4">
                <label className="block mb-1">Language</label>
                <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="border rounded px-3 py-2 w-full"
                >
                    <option value="en">English</option>
                    <option value="hr">Hrvatski</option>
                </select>
            </div>

            <div className="mb-4">
                <label className="block mb-1">Default Work Order Type</label>
                <input
                    type="text"
                    value={defaultWorkOrderType}
                    onChange={(e) => setDefaultWorkOrderType(e.target.value)}
                    className="border rounded px-3 py-2 w-full"
                />
            </div>

            <button
                onClick={handleSave}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
                Save Settings
            </button>
        </div>
    );
};

export default Settings;
