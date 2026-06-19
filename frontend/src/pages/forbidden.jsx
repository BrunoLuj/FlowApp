import React from "react";
import { useNavigate } from "react-router-dom";
import { FaLock } from "react-icons/fa";

const Forbidden = () => {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 sm:ml-16">
      <div className="max-w-md rounded-2xl border bg-white p-8 text-center shadow-lg">
        <FaLock className="mx-auto text-4xl text-amber-500" />
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Pristup nije dopušten</h1>
        <p className="mt-2 text-slate-500">Vaša rola nema permisiju za ovu funkciju. Obratite se administratoru ako vam je pristup potreban.</p>
        <button onClick={() => navigate("/overview")} className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white">Povratak na pregled</button>
      </div>
    </div>
  );
};

export default Forbidden;
