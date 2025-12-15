import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';

const dummyProject = {
  id: 1,
  name: "Pumpa Biljesevo",
  client_name: "Klijent ABC",
  address: "Biljesevo 123",
  city: "Sarajevo",
  gps_lat: "44.1524271",
  gps_lng: "17.79245701",
  responsible_person: "Marko Marković",
  status: "Active",
  created_at: "2025-12-15",
};

const dummyWorkOrders = [
  { id: 1, title: "Umjeravanje pumpe", status: "Completed", date: "2025-11-20" },
  { id: 2, title: "Servis separatora", status: "Pending", date: "2025-12-01" },
];

const dummyServices = [
  { id: 1, type: "Preventivni", status: "Completed", date: "2025-10-10" },
  { id: 2, type: "Hitni", status: "Pending", date: "2025-12-05" },
];

const dummyCalibration = [
  { id: 1, type: "Volumetri", date: "2025-09-15", next_due: "2026-03-15" },
  { id: 2, type: "AMN", date: "2025-11-10", next_due: "2026-05-10" },
];

const ProjectDetails = () => {
  const [activeTab, setActiveTab] = useState("workOrders");
  const navigate = useNavigate();

  return (
    <div className="bg-gray-100 min-h-screen p-6 mt-14 sm:ml-16">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{dummyProject.name}</h1>
        <button
          onClick={() => navigate(`/projects/${dummyProject.id}/work-orders/create`)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Add Work Order
        </button>
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-white p-4 rounded-lg shadow">
        <div><strong>Client:</strong> {dummyProject.client_name}</div>
        <div><strong>Address:</strong> {dummyProject.address}</div>
        <div><strong>City:</strong> {dummyProject.city}</div>
        <div><strong>Responsible:</strong> {dummyProject.responsible_person}</div>
        <div><strong>Status:</strong> {dummyProject.status}</div>
        <div><strong>Created:</strong> {dummyProject.created_at}</div>
        <a
          href={`https://www.google.com/maps/@${dummyProject.gps_lat},${dummyProject.gps_lng},17z`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center 
                    text-sm font-medium text-blue-700  
                   "
          >
          📍 Geo Location
        </a>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex space-x-4 border-b border-gray-300">
        <button
          onClick={() => setActiveTab("workOrders")}
          className={`px-4 py-2 ${activeTab === "workOrders" ? "border-b-2 border-blue-600 font-semibold" : "text-gray-600"}`}
        >
          Work Orders
        </button>
        <button
          onClick={() => setActiveTab("services")}
          className={`px-4 py-2 ${activeTab === "services" ? "border-b-2 border-blue-600 font-semibold" : "text-gray-600"}`}
        >
          Services
        </button>
        <button
          onClick={() => setActiveTab("calibration")}
          className={`px-4 py-2 ${activeTab === "calibration" ? "border-b-2 border-blue-600 font-semibold" : "text-gray-600"}`}
        >
          Calibration
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white p-4 rounded-lg shadow">
        {activeTab === "workOrders" && (
          <table className="min-w-full border border-gray-300 rounded-lg">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-3 text-left">Title</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {dummyWorkOrders.map(wo => (
                <tr key={wo.id} className="border-t hover:bg-gray-50 cursor-pointer">
                  <td className="p-3">{wo.title}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-sm 
                      ${wo.status === "Completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {wo.status}
                    </span>
                  </td>
                  <td className="p-3">{wo.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === "services" && (
          <table className="min-w-full border border-gray-300 rounded-lg">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {dummyServices.map(s => (
                <tr key={s.id} className="border-t hover:bg-gray-50 cursor-pointer">
                  <td className="p-3">{s.type}</td>
                  <td className="p-3">{s.status}</td>
                  <td className="p-3">{s.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === "calibration" && (
          <table className="min-w-full border border-gray-300 rounded-lg">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Next Due</th>
              </tr>
            </thead>
            <tbody>
              {dummyCalibration.map(c => (
                <tr key={c.id} className="border-t hover:bg-gray-50 cursor-pointer">
                  <td className="p-3">{c.type}</td>
                  <td className="p-3">{c.date}</td>
                  <td className="p-3">{c.next_due}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ProjectDetails;
