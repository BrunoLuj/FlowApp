import React, { useEffect, useRef, useState, useMemo } from "react";
import { RiBlazeLine } from "react-icons/ri";
import { FaBell, FaClipboardList, FaUser } from "react-icons/fa";
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
  const [isSidebarExpanded] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const userMenuRef = useRef(null);
  const { user, permissions } = useStore();
  const signOut = useStore((state) => state.signOut);
  const portalOnly = Boolean(user?.loyalty_portal_only);
  const technicianMobile = location.pathname.startsWith("/mobile-work-orders");

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
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
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
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  if (portalOnly) return (
    <nav className="fixed top-0 z-50 flex w-full items-center justify-between border-b border-white/10 bg-slate-950/90 px-5 py-3 text-white shadow-lg backdrop-blur">
      <Link to="/my-loyalty" className="flex items-center gap-3"><span className="rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 p-2"><RiBlazeLine className="text-2xl"/></span><span className="text-lg font-bold">FlowApp Loyalty</span></Link>
      <div className="flex items-center gap-4"><span className="hidden text-sm text-slate-300 sm:block">{user.firstname} {user.lastname}</span><button onClick={signOut} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/10">{t("logout")}</button></div>
    </nav>
  );

  if (technicianMobile) return (
    <>
      <nav className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950 px-4 text-white shadow-lg">
        <Link to="/mobile-work-orders" className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-500"><RiBlazeLine className="text-2xl" /></span>
          <span className="min-w-0"><span className="block truncate text-sm font-black">FlowApp teren</span><span className="block truncate text-[11px] text-slate-400">{user.firstname} {user.lastname}</span></span>
        </Link>
        <span className="rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-300">Terenski rad</span>
      </nav>
      <nav className="fixed inset-x-0 bottom-0 z-50 grid h-[68px] grid-cols-3 border-t border-slate-200 bg-white/95 px-3 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,.12)] backdrop-blur">
        <MobileNavLink to="/mobile-work-orders" active={location.pathname.startsWith("/mobile-work-orders")} icon={FaClipboardList} label="Nalozi" />
        <MobileNavLink to="/notifications" active={location.pathname==="/notifications"} icon={FaBell} label="Obavijesti" />
        <MobileNavLink to="/profile" active={location.pathname==="/profile"} icon={FaUser} label="Profil" />
      </nav>
    </>
  );

  return (
    <div>
      {/* TOP NAVBAR */}
      <nav className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-950 px-4 text-white shadow-lg lg:left-64 lg:w-[calc(100%-16rem)] lg:px-6">
        <div className="flex items-center">
          {/* MOBILE BUTTON */}
          <button
            onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
            className="rounded-xl p-2 hover:bg-white/10 lg:hidden"
          >
            {isMobileMenuOpen ? <MdClose size={24} /> : <MdMenu size={24} />}
          </button>

          {/* LOGO */}
          <div className="ml-2 flex items-center rounded-xl bg-orange-500 p-1.5 lg:hidden">
            <RiBlazeLine className="text-white text-3xl" />
          </div>
          <span className="ml-2 text-xl font-black lg:hidden">FlowApp</span>
          <div className="hidden lg:block"><p className="text-[10px] font-black uppercase tracking-[.22em] text-orange-400">Operativni sistem</p><p className="text-sm font-bold text-slate-200">Upravljanje servisom i mjeriteljstvom</p></div>
        </div>

        {/* USER */}
        <div className="flex items-center">
          <span className="hidden sm:block mr-3">
            {user.firstname} {user.lastname}
          </span>

          <div className="relative" ref={userMenuRef}>
            <button onClick={() => setUserMenuOpen(!isUserMenuOpen)}>
              <img src={Avatar} alt={`${user.firstname || ""} ${user.lastname || ""}`.trim() || "Korisnik"} className="h-10 w-10 rounded-xl border border-white/15 bg-slate-800 object-cover" />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-3 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 text-slate-800 shadow-2xl">
                <Link to="/profile" className="block px-4 py-2 hover:bg-gray-100">
                  {t("profile")}
                </Link>
                {permissionSet.has("view_settings") && (
                  <Link to="/settings" className="block px-4 py-2 hover:bg-gray-100">
                    {t("settings")}
                  </Link>
                )}
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
        className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-slate-800 bg-slate-950 pt-16 text-slate-300 shadow-xl transition-all duration-300
          ${isMobile
            ? isMobileMenuOpen
              ? "w-64"
              : "w-0 overflow-hidden"
            : "w-64"
          }`}
      >
        <Link to="/overview" className="absolute inset-x-0 top-0 flex h-16 items-center gap-3 border-b border-slate-800 px-5"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500 text-white"><RiBlazeLine className="text-2xl"/></span><span><span className="block text-lg font-black text-white">FlowApp</span><span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">Business workflow</span></span></Link>
        <div className="sidebar-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden px-3 pb-8 pt-3">
          {filteredMenu.map((group, i) => (
            <div key={i} className="w-full">
              {/* GROUP TITLE */}
              {(isSidebarExpanded || isMobileMenuOpen || isMobile) && (
                <p className="mb-1 mt-4 px-3 text-[10px] font-black uppercase tracking-[.18em] text-slate-600">
                  {group.title}
                </p>
              )}

              {/* ITEMS */}
              {group.items.map((item, index) => (
                <Link
                  key={index}
                  to={item.link}
                  onClick={() => isMobile && setMobileMenuOpen(false)}
                  className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold transition
                    ${isActive(item.link) ? "bg-orange-500 text-white shadow-lg shadow-orange-950/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
                >
                  <span className="flex w-5 justify-center text-base">{item.icon}</span>
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

const MobileNavLink = ({ to, active, icon: Icon, label }) => (
  <Link to={to} className={`flex flex-col items-center justify-center gap-1 text-[11px] font-black ${active ? "text-orange-600" : "text-slate-400"}`}>
    <Icon className="text-lg" />
    <span>{label}</span>
  </Link>
);

export default Navbar;
