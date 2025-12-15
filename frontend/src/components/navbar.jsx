import React, { useEffect, useRef, useState } from "react";
import { RiBlazeLine } from "react-icons/ri";
import { Avatar } from "../assets";
import { MdMenu, MdClose } from "react-icons/md";
import { Link, useLocation } from "react-router-dom";
import { FaTachometerAlt, FaClipboardList, FaUser, FaCog, FaSignOutAlt, FaUsers, FaTasks, FaUserFriends } from 'react-icons/fa';
import useStore from "../store/index.js";
import { useTranslation } from 'react-i18next';

const Navbar = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const [selected, setSelected] = useState(0);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setUserMenuOpen] = useState(false);
  const [isSidebarHovered, setSidebarHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const userMenuRef = useRef(null);
  const { user, permissions } = useStore();
  const signOut = useStore((state) => state.signOut);

  const links = [
    { label: t("dashboard"), link: "/overview", icon: <FaTachometerAlt className="text-blue-500" />, permission: 'view_dashboard' },
    { label: t("clients"), link: "/clients", icon: <FaUsers className="text-teal-500" />, permission: 'view_clients' },
    { label: t("projects"), link: "/projects", icon: <FaClipboardList className="text-purple-500" />, permission: 'view_projects' },
    { label: t("work_order"), link: "/work-order", icon: <FaTasks className="text-orange-500" />, permission: 'view_projects' },
    { label: t("users"), link: "/users", icon: <FaUserFriends className="text-amber-500" />, permission: 'view_users' },
    { label: t("settings"), link: "/settings", icon: <FaCog className="text-gray-500" />, permission: 'view_settings' },
  ];

  // Track active link
  useEffect(() => {
    const currentPath = location.pathname;
    const activeIndex = links.findIndex(link => link.link === currentPath);
    if (activeIndex !== -1) setSelected(activeIndex);
  }, [location.pathname]);

  // Track window resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div>
      {/* Top Navbar */}
      <nav className="fixed top-0 z-50 w-full bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700 shadow-md">
        <div className="px-3 py-3 lg:px-5 lg:pl-3 flex justify-between items-center">
          <div className="flex items-center">
            {/* Mobile menu button */}
            <button 
              onClick={() => setMobileMenuOpen(!isMobileMenuOpen)} 
              className="sm:hidden p-2 text-gray-500 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition"
            >
              {isMobileMenuOpen ? <MdClose className="w-6 h-6" /> : <MdMenu className="w-6 h-6" />}
            </button>

            {/* Logo */}
            <div className="flex items-center ml-2 bg-blue-700 rounded-xl p-1">
              <RiBlazeLine className="text-white text-3xl hover:animate-spin" />
            </div>
            <span className="ml-2 text-xl font-semibold sm:text-2xl dark:text-white">FlowApp</span>
          </div>

          {/* User menu */}
          <div className="flex items-center">
            <span className="hidden sm:block mr-3 text-sm text-gray-800 dark:text-white">{user.firstname} {user.lastname}</span>
            <div className="relative">
              <button 
                onClick={() => setUserMenuOpen(!isUserMenuOpen)} 
                className="flex text-sm bg-gray-800 rounded-full focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600 transition"
              >
                <img src={Avatar} alt="User" className="w-10 h-10 rounded-full object-cover cursor-pointer" />
              </button>
              {isUserMenuOpen && (
                <div 
                  ref={userMenuRef} 
                  className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-50 overflow-hidden border border-gray-200 transition transform scale-95 animate-scale-in"
                >
                  <h3 className="px-4 py-2 text-xs font-semibold text-gray-600">{t('user options')}</h3>
                  <Link to="/profile" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-100 transition">
                    <FaUser className="mr-2 text-blue-500" /> {t('profile')}
                  </Link>
                  <Link to="/settings" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-100 transition">
                    <FaCog className="mr-2 text-blue-500" /> {t('settings')}
                  </Link>
                  <div className="border-t border-gray-200"></div>
                  <button onClick={signOut} className="flex items-center px-4 py-2 w-full text-sm text-red-600 hover:bg-red-100 transition">
                    <FaSignOutAlt className="mr-2 text-red-600" /> {t('logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar overlay for mobile */}
      {isMobileMenuOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-30" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen pt-20 bg-white border-r border-gray-200 dark:bg-gray-800 dark:border-gray-700 transition-all duration-300
          ${isMobile ? (isMobileMenuOpen ? 'w-64' : 'w-0 overflow-hidden') : (isSidebarHovered ? 'w-64' : 'w-16')}
        `}
        onMouseEnter={() => !isMobile && setSidebarHovered(true)}
        onMouseLeave={() => !isMobile && setSidebarHovered(false)}
      >
        <div className="flex flex-col items-start px-4 gap-4 relative">
          {links.map((link, index) => (
            permissions.includes(link.permission) && (
              <Link
                key={index}
                to={link.link}
                className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300 group
                  ${index === selected 
                    ? "bg-gradient-to-r from-blue-600 to-blue-400 text-white shadow-lg" 
                    : "text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"}
                `}
                onClick={() => {
                  setSelected(index);
                  isMobile && setMobileMenuOpen(false);
                }}
              >
                <span className="text-lg">{link.icon}</span>
                {(isSidebarHovered || isMobileMenuOpen || isMobile) && 
                  <span className="ml-2 font-medium">{link.label}</span>
                }
                {/* Tooltip when collapsed */}
                {!isSidebarHovered && !isMobileMenuOpen && !isMobile && (
                  <span className="absolute left-full ml-2 px-2 py-1 rounded bg-gray-800 text-white text-xs opacity-0 group-hover:opacity-100 transition">
                    {link.label}
                  </span>
                )}
              </Link>
            )
          ))}
        </div>
      </aside>

      {/* Optional animation class for user menu */}
      <style>
        {`
          @keyframes scale-in {
            0% { transform: scale(0.95); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
          .animate-scale-in {
            animation: scale-in 0.15s ease-out forwards;
          }
        `}
      </style>
    </div>
  );
};

export default Navbar;
