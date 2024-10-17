import { useState } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import SignUp from "./pages/auth/sign-up";
import SignIn from "./pages/auth/sign-in";
import Dashboard from "./pages/dashboard";
import Settings  from "./pages/settings";
import Account from "./pages/account";
import Transaction from "./pages/transaction";

const RootLayout = () =>{
  const user = null;
  return !user ? (<Navigate to="sign-in" replace = {true}/>

  ) : (
    <> 
      {}
      <div>
        <Outlet />
      </div>
    </>
  );
};

function App() {
  const [count, setCount] = useState(0);

  return (
    <main>
        <div>
          <Routes>
              <Route element={<RootLayout/>}>
                <Route path="/" element={<Navigate to="/overview"/>} />
                <Route path="/overview" element={<Dashboard/>} />
                <Route path="/transaction" element={<Transaction/>} />
                <Route path="/settings" element={<Settings/>} />
                <Route path="/account" element={<Account/>} />
              </Route>

              <Route path="/sign-in" element={<SignIn />} />
              <Route path="/sign-up" element={<SignUp />} />
          </Routes>
        </div>
    </main>
  );
};

export default App;
