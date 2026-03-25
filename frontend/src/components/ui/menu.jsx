import {
  FaTachometerAlt,
  FaUsers,
  FaBuilding,
  FaProjectDiagram,
  FaTools,
  FaTasks,
  FaClipboardCheck,
  FaExclamationTriangle,
  FaUserFriends,
  FaCog
} from "react-icons/fa";

export const menu = [
  {
    title: "Dashboard",
    items: [
      {
        label: "Pregled",
        link: "/overview",
        icon: <FaTachometerAlt />,
        permission: "view_dashboard"
      }
    ]
  },

  {
    title: "Organizacija",
    items: [
      {
        label: "Klijenti",
        link: "/clients",
        icon: <FaUsers />,
        permission: "view_clients"
      },
      {
        label: "Firme",
        link: "/companies",
        icon: <FaBuilding />,
        permission: "view_companies"
      },
      {
        label: "Projekti",
        link: "/projects",
        icon: <FaProjectDiagram />,
        permission: "view_projects"
      },
      {
        label: "Uređaji / Instrumenti",
        link: "/devices",
        icon: <FaTools />,
        permission: "view_devices"
      }
    ]
  },

  {
    title: "Servis",
    items: [
      {
        label: "Radni nalozi",
        link: "/work-order",
        icon: <FaTasks />,
        permission: "view_work_orders"
      },
      {
        label: "Aktivni nalozi",
        link: "/work-orders/active",
        icon: <FaTasks />,
        permission: "view_work_orders"
      },
      {
        label: "Završeni nalozi",
        link: "/work-orders/completed",
        icon: <FaTasks />,
        permission: "view_work_orders"
      }
    ]
  },

  {
    title: "Kalibracije",
    items: [
      {
        label: "Kalibracioni nalozi",
        link: "/calibrations",
        icon: <FaClipboardCheck />,
        permission: "view_calibrations"
      },
      {
        label: "Plan kalibracija",
        link: "/calibrations/schedule",
        icon: <FaClipboardCheck />,
        permission: "view_calibrations"
      },
      {
        label: "Istekle kalibracije",
        link: "/calibrations/expired",
        icon: <FaExclamationTriangle />,
        permission: "view_calibrations"
      }
    ]
  },

  {
    title: "Administracija",
    items: [
      {
        label: "Korisnici",
        link: "/users",
        icon: <FaUserFriends />,
        permission: "view_users"
      },
      {
        label: "Postavke",
        link: "/settings",
        icon: <FaCog />,
        permission: "view_settings"
      }
    ]
  }
];