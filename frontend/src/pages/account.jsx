import React, { useState } from 'react';

const Account = () => {
  const [users, setUsers] = useState([
    {
      id: 1,
      firstName: 'Marko',
      lastName: 'Marković',
      role: 'Admin',
      startDate: '2023-01-15',
      endDate: '2024-01-15',
      assignment: 'Project X',
      isActive: true,
    },
    {
      id: 2,
      firstName: 'Ana',
      lastName: 'Anić',
      role: 'User',
      startDate: '2023-02-10',
      endDate: '2023-12-10',
      assignment: 'Project Y',
      isActive: false,
    },
    {
      id: 3,
      firstName: 'Petar',
      lastName: 'Petrović',
      role: 'Manager',
      startDate: '2022-05-20',
      endDate: '2023-05-20',
      assignment: 'Project Z',
      isActive: true,
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState('all');

  const filteredUsers = users.filter(user => {
    const isActiveMatch = filterActive === 'all' || (filterActive === 'active' ? user.isActive : !user.isActive);
    const isSearchMatch = user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.lastName.toLowerCase().includes(searchTerm.toLowerCase());

    return isActiveMatch && isSearchMatch;
  });

  const handleDeleteUser = (id) => {
    setUsers(users.filter(user => user.id !== id));
  };

  const handleUpdateUser = (id) => {
    const updatedName = prompt('Update user name (first and last):');
    if (updatedName) {
      const [firstName, lastName] = updatedName.split(' ');
      setUsers(users.map(user => (user.id === id ? { ...user, firstName, lastName } : user)));
    }
  };

  const handleAddUser = () => {
    const newUserData = prompt('Enter new user (first last):');
    if (newUserData) {
      const [firstName, lastName] = newUserData.split(' ');
      const newUser = {
        id: users.length + 1,
        firstName,
        lastName,
        role: 'User',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        assignment: '',
        isActive: true,
      };
      setUsers([...users, newUser]);
    }
  };

  const renderStatus = (isActive) => {
    return (
      <span className={`px-2 py-1 text-white font-bold ${isActive ? 'bg-green-500' : 'bg-red-500'}`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  return (
    <div className="p-4 sm:ml-16 mt-14">
      <h1 className="text-xl font-semibold mb-4">User Management</h1>
      
      <button 
        onClick={handleAddUser} 
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4 hover:bg-blue-600"
      >
        Add User
      </button>

      <div className="mb-4 flex flex-col sm:flex-row">
        <input
          type="text"
          placeholder="Search by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border p-2 rounded mb-2 sm:mb-0 sm:mr-2 flex-1"
        />
        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="all">All Users</option>
          <option value="active">Active Users</option>
          <option value="inactive">Inactive Users</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-200">
              <th className="border px-4 py-2">First Name</th>
              <th className="border px-4 py-2">Last Name</th>
              <th className="border px-4 py-2">Role</th>
              <th className="border px-4 py-2">Start Date</th>
              <th className="border px-4 py-2">End Date</th>
              <th className="border px-4 py-2">Assignment</th>
              <th className="border px-4 py-2">Active</th>
              <th className="border px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td className="border px-4 py-2">{user.firstName}</td>
                <td className="border px-4 py-2">{user.lastName}</td>
                <td className="border px-4 py-2">{user.role}</td>
                <td className="border px-4 py-2">{user.startDate}</td>
                <td className="border px-4 py-2">{user.endDate}</td>
                <td className="border px-4 py-2">{user.assignment}</td>
                <td className="border px-4 py-2">{renderStatus(user.isActive)}</td>
                <td className="border px-4 py-2">
                  <button 
                    onClick={() => handleUpdateUser(user.id)} 
                    className="bg-yellow-500 text-white px-4 py-2 rounded mr-2 hover:bg-yellow-600"
                  >
                    Update
                  </button>
                  <button 
                    onClick={() => handleDeleteUser(user.id)} 
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Account;
