import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { fetchEquipment, updateCalibrationExpiry } from '../services/equipmentServices';

const EquipmentManagement = () => {
  const [equipmentData, setEquipmentData] = useState([]);
  const [activeTab, setActiveTab] = useState('Sonda');
  const [calibrationExpiries, setCalibrationExpiries] = useState({});

  const location = useLocation();
  const client = location.state?.client;

  // Funkcija za učitavanje opreme prema vrsti
  const fetchEquipmentData = async (type) => {
    try {
      console.log('Fetching equipment data...');
      const data = await fetchEquipment(client.id, type);
      console.log('Fetched data:', data.data);
      setEquipmentData(data.data);  // Postavljanje podataka o opremi
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to fetch equipment data.');
    }
  };

  useEffect(() => {
    fetchEquipmentData(activeTab); // Učitavanje podataka za trenutni tab
  }, [activeTab]);

  // Funkcija za promenu datuma isteka
  const handleDateChange = (equipmentId, date) => {
    setCalibrationExpiries((prevState) => {
      const equipmentExpiry = prevState[equipmentId] || { current_expiry_date: '', previous_expiry_dates: [] };
      
      // Dodaj trenutni datum u istoriju prethodnih datuma
      const updatedPreviousDates = equipmentExpiry.current_expiry_date
        ? [...equipmentExpiry.previous_expiry_dates, equipmentExpiry.current_expiry_date]
        : [...equipmentExpiry.previous_expiry_dates];

      return {
        ...prevState,
        [equipmentId]: {
          current_expiry_date: date,
          previous_expiry_dates: updatedPreviousDates,
        },
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      for (const equipment of equipmentData) {
        const currentExpiryDate = calibrationExpiries[equipment.id]?.current_expiry_date;

        if (currentExpiryDate) {
          await updateCalibrationExpiry(equipment.id, client.id, currentExpiryDate);
          toast.success(`Successfully updated calibration expiry date for ${equipment.name}`);
        }
      }
    } catch (error) {
      toast.error('Error updating calibration expiry date: ' + error.message);
    }
  };

  // Funkcija za promenu taba
  const handleTabChange = (type) => {
    setActiveTab(type);
    setEquipmentData([]); // Resetovanje podataka za novi tab
    fetchEquipmentData(type); // Učitaj podatke za novi tip opreme
  };

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-6">Manage Calibration Expiry Dates</h2>

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
        <h3 className="text-xl font-medium mb-4">Set Calibration Expiry for {activeTab}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {equipmentData?.map((equipment) => (
            <div key={equipment.id} className="flex items-center space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">{equipment.name} - {equipment.serial_number}</label>
                <input
                  type="date"
                  onChange={(e) => handleDateChange(equipment.id, e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
          ))}
          <button
            type="submit"
            className="bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-300"
          >
            Save Calibration Expiry Dates
          </button>
        </form>
      </div>

      {/* Calibration Expiry Table */}
      <div>
        <h3 className="text-xl font-medium mb-4">Calibration Expiry Dates</h3>
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left border-b">Name</th>
                <th className="px-4 py-2 text-left border-b">Serial Number</th>
                <th className="px-4 py-2 text-left border-b">Current Calibration Expiry</th>
                <th className="px-4 py-2 text-left border-b">Previous Calibration Expiry Dates</th>
              </tr>
            </thead>
            <tbody>
              {equipmentData?.map((equipment) => (
                <tr key={equipment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border-b">{equipment.name}</td>
                  <td className="px-4 py-2 border-b">{equipment.serial_number}</td>
                  <td className="px-4 py-2 border-b">
                    {calibrationExpiries[equipment.id]?.current_expiry_date || 'Not Set'}
                  </td>
                  <td className="px-4 py-2 border-b">
                    {calibrationExpiries[equipment.id]?.previous_expiry_dates.length > 0 ? (
                      calibrationExpiries[equipment.id].previous_expiry_dates.map((date, index) => (
                        <div key={index}>{date}</div>
                      ))
                    ) : (
                      'No previous expiry dates'
                    )}
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

export default EquipmentManagement;
