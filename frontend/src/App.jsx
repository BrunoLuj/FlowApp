import { useState } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import SignUp from "./pages/auth/sign-up";
import SignIn from "./pages/auth/sign-in";
import Dashboard from "./pages/dashboard";
import Settings  from "./pages/settings";
import Account from "./pages/account";
import Projects from "./pages/projects";
import Profile from "./pages/profile";
import useStore from "./store";
import { setAuthToken } from "./libs/apiCall";
import { Toaster } from "sonner";
import Navbar from "./components/navbar";
import Clients from "./pages/clients";

const RootLayout = () =>{
  const {user} = useStore((state) => state);
  setAuthToken(user?.token ?? "");

  return !user ? (<Navigate to="sign-in" replace = {true}/>

  ) : (
    <> 
      <Navbar/>
      <div className="min-h-[cal(h-screen-100px)]">
        <Outlet />
      </div>
    </>
  );
};

function App() {
  const [count, setCount] = useState(0);

  return (
    <main>
        <div className="w-full min-h-screen  bg-gray-100 dark:bg-slate-900">
          <Routes>
              <Route element={<RootLayout/>}>
                <Route path="/" element={<Navigate to="/overview"/>} />
                <Route path="/overview" element={<Dashboard/>} />
                <Route path="/projects" element={<Projects/>} />
                <Route path="/settings" element={<Settings/>} />
                <Route path="/account" element={<Account/>} />
                <Route path="/profile" element={<Profile/>} />
                <Route path="/clients" element={<Clients/>} />
              </Route>

              <Route path="/sign-in" element={<SignIn />} />
              <Route path="/sign-up" element={<SignUp />} />
          </Routes>
        </div>

        <Toaster richColors position="top-center" />

    </main>
  );
};

export default App;
