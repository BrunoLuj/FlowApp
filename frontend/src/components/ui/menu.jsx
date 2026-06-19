import {
  FaBell,
  FaEnvelope,
  FaBoxes,
  FaCalendarCheck,
  FaChartLine,
  FaCog,
  FaFileInvoiceDollar,
  FaFolderOpen,
  FaRoute,
  FaMobileAlt,
  FaHeadset,
  FaProjectDiagram,
  FaShieldAlt,
  FaTachometerAlt,
  FaTasks,
  FaFlask,
  FaUserFriends,
  FaUsers,
} from "react-icons/fa";

export const menu = [
  {
    title: "Dashboard",
    items: [
      { label: "Pregled", link: "/overview", icon: <FaTachometerAlt />, permission: "view_dashboard" },
      { label: "Obavijesti", link: "/notifications", icon: <FaBell />, permission: "view_dashboard" },
      { label: "E-mail centar", link: "/email-center", icon: <FaEnvelope />, permission: "view_email_center" },
    ],
  },
  {
    title: "Organizacija",
    items: [
      { label: "Klijenti", link: "/clients", icon: <FaUsers />, permission: "view_clients" },
      { label: "Benzinske stanice", link: "/projects", icon: <FaProjectDiagram />, permission: "view_projects" },
    ],
  },
  {
    title: "Servis",
    items: [
      { label: "Servisni centar", link: "/service-center", icon: <FaHeadset />, permission: "view_service_center" },
      { label: "Radni nalozi", link: "/work-order", icon: <FaTasks />, permission: "view_work_orders" },
      { label: "Moji nalozi", link: "/mobile-work-orders", icon: <FaMobileAlt />, permission: "use_mobile_work_orders" },
      { label: "Dokumentni centar", link: "/documents", icon: <FaFolderOpen />, permission: "view_document_center" },
      { label: "Mjeriteljski centar", link: "/metrology", icon: <FaFlask />, permission: "view_metrology_center" },
      { label: "Dispatch servisera", link: "/dispatch", icon: <FaRoute />, permission: "view_dispatch" },
      { label: "Preventivno održavanje", link: "/maintenance", icon: <FaCalendarCheck />, permission: "view_maintenance_plans" },
    ],
  },
  {
    title: "Rukovodstvo",
    items: [
      { label: "Upravljački centar", link: "/management", icon: <FaChartLine />, permission: "view_management" },
      { label: "Skladište", link: "/inventory", icon: <FaBoxes />, permission: "view_inventory" },
      { label: "Ugovori i ponude", link: "/commercial", icon: <FaFileInvoiceDollar />, permission: "view_commercial" },
    ],
  },
  {
    title: "Administracija",
    items: [
      { label: "Korisnici", link: "/users", icon: <FaUserFriends />, permission: "view_users" },
      { label: "Role i permisije", link: "/roles", icon: <FaShieldAlt />, permission: "view_roles" },
      { label: "Postavke", link: "/settings", icon: <FaCog />, permission: "view_settings" },
    ],
  },
];
