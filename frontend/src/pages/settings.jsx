import React, { useState } from 'react';
import { toast } from 'sonner';
import useStore from '../store';

const Settings = () => {
    const { theme, setTheme, language, setLanguage } = useStore();
    const [defaultWorkOrderType, setDefaultWorkOrderType] = useState(
        localStorage.getItem("defaultWorkOrderType") || "Service"
    );

    const handleSave = async () => {
        localStorage.setItem("theme", theme);
        localStorage.setItem("defaultWorkOrderType", defaultWorkOrderType);
        document.documentElement.classList.toggle("dark", theme === "dark");
        toast.success("Postavke su spremljene.");
    };

    return (
        <div className="min-h-screen bg-slate-100 px-4 pb-10 pt-24 sm:px-7">
            <div className="mx-auto max-w-3xl"><header className="mb-6"><p className="text-sm font-black uppercase tracking-widest text-orange-600">Administracija</p><h1 className="text-3xl font-black text-slate-900">Postavke aplikacije</h1><p className="mt-2 text-slate-500">Prilagodite izgled, jezik i zadane vrijednosti.</p></header><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                <div className="mb-6">
                    <label className="mb-2 block font-bold text-slate-700">Tema</label>
                    <select
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        className="w-full border p-3 rounded-lg bg-white focus:outline-none focus:ring focus:ring-blue-300"
                    >
                        <option value="light">Svijetla</option><option value="dark">Tamna</option>
                    </select>
                </div>

                <div className="mb-6">
                    <label className="mb-2 block font-bold text-slate-700">Jezik</label>
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full border p-3 rounded-lg bg-white focus:outline-none focus:ring focus:ring-blue-300"
                    >
                        <option value="hr">Hrvatski / Bosanski</option><option value="en">English</option>
                    </select>
                </div>

                <div className="mb-6">
                    <label className="mb-2 block font-bold text-slate-700">Zadana vrsta radnog naloga</label>
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
                        className="w-full rounded-xl bg-orange-500 px-6 py-3 font-bold text-white shadow-lg shadow-orange-200 hover:bg-orange-600 sm:w-auto"
                    >
                        Spremi postavke
                    </button>
                </div>
            </div></div>
        </div>
    );
};

export default Settings;
