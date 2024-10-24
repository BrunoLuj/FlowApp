import React, { useState } from 'react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import { FaClipboardList, FaCheckCircle, FaExclamationTriangle, FaTasks, FaPlus } from 'react-icons/fa';

Chart.register(...registerables);

const Dashboard = () => {
  const [filter, setFilter] = useState('svi'); // Default filter
  const [searchTerm, setSearchTerm] = useState('');
  const [tasks, setTasks] = useState([
    { id: 1, name: 'Zadatak 1', status: 'U tijeku', dueDate: '2024-10-30' },
    { id: 2, name: 'Zadatak 2', status: 'Završen', dueDate: '2024-10-20' },
    { id: 3, name: 'Zadatak 3', status: 'Nezavršeno', dueDate: '2024-11-05' },
    { id: 4, name: 'Zadatak 4', status: 'U tijeku', dueDate: '2024-10-25' },
  ]);

  const stats = {
    completedMeasurements: 120,
    activeProjects: 8,
    pendingTasks: 5,
    totalTasks: 15,
  };

  const lineChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [
      {
        label: 'Umjeravanja',
        data: [30, 45, 25, 60, 80, 50, 90],
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderWidth: 2,
        fill: true,
      },
    ],
  };

  const barChartData = {
    labels: ['Project 1', 'Project 2', 'Project 3', 'Project 4'],
    datasets: [
      {
        label: 'Progress (%)',
        data: [70, 40, 90, 60],
        backgroundColor: 'rgba(153, 102, 255, 0.6)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1,
      },
    ],
  };

  const pieChartData = {
    labels: ['Završeni', 'U tijeku', 'Nezavršeni'],
    datasets: [
      {
        data: [10, 3, 2],
        backgroundColor: ['#36A2EB', '#FFCE56', '#FF6384'],
        hoverBackgroundColor: ['#36A2EB', '#FFCE56', '#FF6384'],
      },
    ],
  };

  // Filter and search tasks
  const filteredTasks = tasks.filter(task => {
    const matchesStatus = filter === 'svi' || task.status === filter;
    const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Status colors for circles
  const statusColors = {
    'Završen': 'bg-green-500',
    'U tijeku': 'bg-blue-500',
    'Nezavršeno': 'bg-red-500',
  };

  const handleSort = (key) => {
    const sortedTasks = [...filteredTasks].sort((a, b) => a[key].localeCompare(b[key]));
    setTasks(sortedTasks);
  };

  return (
    <div className="bg-gray-100 min-h-screen p-6 mt-14 sm:ml-16">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {/* Statistike */}
        {Object.entries(stats).map(([key, value]) => {
          let icon, color, label;
          switch (key) {
            case 'completedMeasurements':
              icon = <FaCheckCircle className="text-green-500" />;
              color = 'bg-green-50';
              label = 'Završena umjeravanja';
              break;
            case 'activeProjects':
              icon = <FaClipboardList className="text-blue-500" />;
              color = 'bg-blue-50';
              label = 'Aktivni projekti';
              break;
            case 'pendingTasks':
              icon = <FaExclamationTriangle className="text-red-500" />;
              color = 'bg-red-50';
              label = 'Nezavršeni zadaci';
              break;
            case 'totalTasks':
              icon = <FaTasks className="text-orange-500" />;
              color = 'bg-orange-50';
              label = 'Ukupni zadaci';
              break;
            default:
              break;
          }
          return (
            <div key={key} className={`p-4 rounded-lg shadow-md ${color}`}>
              <div className="flex items-center">
                {icon}
                <div className="ml-4">
                  <h2 className="text-2xl font-semibold">{value}</h2>
                  <p className="text-gray-600">{label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grafikon Umjeravanja, Bar i Pie */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Trend Umjeravanja</h2>
          <div style={{ width: '100%', height: '200px' }}>
            <Line data={lineChartData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Napredak Projekata</h2>
          <div style={{ width: '100%', height: '200px' }}>
            <Bar data={barChartData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Status Zadataka</h2>
          <div style={{ width: '100%', height: '200px' }}>
            <Pie data={pieChartData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>
      </div>

      {/* Lista zadataka kao tabela */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="mb-4">
          <span className="mr-4 font-semibold">Filter po statusu:</span>
          <button onClick={() => setFilter('svi')} className="text-blue-500 mr-2">Svi</button>
          <button onClick={() => setFilter('Završen')} className="text-green-500 mr-2">Završen</button>
          <button onClick={() => setFilter('U tijeku')} className="text-blue-500 mr-2">U tijeku</button>
          <button onClick={() => setFilter('Nezavršeno')} className="text-red-500">Nezavršeno</button>
        </div>
        <div className="mb-4">
          <input 
            type="text" 
            placeholder="Pretraži zadatke..." 
            className="p-2 border rounded" 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
        <h2 className="text-xl font-semibold mb-4">Aktivni Zadaci</h2>
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2 cursor-pointer" onClick={() => handleSort('name')}>Naziv Zadatka</th>
              <th className="p-2 cursor-pointer" onClick={() => handleSort('status')}>Status</th>
              <th className="p-2">Due Date</th>
              <th className="p-2">Akcije</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map(task => (
              <tr key={task.id} className="border-b">
                <td className="p-4">{task.name}</td>
                <td className="p-4 flex items-center">
                  <span className={`w-4 h-4 rounded-full ${statusColors[task.status]} mr-2`}></span>
                  {task.status}
                </td>
                <td className="p-4">{task.dueDate}</td>
                <td className="p-4">
                  <button className="text-blue-500 mr-2">Uredi</button>
                  <button className="text-red-500">Obriši</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
