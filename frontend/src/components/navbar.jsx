import React, { useEffect, useRef, useState, useMemo } from "react";
import { RiBlazeLine } from "react-icons/ri";
import { Avatar } from "../assets";
import { MdMenu, MdClose } from "react-icons/md";
import { Link, useLocation } from "react-router-dom";
import { menu } from "./ui/menu";
import useStore from "../store";
import { useTranslation } from "react-i18next";

const Navbar = () => {
  const location = useLocation();
  const { t } = useTranslation();

  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setUserMenuOpen] = useState(false);
  const [isSidebarExpanded, setSidebarExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const userMenuRef = useRef(null);
  const { user, permissions } = useStore();
  const signOut = useStore((state) => state.signOut);

  // FAST PERMISSION CHECK
  const permissionSet = useMemo(() => new Set(permissions || []), [permissions]);

  // FILTER MENU ONCE
  const filteredMenu = useMemo(() => {
    return menu
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => permissionSet.has(item.permission)),
      }))
      .filter((group) => group.items.length > 0); // skip empty groups
  }, [permissionSet]);

  // RESPONSIVE FIX
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // CLOSE USER MENU OUTSIDE
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ACTIVE ROUTE CHECK
  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <div>
      {/* TOP NAVBAR */}
      <nav className="fixed top-0 z-50 w-full bg-white border-b shadow-md flex justify-between items-center px-4 py-3">
        <div className="flex items-center">
          {/* MOBILE BUTTON */}
          <button
            onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
            className="sm:hidden p-2"
          >
            {isMobileMenuOpen ? <MdClose size={24} /> : <MdMenu size={24} />}
          </button>

          {/* LOGO */}
          <div className="flex items-center ml-2 bg-blue-700 rounded-xl p-1">
            <RiBlazeLine className="text-white text-3xl" />
          </div>
          <span className="ml-2 text-xl font-semibold">FlowApp</span>
        </div>

        {/* USER */}
        <div className="flex items-center">
          <span className="hidden sm:block mr-3">
            {user.firstname} {user.lastname}
          </span>

          <div className="relative" ref={userMenuRef}>
            <button onClick={() => setUserMenuOpen(!isUserMenuOpen)}>
              <img src={Avatar} className="w-10 h-10 rounded-full" />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white shadow rounded">
                <Link to="/profile" className="block px-4 py-2 hover:bg-gray-100">
                  {t("profile")}
                </Link>
                <Link to="/settings" className="block px-4 py-2 hover:bg-gray-100">
                  {t("settings")}
                </Link>
                <button
                  onClick={signOut}
                  className="w-full text-left px-4 py-2 text-red-500 hover:bg-red-100"
                >
                  {t("logout")}
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* OVERLAY */}
      {isMobileMenuOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen pt-20 bg-white border-r transition-all duration-300
          ${isMobile
            ? isMobileMenuOpen
              ? "w-64"
              : "w-0 overflow-hidden"
            : isSidebarExpanded
            ? "w-64"
            : "w-16"
          }`}
        onMouseEnter={() => !isMobile && setSidebarExpanded(true)}
        onMouseLeave={() => !isMobile && setSidebarExpanded(false)}
      >
        <div className="flex flex-col px-4 gap-3 relative">
          {filteredMenu.map((group, i) => (
            <div key={i} className="w-full">
              {/* GROUP TITLE */}
              {(isSidebarExpanded || isMobileMenuOpen || isMobile) && (
                <p className="text-xs text-gray-400 uppercase px-3 mt-3">
                  {group.title}
                </p>
              )}

              {/* ITEMS */}
              {group.items.map((item, index) => (
                <Link
                  key={index}
                  to={item.link}
                  onClick={() => isMobile && setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition group
                    ${isActive(item.link) ? "bg-blue-600 text-white" : "hover:bg-gray-100"}`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {(isSidebarExpanded || isMobileMenuOpen || isMobile) && <span>{t(item.label)}</span>}

                  {/* TOOLTIP */}
                  {!isSidebarExpanded && !isMobile && (
                    <span className="absolute left-full ml-2 px-2 py-1 text-xs bg-black text-white rounded opacity-0 group-hover:opacity-100">
                      {t(item.label)}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
};

export default Navbar;