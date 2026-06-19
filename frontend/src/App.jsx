import React, { useEffect, useRef, useState } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import SignIn from "./pages/auth/sign-in";
import Dashboard from "./pages/dashboard";
import Settings from "./pages/settings";
import Projects from "./pages/projects";
import Users from "./pages/users";
import Profile from "./pages/profile";
import useStore from "./store";
import { setAuthToken } from "./libs/apiCall";
import { Toaster } from "sonner";
import Navbar from "./components/navbar";
import Clients from "./pages/clients";
import ProjectForm from "./pages/project";
import ClientForm from "./pages/client";
import UserForm from "./pages/user";
import ChangePassword from "./pages/changepassword";
import InspectionResult from "./pages/inspectionResult";
import EquipmentForm from "./pages/equipmentForm";
import EquipmentManagement from "./pages/equipmentmanagement";
import WorkOrdersList from "./pages/workorder";
import CreateWorkOrder from "./pages/createworkorder";
import WorkOrderDetails from "./pages/workOrderDetails";
import Notifications from "./pages/notifications";
import ServiceCenter from "./pages/serviceCenter";
import StationDetails from "./pages/stationDetails";
import Management from "./pages/management";
import Inventory from "./pages/inventory";
import Maintenance from "./pages/maintenance";
import PublicAsset from "./pages/publicAsset";
import Commercial from "./pages/commercial";
import PublicQuotation from "./pages/publicQuotation";
import Roles from "./pages/roles";
import Forbidden from "./pages/forbidden";
import RequirePermission from "./components/RequirePermission";
import { getSession } from "./services/authServices";
import DocumentCenter from "./pages/documentCenter";
import Dispatch from "./pages/dispatch";
import MobileWorkOrders from "./pages/mobileWorkOrders";

const secured = (permission, element) => (
    <RequirePermission permission={permission}>{element}</RequirePermission>
);

const RootLayout = () => {
    const { user, setCredentials, signOut } = useStore((state) => state);
    const initialToken = useRef(user?.token);
    const [checkingSession, setCheckingSession] = useState(Boolean(initialToken.current));
    setAuthToken(user?.token ?? "");

    useEffect(() => {
        if (!initialToken.current) {
            setCheckingSession(false);
            return;
        }
        getSession()
            .then(({ data }) => setCredentials({ ...data.user, token: data.token }))
            .catch(() => signOut())
            .finally(() => setCheckingSession(false));
    }, [setCredentials, signOut]);

    if (checkingSession) {
        return <div className="min-h-screen bg-slate-100 pt-28 text-center text-slate-500">Provjera sesije…</div>;
    }

    return !user ? (
        <Navigate to="sign-in" replace={true} />
    ) : (
        <>
            <Navbar />
            <div className="min-h-[cal(h-screen-100px)]">
                <Outlet />
            </div>
        </>
    );
};

function App() {
    return (
        <main>
            <div className="w-full min-h-screen bg-gray-100 dark:bg-slate-900">
                <Routes>
                    <Route element={<RootLayout />}>
                        <Route path="/" element={<Navigate to="/overview" />} />
                        <Route path="/overview" element={secured("view_dashboard", <Dashboard />)} />
                        <Route path="/projects" element={secured("view_projects", <Projects />)} />
                        <Route path="/project" element={secured("create_projects", <ProjectForm />)} />
                        <Route path="/settings" element={secured("view_settings", <Settings />)} />
                        <Route path="/users" element={secured("view_users", <Users />)} />
                        <Route path="/user" element={secured("view_users", <UserForm />)} />
                        <Route path="/roles" element={secured("view_roles", <Roles />)} />
                        <Route path="/profile" element={secured("view_profile", <Profile />)} />
                        <Route path="/clients" element={secured("view_clients", <Clients />)} />
                        <Route path="/client" element={secured("view_clients", <ClientForm />)} />
                        <Route path="/change-password" element={<ChangePassword />} />
                        <Route path="/inspectionResult" element={secured("create_inspections", <InspectionResult />)} />
                        <Route path="/equipment" element={secured("manage_assets", <EquipmentForm />)} />
                        <Route path="/equipmentmanagement" element={secured("view_stations", <EquipmentManagement/>)} />
                        <Route path="/work-order" element={secured("view_work_orders", <WorkOrdersList/>)} />
                        <Route path="/mobile-work-orders" element={secured("use_mobile_work_orders", <MobileWorkOrders />)} />
                        <Route path="/work-orders/create" element={secured("create_work_orders", <CreateWorkOrder/>)} />
                        <Route path="/work-orders/:id" element={secured("view_work_orders", <WorkOrderDetails />)} />
                        <Route path="/notifications" element={secured("view_dashboard", <Notifications />)} />
                        <Route path="/documents" element={secured("view_document_center", <DocumentCenter />)} />
                        <Route path="/dispatch" element={secured("view_dispatch", <Dispatch />)} />
                        <Route path="/service-center" element={secured("view_service_center", <ServiceCenter />)} />
                        <Route path="/service-center/stations/:id" element={secured("view_stations", <StationDetails />)} />
                        <Route path="/management" element={secured("view_management", <Management />)} />
                        <Route path="/inventory" element={secured("view_inventory", <Inventory />)} />
                        <Route path="/maintenance" element={secured("view_maintenance_plans", <Maintenance />)} />
                        <Route path="/commercial" element={secured("view_commercial", <Commercial />)} />
                        <Route path="/forbidden" element={<Forbidden />} />
                    </Route>
                    <Route path="/sign-in" element={<SignIn />} />
                    <Route path="/asset/:token" element={<PublicAsset />} />
                    <Route path="/quotation/:token" element={<PublicQuotation />} />
                </Routes>
            </div>
            <Toaster richColors position="top-center" />
        </main>
    );
}

export default App;
