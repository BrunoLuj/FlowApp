import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import SignUp from "./pages/auth/sign-up";
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
import ProjectDetails from "./pages/projectDetails";
import WorkOrdersList from "./pages/workorder";
import CreateWorkOrder from "./pages/createworkorder";

const RootLayout = () => {
    const { user } = useStore((state) => state);
    setAuthToken(user?.token ?? "");

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
                        <Route path="/overview" element={<Dashboard />} />
                        <Route path="/projects" element={<Projects />} />
                        <Route path="/project" element={<ProjectForm />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/users" element={<Users />} />
                        <Route path="/user" element={<UserForm />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/clients" element={<Clients />} />
                        <Route path="/client" element={<ClientForm />} />
                        <Route path="/change-password" element={<ChangePassword />} />
                        <Route path="/inspectionResult" element={<InspectionResult />} />
                        <Route path="/equipment" element={<EquipmentForm />} />
                        <Route path="/equipmentmanagement" element={<EquipmentManagement/>} />
                        <Route path="/project-details" element={<ProjectDetails/>} />
                        <Route path="/work-order" element={<WorkOrdersList/>} />
                        <Route path="/work-orders/create" element={<CreateWorkOrder/>} />
                    </Route>
                    <Route path="/sign-in" element={<SignIn />} />
                    <Route path="/sign-up" element={<SignUp />} />
                </Routes>
            </div>
            <Toaster richColors position="top-center" />
        </main>
    );
}

export default App;
