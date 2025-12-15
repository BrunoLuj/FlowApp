import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useStore from '../store';
import { saveProject, deleteProject } from '../services/projectsServices';
import { toast } from 'sonner';
import { getClients } from '../services/clientsServices';

const dummyWorkOrders = [
  {
    id: 1,
    title: "Umjeravanje pumpe",
    project: "Pumpa Biljesevo",
    client: "Klijent ABC",
    status: "Open",
    planned_date: "2025-12-20",
  },
];

const WorkOrdersList = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { permissions } = useStore();
  const [clients, setClients] = useState([]);
  const project = location.state?.project || {};

    return (
    <div className="bg-gray-100 min-h-screen p-6 mt-14 sm:ml-16">
        <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-semibold">Work Orders</h1>
            <button
                onClick={() => navigate('/work-orders/create')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
                Create Work Order
            </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
        <input className="border rounded px-2 py-1" placeholder="Search title" />
        <select className="border rounded px-2 py-1">
            <option>All Projects</option>
        </select>
        <select className="border rounded px-2 py-1">
            <option>All Clients</option>
        </select>
        <select className="border rounded px-2 py-1">
            <option>Status</option>
        </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow">
        <table className="w-full text-sm">
            <thead className="bg-gray-200">
            <tr>
                <th className="p-3 text-left">Title</th>
                <th className="p-3 text-left">Project</th>
                <th className="p-3 text-left">Client</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Planned</th>
            </tr>
            </thead>
            <tbody>
            <tr className="border-t hover:bg-gray-50 cursor-pointer">
                <td className="p-3">Umjeravanje pumpe</td>
                <td className="p-3">Pumpa Biljesevo</td>
                <td className="p-3">Klijent ABC</td>
                <td className="p-3">Open</td>
                <td className="p-3">2025-12-20</td>
            </tr>
            </tbody>
        </table>
        </div>
    </div>
    );
};

export default WorkOrdersList;
