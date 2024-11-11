import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { saveEquipment, fetchEquipment } from '../services/equipmentServices';

const EquipmentTabs = () => {
    const [activeTab, setActiveTab] = useState('Sonda'); // Default active tab
    const [equipmentData, setEquipmentData] = useState({});
    const [equipmentList, setEquipmentList] = useState([]);
    
    // Fetch equipment data based on active tab
    const fetchEquipmentData = async (type) => {
        try {
            const data = await fetchEquipment(type);
            setEquipmentList(data);
        } catch (error) {
            toast.error('Failed to fetch equipment data.');
        }
    };

    // Handle tab change
    const handleTabChange = (type) => {
        setActiveTab(type);
        fetchEquipmentData(type); // Fetch data when tab changes
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEquipmentData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            await saveEquipment(activeTab, equipmentData); // Send data to backend
            toast.success(`${activeTab} saved successfully!`);
            fetchEquipmentData(activeTab); // Reload the equipment list
            setEquipmentData({}); // Clear form after submit
        } catch (error) {
            toast.error('Error saving equipment.');
        }
    };

    useEffect(() => {
        fetchEquipmentData(activeTab); // Load data for default tab
    }, [activeTab]);

    return (
        <div className="container mx-auto p-6">
            <h2 className="text-2xl font-semibold mb-6">Manage Equipment</h2>

            {/* Tab Navigation */}
            <div className="flex overflow-x-auto mb-6 border-b border-gray-300">
                {['Sonda', 'Volumetar', 'Rezervoar', 'Mjerna Letva'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => handleTabChange(tab)}
                        className={`px-6 py-3 text-lg font-medium transition-colors duration-300 whitespace-nowrap
                            ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Equipment Form for Current Tab */}
            <div className="mb-6">
                <h3 className="text-xl font-medium mb-4">Add {activeTab}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {activeTab === 'Sonda' && <SondaForm equipmentData={equipmentData} handleChange={handleChange} />}
                    {activeTab === 'Volumetar' && <VolumetarForm equipmentData={equipmentData} handleChange={handleChange} />}
                    {activeTab === 'Rezervoar' && <RezervoarForm equipmentData={equipmentData} handleChange={handleChange} />}
                    {activeTab === 'Mjerna Letva' && <MjernaLetvaForm equipmentData={equipmentData} handleChange={handleChange} />}
                    <button
                        type="submit"
                        className="bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-300"
                    >
                        Save Equipment
                    </button>
                </form>
            </div>

            {/* Equipment List */}
            <div>
                <h3 className="text-xl font-medium mb-4">{activeTab} Equipment List</h3>
                <div className="overflow-x-auto">
                    <table className="w-full table-auto border-collapse">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="px-4 py-2 text-left border-b">Name</th>
                                <th className="px-4 py-2 text-left border-b">Serial Number</th>
                                <th className="px-4 py-2 text-left border-b">Description</th>
                                <th className="px-4 py-2 text-left border-b">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {equipmentList.map((equipment) => (
                                <tr key={equipment.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 border-b">{equipment.name}</td>
                                    <td className="px-4 py-2 border-b">{equipment.serialNumber}</td>
                                    <td className="px-4 py-2 border-b">{equipment.description}</td>
                                    <td className="px-4 py-2 border-b">
                                        <button
                                            // onClick={() => handleDelete(equipment.id)}
                                            className="text-red-600 hover:text-red-800"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// Reusable form components for each equipment type
const SondaForm = ({ equipmentData, handleChange }) => (
    <div className="space-y-4">
        <div>
            <label className="block text-lg font-medium">Name:</label>
            <input
                type="text"
                name="name"
                value={equipmentData.name || ''}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
        </div>
        <div>
            <label className="block text-lg font-medium">Serial Number:</label>
            <input
                type="text"
                name="serialNumber"
                value={equipmentData.serialNumber || ''}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
        </div>
        <div>
            <label className="block text-lg font-medium">Description:</label>
            <textarea
                name="description"
                value={equipmentData.description || ''}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                rows="4"
            />
        </div>
    </div>
);

const VolumetarForm = ({ equipmentData, handleChange }) => (
    <div className="space-y-4">
        <div>
            <label className="block text-lg font-medium">Volume:</label>
            <input
                type="number"
                name="volume"
                value={equipmentData.volume || ''}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
        </div>
        <div>
            <label className="block text-lg font-medium">Serial Number:</label>
            <input
                type="text"
                name="serialNumber"
                value={equipmentData.serialNumber || ''}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
        </div>
        <div>
            <label className="block text-lg font-medium">Description:</label>
            <textarea
                name="description"
                value={equipmentData.description || ''}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                rows="4"
            />
        </div>
    </div>
);

const RezervoarForm = ({ equipmentData, handleChange }) => (
    <div className="space-y-4">
        <div>
            <label className="block text-lg font-medium">Capacity:</label>
            <input
                type="number"
                name="capacity"
                value={equipmentData.capacity || ''}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
        </div>
        <div>
            <label className="block text-lg font-medium">Serial Number:</label>
            <input
                type="text"
                name="serialNumber"
                value={equipmentData.serialNumber || ''}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
        </div>
        <div>
            <label className="block text-lg font-medium">Description:</label>
            <textarea
                name="description"
                value={equipmentData.description || ''}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                rows="4"
            />
        </div>
    </div>
);

const MjernaLetvaForm = ({ equipmentData, handleChange }) => (
    <div className="space-y-4">
        <div>
            <label className="block text-lg font-medium">Length:</label>
            <input
                type="number"
                name="length"
                value={equipmentData.length || ''}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
        </div>
        <div>
            <label className="block text-lg font-medium">Serial Number:</label>
            <input
                type="text"
                name="serialNumber"
                value={equipmentData.serialNumber || ''}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
        </div>
        <div>
            <label className="block text-lg font-medium">Description:</label>
            <textarea
                name="description"
                value={equipmentData.description || ''}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                rows="4"
            />
        </div>
    </div>
);

export default EquipmentTabs;
