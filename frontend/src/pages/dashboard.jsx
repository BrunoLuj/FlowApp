import React, { useEffect, useState } from 'react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import { FaClipboardList, FaCheckCircle, FaExclamationTriangle, FaTasks, FaSearch, FaPlus } from 'react-icons/fa';
import CountUp from 'react-countup';
import { getActiveProjects } from '../services/projectsServices.js';

Chart.register(...registerables);

const Dashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('svi');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await getActiveProjects();
        setTasks(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  // Statistike
  const stats = [
    { id: 1, label: 'Završena umjeravanja', value: 120, icon: <FaCheckCircle className="text-green-500" />, gradient: 'bg-gradient-to-r from-green-200 to-green-400' },
    { id: 2, label: 'Aktivni projekti', value: 8, icon: <FaClipboardList className="text-blue-500" />, gradient: 'bg-gradient-to-r from-blue-200 to-blue-400' },
    { id: 3, label: 'Nezavršeni zadaci', value: 5, icon: <FaExclamationTriangle className="text-red-500" />, gradient: 'bg-gradient-to-r from-red-200 to-red-400' },
    { id: 4, label: 'Ukupni zadaci', value: 15, icon: <FaTasks className="text-yellow-500" />, gradient: 'bg-gradient-to-r from-yellow-200 to-yellow-400' },
  ];

  // Grafovi
  const lineChartData = {
    labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul'],
    datasets: [{
      label: 'Umjeravanja',
      data: [30,45,25,60,80,50,90],
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59,130,246,0.2)',
      fill: true,
      tension: 0.3,
    }]
  };

  const barChartData = {
    labels: ['Project 1','Project 2','Project 3','Project 4'],
    datasets: [{
      label: 'Napredak (%)',
      data: [70,40,90,60],
      backgroundColor: ['#3B82F6','#6366F1','#10B981','#F59E0B'],
      borderRadius: 5,
    }]
  };

  const pieChartData = {
    labels: ['Završeni','U tijeku','Nezavršeno'],
    datasets: [{
      data: [10,3,2],
      backgroundColor: ['#10B981','#3B82F6','#EF4444'],
    }]
  };

  // Filter i search
  const filteredTasks = tasks.filter(task => {
    const matchesStatus = filter === 'svi' || task.status === filter;
    const matchesSearch = task.project_type?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const statusColors = {
    'Završen': 'bg-green-500',
    'U tijeku': 'bg-blue-500',
    'Nezavršeno': 'bg-red-500',
  };

  return (
    <div className="bg-gray-100  p-6 mt-14 sm:ml-16">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      {/* Kartice statistike */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {stats.map(stat => (
          <div key={stat.id} className={`p-6 rounded-2xl shadow-lg flex items-center gap-4 ${stat.gradient} hover:scale-105 transition-transform`}>
            <div className="text-4xl">{stat.icon}</div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                <CountUp end={stat.value} duration={1.5} />
              </h2>
              <p className="text-gray-700">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Grafovi */}
      {/*<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Trend Umjeravanja</h2>
          <Line data={lineChartData} options={{ responsive:false, maintainAspectRatio:false }} height={200}/>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Napredak Projekata</h2>
          <Bar data={barChartData} options={{ responsive:false, maintainAspectRatio:false }} height={200}/>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Status Zadataka</h2>
          <Pie data={pieChartData} options={{ responsive:false, maintainAspectRatio:false, plugins:{legend:{position:'bottom'}} }} height={200}/>
        </div>
      </div>*/}

      {/* Filter i search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Pretraži zadatke..."
            className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 pl-10"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <FaSearch className="absolute left-3 top-3 text-gray-400"/>
        </div>
        <select
          className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        >
          <option value="svi">Svi</option>
          <option value="Završen">Završeni</option>
          <option value="U tijeku">U tijeku</option>
          <option value="Nezavršeno">Nezavršeno</option>
        </select>
      </div>

      {/* Tabela zadataka */}
      <div className="bg-white p-6 rounded-2xl shadow-lg mb-6 overflow-x-auto">
        {loading ? <p>Loading tasks...</p> : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Naziv Zadatka</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Due Date</th>
                <th className="px-4 py-2 text-left">Akcije</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map(task => (
                <tr key={task.id} className="hover:bg-gray-100 transition">
                  <td className="px-4 py-2">{task.project_type}</td>
                  <td className="px-4 py-2 flex items-center gap-2">
                    <span className={`w-4 h-4 rounded-full ${statusColors[task.status]}`}></span>
                    {task.status}
                  </td>
                  <td className="px-4 py-2">{task.end_date}</td>
                  <td className="px-4 py-2 flex gap-2 flex-wrap">
                    <button className="bg-blue-500 text-white px-3 py-1 rounded-xl hover:bg-blue-600 transition">Uredi</button>
                    <button className="bg-red-500 text-white px-3 py-1 rounded-xl hover:bg-red-600 transition">Obriši</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
