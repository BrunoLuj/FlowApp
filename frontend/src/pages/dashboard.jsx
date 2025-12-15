import React, { useEffect, useState } from 'react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import { FaClipboardList, FaCheckCircle, FaExclamationTriangle, FaTasks, FaSearch } from 'react-icons/fa';
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

  // Gradient kartice
  const stats = [
    { id: 1, label: 'Završena umjeravanja', value: 120, icon: <FaCheckCircle className="text-white" />, gradient: 'bg-gradient-to-r from-green-400 to-green-600' },
    { id: 2, label: 'Aktivni projekti', value: 8, icon: <FaClipboardList className="text-white" />, gradient: 'bg-gradient-to-r from-blue-400 to-blue-600' },
    { id: 3, label: 'Nezavršeni zadaci', value: 5, icon: <FaExclamationTriangle className="text-white" />, gradient: 'bg-gradient-to-r from-red-400 to-red-600' },
    { id: 4, label: 'Ukupni zadaci', value: 15, icon: <FaTasks className="text-white" />, gradient: 'bg-gradient-to-r from-yellow-400 to-yellow-600' },
  ];

  const lineChartData = {
    labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul'],
    datasets: [{
      label: 'Umjeravanja',
      data: [30,45,25,60,80,50,90],
      borderColor: '#6366F1',
      backgroundColor: 'rgba(99,102,241,0.2)',
      fill: true,
      tension: 0.3,
    }]
  };

  const barChartData = {
    labels: ['Project 1','Project 2','Project 3','Project 4'],
    datasets: [{
      label: 'Napredak (%)',
      data: [70,40,90,60],
      backgroundColor: ['#6366F1','#3B82F6','#10B981','#F59E0B'],
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
    <div className="bg-gray-100 min-h-screen p-6 sm:ml-16">
      <h1 className="text-4xl font-extrabold mb-6 text-gray-800">Dashboard</h1>

      {/* Gradient kartice */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {stats.map(stat => (
          <div key={stat.id} className={`p-6 rounded-3xl shadow-lg flex items-center gap-4 transform transition hover:scale-105 ${stat.gradient}`}>
            <div className="text-4xl">{stat.icon}</div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                <CountUp end={stat.value} duration={1.5} />
              </h2>
              <p className="text-white/80">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Grafovi */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-3xl shadow-xl backdrop-blur-sm">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Trend Umjeravanja</h2>
          <Line data={lineChartData} options={{ responsive:true, maintainAspectRatio:true, plugins:{legend:{position:'bottom'}}}} height={200}/>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-xl backdrop-blur-sm">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Napredak Projekata</h2>
          <Bar data={barChartData} options={{ responsive:true, maintainAspectRatio:true, plugins:{legend:{position:'bottom'}}}} height={200}/>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-xl backdrop-blur-sm">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Status Zadataka</h2>
          <Pie data={pieChartData} options={{ responsive:true, maintainAspectRatio:true, plugins:{legend:{position:'bottom'}}}} height={200}/>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Pretraži zadatke..."
            className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 pl-10"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <FaSearch className="absolute left-3 top-3 text-gray-400"/>
        </div>
        <select
          className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
      <div className="bg-white p-6 rounded-3xl shadow-xl backdrop-blur-sm overflow-x-auto">
        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading tasks...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-gray-600">Naziv Zadatka</th>
                <th className="px-4 py-2 text-left text-gray-600">Status</th>
                <th className="px-4 py-2 text-left text-gray-600">Due Date</th>
                <th className="px-4 py-2 text-left text-gray-600">Akcije</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTasks.map(task => (
                <tr key={task.id} className="hover:bg-gray-50 transition duration-200">
                  <td className="px-4 py-2">{task.project_type}</td>
                  <td className="px-4 py-2 flex items-center gap-2">
                    <span className={`w-4 h-4 rounded-full ${statusColors[task.status]}`}></span>
                    {task.status}
                  </td>
                  <td className="px-4 py-2">{task.end_date}</td>
                  <td className="px-4 py-2 flex gap-2 flex-wrap">
                    <button className="bg-indigo-500 text-white px-3 py-1 rounded-xl hover:bg-indigo-600 transition">Uredi</button>
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
