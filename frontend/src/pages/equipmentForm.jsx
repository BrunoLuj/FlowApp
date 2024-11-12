import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import useStore from '../store';
import { saveEquipment, fetchEquipment, deleteEquipment } from '../services/equipmentServices';

const EquipmentTabs = () => {
    const [activeTab, setActiveTab] = useState('Sonda'); // Default active tab
    const [equipmentData, setEquipmentData] = useState({});
    const [equipmentList, setEquipmentList] = useState([]);

    const location = useLocation();
    const client = location.state?.client;
    console.log(client)
    const { permissions } = useStore();
    
    // Fetch equipment data based on active tab
    const fetchEquipmentData = async (type) => {
        try {
            console.log('Fetching equipment data...');
            const data = await fetchEquipment(client.id, type);
            
            console.log('Fetched data:', data.data); // Prikazivanje podataka u konzoli
    
            setEquipmentList(data.data);  // Postavite podatke u stanje

            console.log('Equipment List:', equipmentList); 
            console.log('Type of equipmentList:', Array.isArray(equipmentList)); // Da li je niz?
    
        } catch (error) {
            console.error('Failed to fetch data:', error);
            toast.error('Failed to fetch equipment data.');
        }
    };
    
    useEffect(() => {
        console.log('Equipment List:', equipmentList);  // Ovde proverite stanje
    }, [equipmentList]);

    // Handle tab change
    const handleTabChange = (type) => {
        setActiveTab(type);
        setEquipmentData({});
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
            await saveEquipment(activeTab, {
                ...equipmentData,
                clientId: client.id, // ID klijenta koji može biti dinamicki dodeljen ili dobijen iz sesije
            });
            toast.success(`${activeTab} saved successfully!`);
            fetchEquipmentData(activeTab);
            setEquipmentData({});
        } catch (error) {
            toast.error('Error saving equipment.');
        }
    };

    useEffect(() => {
        fetchEquipmentData(activeTab); // Load data for default tab
    }, [activeTab]);

    const handleDelete = async (id) => {
        try {
            await deleteEquipment(id, activeTab);
            toast.success('Equipment deleted successfully!');
            fetchEquipmentData(activeTab); // Refresh the list after deletion
        } catch (error) {
            toast.error('Error deleting equipment.');
        }
    };
    
    const handleEdit = (equipment) => {
        if(activeTab === "Sonda"){
            setEquipmentData({
                name: equipment.name,
                serialNumber: equipment.serial_number,
                serialNumberController: equipment.serial_number_controller,
                sondatype: equipment.sondatype,
                manufacturer: equipment.manufacturer,
                officialmark: equipment.officialmark,
                tank: equipment.tank,
                fuel: equipment.fuel,
                status: equipment.status,
                description: equipment.description,
                id: equipment.id, // Add ID to the form data for the update
            });
        }else if(activeTab === "Volumetar"){
            setEquipmentData({
                name: equipment.name,
                serialNumber: equipment.serial_number,
                manufacturer: equipment.manufacturer,
                volumetype: equipment.volumetype,
                officialmark: equipment.officialmark,
                serialNumberDevice: equipment.serial_number_device,
                volume: equipment.volume,
                status: equipment.status,
                description: equipment.description,
                id: equipment.id, // Add ID to the form data for the update
            });
        }else if(activeTab === "Rezervoar"){
            setEquipmentData({
                name: equipment.name,
                serialNumber: equipment.serial_number,
                description: equipment.description,
                id: equipment.id, // Add ID to the form data for the update
            });
        }else if(activeTab === "Mjerna Letva"){
            setEquipmentData({
                name: equipment.name,
                serialNumber: equipment.serial_number,
                description: equipment.description,
                id: equipment.id, // Add ID to the form data for the update
            });
        }

    };

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
                            {equipmentList && equipmentList.length > 0 ? (
                                equipmentList.map((equipment) => (
                                    <tr key={equipment.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 border-b">{equipment.name}</td>
                                        <td className="px-4 py-2 border-b">{equipment.serial_number}</td>
                                        <td className="px-4 py-2 border-b">{equipment.description}</td>
                                        <td className="px-4 py-2 border-b">
                                            <button
                                                onClick={() => handleEdit(equipment)}
                                                className="text-blue-600 hover:text-blue-800 mr-3"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(equipment.id)}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="4" className="text-center py-2">No equipment found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// Reusable form components for each equipment type
const SondaForm = ({ equipmentData, handleChange }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
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
            <label className="block text-lg font-medium">Serial Number Controller:</label>
            <input
                type="text"
                name="serialNumberController"
                value={equipmentData.serialNumberController || ''}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
        </div>
        <div>
            <label className="block text-lg font-medium">Sonda Type:</label>
            <input
                type="text"
                name="sondatype"
                value={equipmentData.sondatype || ''}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
        </div>
        <div>
            <label className="block text-lg font-medium">Manufacturer:</label>
            <input
                type="text"
                name="manufacturer"
                value={equipmentData.manufacturer || ''}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
        </div>
        <div>
            <label className="block text-lg font-medium">Official mark:</label>
            <input
                type="text"
                name="officialmark"
                value={equipmentData.officialmark || ''}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
        </div>
        <div>
            <label className="block text-lg font-medium">Tank:</label>
            <input
                type="text"
                name="tank"
                value={equipmentData.tank || ''}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
        </div>
        <div>
            <label className="block text-lg font-medium">Fuel:</label>
            <input
                type="text"
                name="fuel"
                value={equipmentData.fuel || ''}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
        </div>
        <div>
            <label className="block text-lg font-medium">Status:</label>
            <select
                name="status"
                value={equipmentData.status || 'inactive'}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
            </select>
        </div>
        <div className="col-span-1 sm:col-span-2">
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
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
            <label className="block text-lg font-medium">Manufacturer:</label>
            <input
                type="text"
                name="manufacturer"
                value={equipmentData.manufacturer || ''}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
        </div>
        <div>
            <label className="block text-lg font-medium">Type:</label>
            <input
                type="text"
                name="volumetype"
                value={equipmentData.volumetype || ''}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
        </div>
        <div>
            <label className="block text-lg font-medium">Official mark:</label>
            <input
                type="text"
                name="officialmark"
                value={equipmentData.officialmark || ''}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
        </div>
        <div>
            <label className="block text-lg font-medium">Serial Number Device:</label>
            <input
                type="text"
                name="serialNumberDevice"
                value={equipmentData.serialNumberDevice || ''}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
        </div>
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
            <label className="block text-lg font-medium">Status:</label>
            <select
                name="status"
                value={equipmentData.status || 'inactive'}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
            </select>
        </div>
        <div className='col-span-1 sm:col-span-2'>
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
