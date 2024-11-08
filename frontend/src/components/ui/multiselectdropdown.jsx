import React, { useEffect, useState, useRef } from 'react';
import { FaChevronDown } from 'react-icons/fa';

const UserMultiSelectDropdown = ({ users, selectedUsers, onSelectionChange }) => {
    const [options, setOptions] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [filter, setFilter] = useState('');
    const dropdownRef = useRef(null);

    useEffect(() => {
        setOptions(users);
        console.log(users);
    }, [users]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleCheckboxChange = (user) => {
        const isSelected = selectedUsers.some(u => u.id === user.id);
        const updatedSelectedUsers = isSelected
            ? selectedUsers.filter(u => u.id !== user.id)
            : [...selectedUsers, user];

        onSelectionChange(updatedSelectedUsers);
    };

    const filteredOptions = options.filter(user => 
        `${user.fullname}`.toLowerCase().includes(filter.toLowerCase()) // Prilagodba za fullName
    );

    console.log(filteredOptions)

    return (
        <div className="relative" ref={dropdownRef}>
            <div 
                className="border rounded-md p-2 cursor-pointer flex justify-between items-center bg-white"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="flex-grow">
                    {selectedUsers.length > 1 
                        ? '' 
                        : selectedUsers.length === 1 
                            ? selectedUsers[0].fullname  // Prikazivanje fullName
                            : 'Odaberi korisnike...'}
                </span>
                <span className="ml-2">
                    {selectedUsers.length > 0 && `+ ${selectedUsers.length}`}
                </span>
                <span className={`ml-2 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    <FaChevronDown />
                </span>
                
            </div>

            {isOpen && (
                <div className="absolute z-10 border border-gray-300 bg-white rounded-md mt-1 w-full max-h-48 overflow-y-auto">
                    <input 
                        type="text" 
                        placeholder="Pretraži..." 
                        value={filter} 
                        onChange={(e) => setFilter(e.target.value)} 
                        className="w-full border-b p-2"
                    />
                    <div className="max-h-40 overflow-y-auto">
                        {filteredOptions.map(user => (
                            <div key={user.id} className="flex items-center p-2 hover:bg-gray-100">
                                <input
                                    type="checkbox"
                                    checked={selectedUsers.some(u => u.id === user.id)}
                                    onChange={() => handleCheckboxChange(user)}
                                    className="mr-2"
                                />
                                <span>{user.fullname}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserMultiSelectDropdown;
