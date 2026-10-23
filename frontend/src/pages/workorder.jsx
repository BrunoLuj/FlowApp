import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getWorkOrders, deleteWorkOrder } from "../services/workorderServices";
import { toast } from "sonner";
import { FaCheckCircle, FaClock, FaPlus, FaSearch, FaSpinner } from "react-icons/fa";

const WorkOrdersList = () => {
  const navigate = useNavigate();
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  const fetchWorkOrders = async () => {
    try {
      setLoading(true);
      const res = await getWorkOrders();
      setWorkOrders(res.data || res);
    } catch (error) {
      console.error(error);
      toast.error("Radne naloge nije moguće učitati.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Želite li izbrisati ovaj radni nalog?")) return;
    try {
      await deleteWorkOrder(id);
      toast.success("Radni nalog je izbrisan.");
      fetchWorkOrders();
    } catch (error) {
      console.error(error);
      toast.error("Radni nalog nije moguće izbrisati.");
    }
  };

    // Funkcija za badge boje statusa
    const statusBadge = (status) => {
    switch (status) {
        case "Completed":
        return "bg-green-100 text-green-700";
        case "Pending":
        return "bg-yellow-100 text-yellow-700";
        case "In Progress":
        return "bg-blue-100 text-blue-700";
        case "Cancelled":
        return "bg-red-100 text-red-700";
        default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const startEditing = (wo) => {
    navigate('/work-orders/create', { state: { wo } });
  };

  const isClosed = (status) => ["Completed", "Cancelled"].includes(status);
  const counts = useMemo(() => ({
    active: workOrders.filter(wo => !isClosed(wo.status)).length,
    progress: workOrders.filter(wo => wo.status === "In Progress").length,
    completed: workOrders.filter(wo => wo.status === "Completed").length,
    all: workOrders.length,
  }), [workOrders]);
  const visibleOrders = useMemo(() => workOrders
    .filter(wo => statusFilter === "all" || (statusFilter === "active" ? !isClosed(wo.status) : wo.status === statusFilter))
    .filter(wo => [wo.title, wo.project_name, wo.client_name, wo.work_order_number].some(value => String(value || "").toLowerCase().includes(search.toLowerCase())))
    .sort((a,b) => new Date(b.created_at || b.planned_date || 0) - new Date(a.created_at || a.planned_date || 0)), [workOrders, search, statusFilter]);


  return (
    <div className="min-h-screen bg-slate-100 px-4 pb-10 pt-24 sm:px-7">
      <div className="mx-auto w-full max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-sm font-black uppercase tracking-widest text-orange-600">Operativa</p><h1 className="text-3xl font-black text-slate-900">Radni nalozi</h1><p className="mt-2 text-slate-500">Planiranje, izvršenje i praćenje terenskih aktivnosti.</p></div>
          <button
            onClick={() => navigate("/work-orders/create")}
            className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 font-bold text-white shadow-lg shadow-orange-200 hover:bg-orange-600"
          >
            <FaPlus /> Novi radni nalog
          </button>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Summary label="Aktivni" value={counts.active} icon={FaClock} active={statusFilter==="active"} onClick={()=>setStatusFilter("active")}/>
          <Summary label="U radu" value={counts.progress} icon={FaSpinner} active={statusFilter==="In Progress"} onClick={()=>setStatusFilter("In Progress")}/>
          <Summary label="Završeni" value={counts.completed} icon={FaCheckCircle} active={statusFilter==="Completed"} onClick={()=>setStatusFilter("Completed")}/>
          <Summary label="Svi nalozi" value={counts.all} icon={FaCheckCircle} active={statusFilter==="all"} onClick={()=>setStatusFilter("all")}/>
        </div>

        <div className="relative mb-5 max-w-xl rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><FaSearch className="absolute left-7 top-7 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pretraži nalog, klijenta ili stanicu…" className="w-full py-3 pl-10 pr-3"/></div>

        {/* Table */}
        {loading ? (
          <div className="rounded-2xl bg-white p-12 text-center text-slate-400">Učitavanje radnih naloga…</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th>Naziv</th><th>Stanica</th><th>Klijent</th><th>Status</th><th>Početak</th><th>Akcije</th>
                </tr>
              </thead>
                <tbody>
                {visibleOrders.map((wo) => (
                    <tr
                    key={wo.id}
                    className="border-t hover:bg-gray-50 cursor-pointer transition"
                    onClick={() => navigate(`/work-orders/${wo.id}`)}
                    >
                    <td className="p-3">{wo.title}</td>
                    <td className="p-3">{wo.project_name}</td>
                    <td className="p-3">{wo.client_name}</td>
                    <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-sm font-semibold ${statusBadge(wo.status)}`}>
                        {wo.status}
                        </span>
                    </td>
                    <td className="p-3">{wo.start_date ? new Date(wo.start_date).toLocaleDateString("hr-HR") : "—"}</td>
                    <td className="p-3 flex gap-2">
                        <button
                        onClick={(e) => { e.stopPropagation(); startEditing(wo); }}
                        className="text-blue-600 hover:text-blue-800"
                        >
                        Uredi
                        </button>
                        <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(wo.id);
                        }}
                        className="text-red-600 hover:text-red-800"
                        >
                        Izbriši
                        </button>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
            {!visibleOrders.length && <div className="p-12 text-center text-slate-400">Nema radnih naloga za odabrani pregled.</div>}
          </div>
        )}

      </div>
    </div>
  );
};

const Summary = ({label,value,icon:Icon,active,onClick}) => <button onClick={onClick} className={`flex items-center gap-3 rounded-2xl border p-4 text-left shadow-sm ${active?"border-orange-300 bg-orange-50":"border-slate-200 bg-white hover:border-slate-300"}`}><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${active?"bg-orange-500 text-white":"bg-slate-100 text-slate-500"}`}><Icon/></span><span><span className="block text-2xl font-black text-slate-900">{value}</span><span className="text-xs font-bold text-slate-500">{label}</span></span></button>;

export default WorkOrdersList;
