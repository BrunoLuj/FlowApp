import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaMapMarkerAlt, FaPlus } from "react-icons/fa";

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

  const statusBadge = (status) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-700";
      case "Pending":
        return "bg-yellow-100 text-yellow-700";
      case "Active":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen p-6 mt-14 sm:ml-16">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-gray-800">{dummyProject.name}</h1>
          <button
            onClick={() => navigate(`/projects/${dummyProject.id}/work-orders/create`)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold shadow hover:scale-105 transition"
          >
            <FaPlus /> Add Work Order
          </button>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-white p-6 rounded-2xl shadow">
          <div><strong>Client:</strong> {dummyProject.client_name}</div>
          <div><strong>Address:</strong> {dummyProject.address}</div>
          <div><strong>City:</strong> {dummyProject.city}</div>
          <div><strong>Responsible:</strong> {dummyProject.responsible_person}</div>
          <div>
            <strong>Status:</strong>{" "}
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusBadge(dummyProject.status)}`}>
              {dummyProject.status}
            </span>
          </div>
          <div><strong>Created:</strong> {dummyProject.created_at}</div>
          <a
            href={`https://www.google.com/maps?q=${dummyProject.gps_lat},${dummyProject.gps_lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 font-medium hover:underline"
          >
            <FaMapMarkerAlt /> Geo Location
          </a>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-300">
          {["workOrders", "services", "calibration"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-t-lg font-medium transition ${
                activeTab === tab
                  ? "bg-white shadow-md border-t border-l border-r border-gray-300"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              {tab === "workOrders" ? "Work Orders" : tab === "services" ? "Services" : "Calibration"}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white p-6 rounded-2xl shadow">
          {activeTab === "workOrders" && (
            <table className="min-w-full border border-gray-300 rounded-xl">
              <thead className="bg-gray-100 rounded-t-xl">
                <tr>
                  <th className="p-3 text-left">Title</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {dummyWorkOrders.map((wo) => (
                  <tr key={wo.id} className="border-t hover:bg-gray-50 cursor-pointer transition">
                    <td className="p-3">{wo.title}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-sm font-semibold ${statusBadge(wo.status)}`}>
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
            <table className="min-w-full border border-gray-300 rounded-xl">
              <thead className="bg-gray-100 rounded-t-xl">
                <tr>
                  <th className="p-3 text-left">Type</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {dummyServices.map((s) => (
                  <tr key={s.id} className="border-t hover:bg-gray-50 cursor-pointer transition">
                    <td className="p-3">{s.type}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-sm font-semibold ${statusBadge(s.status)}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="p-3">{s.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "calibration" && (
            <table className="min-w-full border border-gray-300 rounded-xl">
              <thead className="bg-gray-100 rounded-t-xl">
                <tr>
                  <th className="p-3 text-left">Type</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Next Due</th>
                </tr>
              </thead>
              <tbody>
                {dummyCalibration.map((c) => (
                  <tr key={c.id} className="border-t hover:bg-gray-50 cursor-pointer transition">
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
    </div>
  );
};

export default ProjectDetails;
