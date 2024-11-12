import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { fetchEquipment, updateCalibrationExpiry, fetchCalibrationExpiriesHistory } from '../services/equipmentServices';

const EquipmentManagement = () => {
  const [equipmentData, setEquipmentData] = useState([]);
  const [calibrationExpiries, setCalibrationExpiries] = useState({});
  const [activeTab, setActiveTab] = useState('Sonda');

  const location = useLocation();
  const client = location.state?.client;

  // Funkcija za formatiranje datuma u obliku dd.mm.yyyy
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0'); // Dodaje nulu ispred dana ako je < 10
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Dodaje nulu ispred meseca ako je < 10
    const year = date.getFullYear();

    return `${day}.${month}.${year}`;
  };

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

  // Funkcija za učitavanje podataka o kalibraciji i istoriji
  const fetchCalibrationData = async () => {
    try {
      const newCalibrationExpiries = {};

      // Učitavanje podataka o kalibraciji za svu opremu
      for (const equipment of equipmentData) {
        const { data } = await fetchCalibrationExpiriesHistory(client.id, equipment.id);
        newCalibrationExpiries[equipment.id] = data;
      }

      setCalibrationExpiries(newCalibrationExpiries);
    } catch (error) {
      console.error('Error fetching calibration expiries:', error);
      toast.error('Failed to fetch calibration expiry data.');
    }
  };

  useEffect(() => {
    fetchEquipmentData(activeTab); // Učitavanje podataka za trenutni tab
  }, [activeTab]);

  useEffect(() => {
    if (equipmentData.length > 0) {
      fetchCalibrationData(); // Učitavanje podataka o kalibracijama
    }
  }, [equipmentData]);

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

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-3xl font-semibold text-gray-800 mb-6">Manage Calibration Expiry Dates</h2>

      {/* Tab Navigation */}
      <div className="flex overflow-x-auto mb-6 border-b-2 border-gray-200">
        {['Sonda', 'Volumetar', 'Rezervoar', 'Mjerna Letva'].map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-6 py-3 text-lg font-medium transition-all duration-300 whitespace-nowrap
              ${activeTab === tab ? 'text-blue-700 border-b-4 border-blue-700' : 'text-gray-600 hover:text-blue-600'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Equipment Form for Current Tab */}
      <div className="mb-6 bg-gray-50 p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-medium text-gray-800 mb-4">Set Calibration Expiry for {activeTab}</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          {equipmentData?.map((equipment) => (
            <div key={equipment.id} className="flex items-center space-x-4 bg-white p-4 rounded-lg shadow-sm">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">{equipment.name} - {equipment.serial_number}</label>
                <input
                  type="date"
                  onChange={(e) => handleDateChange(equipment.id, e.target.value)}
                  className="mt-2 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
      <div className="bg-white p-6 mt-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-medium text-gray-800 mb-4">Calibration Expiry Dates</h3>
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Name</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Serial Number</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Current Calibration Expiry</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Previous Calibration Expiry Dates</th>
              </tr>
            </thead>
            <tbody>
              {equipmentData?.map((equipment) => (
                <tr key={equipment.id} className="hover:bg-blue-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-700">{equipment.name}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-700">{equipment.serial_number}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-700">
                    {formatDate(calibrationExpiries[equipment.id]?.current_expiry_date) || 'Not Set'}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-700">
                    {calibrationExpiries[equipment.id]?.previous_expiry_dates.length > 0 ? (
                      calibrationExpiries[equipment.id].previous_expiry_dates.map((date, index) => (
                        <div key={index} className="text-sm text-gray-600">{formatDate(date)}</div>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400">No previous expiry dates</span>
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
