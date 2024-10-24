import React, { useEffect, useState } from "react";
import { RiCurrencyLine } from "react-icons/ri";
import { Avatar } from "../assets";
import { MdMenu, MdClose } from "react-icons/md";
import { Link } from "react-router-dom";
import ThemeSwitch from "./switch.jsx";
import { FaTachometerAlt, FaRegHandshake, FaRegUser, FaUser, FaCog, FaSignOutAlt } from 'react-icons/fa';

const links = [
  { label: "Dashboard", link: "/overview", icon: <FaTachometerAlt /> },
  { label: "Transactions", link: "/transaction", icon: <FaRegHandshake /> },
  { label: "Accounts", link: "/account", icon: <FaRegUser /> },
  { label: "Settings", link: "/settings", icon: <FaCog /> },
];

const Navbar = () => {
  const [selected, setSelected] = useState(0);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setUserMenuOpen] = useState(false);
  const [isSidebarHovered, setSidebarHovered] = useState(false);
  // Provjera veličine ekrana
  const isMobile = window.innerWidth < 768;

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleUserMenu = () => {
    setUserMenuOpen(!isUserMenuOpen);
  };

  return (
    <div>
      <ThemeSwitch />
      <nav className="fixed top-0 z-50 w-full bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <div className="px-3 py-3 lg:px-5 lg:pl-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-start rtl:justify-end">
              <button 
                onClick={toggleMobileMenu} 
                className="inline-flex items-center p-2 text-sm text-gray-500 rounded-lg sm:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
              >
                <span className="sr-only">Open sidebar</span>
                {isMobileMenuOpen ? <MdClose className="w-6 h-6" /> : <MdMenu className="w-6 h-6" />}
              </button>
              <div className='flex ms-2 md:me-5 items-center justify-center bg-violet-700 rounded-xxl'>
                <RiCurrencyLine className='text-white text-3xl hover:animate-spin' />
              </div>
              <span className='self-center text-xl font-semibold sm:text-2xl whitespace-nowrap dark:text-white'>
                FlowApp
              </span>
            </div>
            <div className="flex items-center">
              <div className="flex items-center ms-3">
                <div>
                  <button 
                    type="button" 
                    className="flex text-sm bg-gray-800 rounded-full focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600" 
                    onClick={toggleUserMenu}
                  >
                    <span className="sr-only">Open user menu</span>
                    <img src={Avatar} alt='User' className='w-10 h-10 rounded-full object-cover cursor-pointer' />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* User Menu */}
      {isUserMenuOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-50 overflow-hidden border border-gray-200">
          <div className="py-1" role="menu">
            <h3 className="px-4 py-2 text-xs font-semibold text-gray-600">User Options</h3>
            <Link to="/profile" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-100 transition duration-200">
              <FaUser className="mr-2 text-blue-500" /> Profile
            </Link>
            <Link to="/settings" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-100 transition duration-200">
              <FaCog className="mr-2 text-blue-500" /> Settings
            </Link>
            <div className="border-t border-gray-200"></div>
            <Link to="/logout" className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-100 transition duration-200">
              <FaSignOutAlt className="mr-2 text-red-600" /> Log Out
            </Link>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside
      className={`fixed top-0 left-0 z-40 transition-all duration-300 ${isMobile ? (isMobileMenuOpen ? 'w-64' : 'w-0 overflow-hidden') : (isSidebarHovered ? 'w-64' : 'w-16')} h-screen pt-20 bg-white border-r border-gray-200 dark:bg-gray-800 dark:border-gray-700`}
      onMouseEnter={() => !isMobile && setSidebarHovered(true)}
      onMouseLeave={() => !isMobile && setSidebarHovered(false)}
      aria-label="Sidebar"
    >
      <div className='flex flex-col items-start px-4 gap-4'>
        {links.map((link, index) => (
          <Link
            key={index}
            to={link.link}
            className={`${index === selected ? "bg-black dark:bg-slate-800 text-white" : "text-gray-700 dark:text-gray-500"} flex items-center gap-2 px-2 py-2 rounded-full overflow-hidden`}
            onClick={() => {
              setSelected(index);
              setMobileMenuOpen(false); // Close the menu when a link is clicked
            }}
          >
            <div className="flex items-center">
              {link.icon}
              {(isMobileMenuOpen || isSidebarHovered) && <span className="ml-2">{link.label}</span>}
            </div>
          </Link>
        ))}
      </div>
    </aside>
    </div>
  );
};

export default Navbar;
