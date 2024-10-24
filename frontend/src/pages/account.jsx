import React, { useState } from 'react';
import { FaEdit, FaTrash, FaUserPlus } from 'react-icons/fa';

const ITEMS_PER_PAGE = 5;

const Account = () => {
  const [users, setUsers] = useState(initialUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const filteredUsers = users.filter(user => {
    const isActiveMatch =
      filterActive === 'all' || (filterActive === 'active' ? user.isActive : !user.isActive);
    const isSearchMatch =
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase());

    return isActiveMatch && isSearchMatch;
  });

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleDeleteUser = id => {
    setUsers(users => users.filter(user => user.id !== id));
  };

  const handleOpenModal = user => {
    setCurrentUser(user);
    setFirstName(user ? user.firstName : '');
    setLastName(user ? user.lastName : '');
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setCurrentUser(null);
    setModalOpen(false);
  };

  const handleSaveUser = () => {
    if (currentUser) {
      setUsers(users =>
        users.map(user => (user.id === currentUser.id ? { ...user, firstName, lastName } : user))
      );
    } else {
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
      setUsers(users => [...users, newUser]);
    }
    handleCloseModal();
  };

  const renderStatus = isActive => (
    <span className={`px-2 py-1 text-white font-bold ${isActive ? 'bg-green-500' : 'bg-red-500'}`}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );

  return (
    <div className="p-6 mt-14 sm:ml-16 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-semibold mb-6">User Management</h1>

      <button
        onClick={() => handleOpenModal(null)}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4 flex items-center hover:bg-blue-600"
      >
        <FaUserPlus className="mr-2" /> Add User
      </button>

      <div className="mb-4 flex flex-col sm:flex-row">
        <input
          type="text"
          placeholder="Search by name..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="border p-2 rounded mb-2 sm:mb-0 sm:mr-2 flex-1"
        />
        <select
          value={filterActive}
          onChange={e => setFilterActive(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="all">All Users</option>
          <option value="active">Active Users</option>
          <option value="inactive">Inactive Users</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200">
          <thead className="bg-gray-200">
            <tr>
              <th className="border px-4 py-2">First Name</th>
              <th className="border px-4 py-2">Last Name</th>
              <th className="border px-4 py-2">Role</th>
              <th className="border px-4 py-2">Status</th>
              <th className="border px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.map(user => (
              <tr key={user.id}>
                <td className="border px-4 py-2">{user.firstName}</td>
                <td className="border px-4 py-2">{user.lastName}</td>
                <td className="border px-4 py-2">{user.role}</td>
                <td className="border px-4 py-2">{renderStatus(user.isActive)}</td>
                <td className="border px-4 py-2">
                  <button
                    onClick={() => handleOpenModal(user)}
                    className="bg-yellow-500 text-white px-2 py-1 rounded mr-2 hover:bg-yellow-600"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between mt-4">
        <button
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
        >
          Previous
        </button>
        <span>Page {currentPage} of {totalPages}</span>
        <button
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
        >
          Next
        </button>
      </div>

      {/* Custom Modal for adding/updating user */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center">
          <div className="bg-white rounded p-6 max-w-sm mx-auto">
            <h2 className="text-lg font-bold mb-4">
              {currentUser ? 'Update User' : 'Add User'}
            </h2>
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className="border p-2 rounded w-full mb-2"
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              className="border p-2 rounded w-full mb-4"
            />
            <div className="flex justify-end">
              <button
                onClick={handleSaveUser}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Save
              </button>
              <button
                onClick={handleCloseModal}
                className="bg-gray-300 text-black px-4 py-2 rounded ml-2 hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const initialUsers = [
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
];
export default Account;
