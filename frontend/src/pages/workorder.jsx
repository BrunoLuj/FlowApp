import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getWorkOrders, deleteWorkOrder } from "../services/workorderServices";
import { toast } from "sonner";
import Modal from "../components/Modal";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";

const WorkOrdersList = () => {
  const navigate = useNavigate();
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWO, setSelectedWO] = useState(null);

  const fetchWorkOrders = async () => {
    try {
      setLoading(true);
      const res = await getWorkOrders();
      setWorkOrders(res.data || res);
    } catch (error) {
      console.error(error);
      toast.error("Error fetching work orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this work order?")) return;
    try {
      await deleteWorkOrder(id);
      toast.success("Work order deleted");
      fetchWorkOrders();
    } catch (error) {
      console.error(error);
      toast.error("Error deleting work order");
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


  return (
    <div className="bg-gray-100 min-h-screen p-6 mt-14 sm:ml-16">
      <div className="w-full mx-auto overflow-x-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-gray-800">Work Orders</h1>
          <button
            onClick={() => navigate("/work-orders/create")}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold shadow hover:scale-105 transition"
          >
            <FaPlus /> Create Work Order
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">Title</th>
                  <th className="p-3 text-left">Project</th>
                  <th className="p-3 text-left">Client</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Start</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
                <tbody>
                {workOrders.map((wo) => (
                    <tr
                    key={wo.id}
                    className="border-t hover:bg-gray-50 cursor-pointer transition"
                    onClick={() => setSelectedWO(wo)}
                    >
                    <td className="p-3">{wo.title}</td>
                    <td className="p-3">{wo.project_name}</td>
                    <td className="p-3">{wo.client_name}</td>
                    <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-sm font-semibold ${statusBadge(wo.status)}`}>
                        {wo.status}
                        </span>
                    </td>
                    <td className="p-3">{new Date(wo.start_date).toLocaleDateString()}</td>
                    <td className="p-3 flex gap-2">
                        <button
                        onClick={(e) => { e.stopPropagation(); startEditing(wo); }}
                        className="text-blue-600 hover:text-blue-800"
                        >
                        Edit
                        </button>
                        <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(wo.id);
                        }}
                        className="text-red-600 hover:text-red-800"
                        >
                        Delete
                        </button>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
          </div>
        )}

        {/* Modal za detalje */}
        {selectedWO && (
          <Modal onClose={() => setSelectedWO(null)}>
            <h2 className="text-xl font-semibold mb-4">{selectedWO.title}</h2>
            <div className="space-y-2 text-gray-700">
              <p><strong>Project:</strong> {selectedWO.project_name}</p>
              <p><strong>Client:</strong> {selectedWO.client_name}</p>
              <p>
                <strong>Status:</strong>{" "}
                <span className={`px-2 py-1 rounded-full text-sm font-semibold ${statusBadge(selectedWO.status)}`}>
                  {selectedWO.status}
                </span>
              </p>
              <p><strong>Planned Date:</strong> {selectedWO.planned_date ? new Date(selectedWO.planned_date).toLocaleDateString() : "-"}</p>
              <p><strong>Start Date:</strong> {selectedWO.start_date ? new Date(selectedWO.start_date).toLocaleDateString() : "-"}</p>
              <p><strong>End Date:</strong> {selectedWO.end_date ? new Date(selectedWO.end_date).toLocaleDateString() : "-"}</p>
              <p><strong>Description:</strong> {selectedWO.description || "-"}</p>
              <p><strong>Assigned Users:</strong> {selectedWO.assigned_users?.map(u => `${u.firstname} ${u.lastname}`).join(", ") || "-"}</p>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default WorkOrdersList;
