import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { fetchEquipment, updateCalibrationExpiry, fetchCalibrationExpiriesHistory } from '../services/equipmentServices';

const EquipmentManagement = () => {
  const [equipmentData, setEquipmentData] = useState([]);
  const [calibrationExpiries, setCalibrationExpiries] = useState({});
  const [inputDates, setInputDates] = useState({});
  const [activeTab, setActiveTab] = useState('Sonda'); // Active tab for managing equipment

  const location = useLocation();
  const client = location.state?.client;

  // Funkcija za formatiranje datuma u obliku yyyy-mm-dd
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
  
    return `${year}-${month}-${day}`;
  };

  // Funkcija za učitavanje opreme prema vrsti
  const fetchEquipmentData = async (type) => {
    try {
      const data = await fetchEquipment(client.id, type);
      setEquipmentData(data.data);
    } catch (error) {
    //   console.error('Failed to fetch data:', error);
      toast.error('Failed to fetch equipment data.');
    }
  };

  // Funkcija za učitavanje podataka o kalibraciji i istoriji
  const fetchCalibrationData = async () => {
    try {
      const newCalibrationExpiries = {};

      // Učitavanje podataka o kalibraciji za svu opremu, uključujući activeTab
      for (const equipment of equipmentData) {
        const { data } = await fetchCalibrationExpiriesHistory(client.id, equipment.id, activeTab);
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
  }, [equipmentData, activeTab]); // Promenjena zavisnost za aktivni tab

  // Funkcija za promenu datuma isteka
  const handleDateChange = (equipmentId, date) => {
    setInputDates((prevState) => ({
      ...prevState,
      [equipmentId]: date,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    try {
      // Prvo kreiramo mapu za spremljene promjene
      const changesToSave = [];
  
      // Iteriramo kroz svu opremu i provodimo samo promjene
      for (const equipment of equipmentData) {
        const inputDate = inputDates[equipment.id]; // Novi datum koji je unet
        const currentExpiry = calibrationExpiries[equipment.id]?.current_expiry_date;
  
        // Provjera da li je datum promijenjen
        if (inputDate && inputDate !== currentExpiry) {
          // Dodajemo opremu u promjene
          changesToSave.push({
            equipmentId: equipment.id,
            currentExpiryDate: inputDate,
            previousExpiryDate: currentExpiry || null,
          });
  
          // Ažuriramo stanje s novim datumima
          setCalibrationExpiries((prevState) => {
            const updatedCalibrationExpiries = { ...prevState };
            const equipmentExpiry = prevState[equipment.id] || { current_expiry_date: '', previous_expiry_dates: [] };
            
            const updatedPreviousDates = currentExpiry
              ? [...equipmentExpiry.previous_expiry_dates, currentExpiry]
              : equipmentExpiry.previous_expiry_dates;
  
            updatedCalibrationExpiries[equipment.id] = {
              current_expiry_date: inputDate,
              previous_expiry_dates: updatedPreviousDates,
            };
  
            return updatedCalibrationExpiries;
          });
        }
      }
  
      // Ako postoje promjene, šaljemo ih na server
      if (changesToSave.length > 0) {
        for (const change of changesToSave) {
          await updateCalibrationExpiry(change.equipmentId, client.id, change.currentExpiryDate, activeTab); // Slanje samo promijenjenih podataka
          toast.success(`Successfully updated calibration expiry date for ${equipmentData.find(equipment => equipment.id === change.equipmentId).name}`);
        }
      } else {
        toast.info('No changes to save.');
      }
  
    } catch (error) {
      toast.error('Error updating calibration expiry date: ' + error.message);
    }
  };
  

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-3xl font-semibold text-gray-800 mb-6">Manage Calibration Expiry Dates</h2>

      {/* Tab Navigation */}
      <div className="flex overflow-x-auto mb-6 border-b-2 border-gray-200">
        {['Sonda', 'Volumetar', 'Rezervoar', 'Mjerna Letva'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)} // Promeni aktivni tab
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
                  value={inputDates[equipment.id] || formatDate(calibrationExpiries[equipment.id]?.current_expiry_date) || ''}
                  onChange={(e) => handleDateChange(equipment.id, e.target.value)} // Čuvamo promenjenu vrednost
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
                {activeTab === 'Volumetar' && <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Device</th>}
                {activeTab === 'Sonda' && <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Controller</th>}
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Serial Number</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Current Calibration Expiry</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Previous Calibration Expiry Dates</th>
              </tr>
            </thead>
            <tbody>
              {equipmentData?.map((equipment) => (
                <tr key={equipment.id} className="hover:bg-blue-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-700">{equipment.name}</td>
                  {activeTab === 'Volumetar' && <td className="px-6 py-4 text-sm font-medium text-gray-700">{equipment.serial_number_device}</td>}
                  {activeTab === 'Sonda' && <td className="px-6 py-4 text-sm font-medium text-gray-700">{equipment.serial_number_controller}</td>}
                  <td className="px-6 py-4 text-sm font-medium text-gray-700">{equipment.serial_number}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-700">
                    {inputDates[equipment.id]
                      ? formatDate(inputDates[equipment.id])
                      : (calibrationExpiries[equipment.id]?.current_expiry_date ? formatDate(calibrationExpiries[equipment.id].current_expiry_date) : 'Not Set')}
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
