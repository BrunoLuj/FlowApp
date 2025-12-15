import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWorkOrders, deleteWorkOrder } from '../services/workorderServices';
import { toast } from 'sonner';

const WorkOrdersList = () => {
    const navigate = useNavigate();
    const [workOrders, setWorkOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch work orders s backendom
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

    return (
        <div className="bg-gray-100 min-h-screen p-6 mt-14 sm:ml-16">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-semibold">Work Orders</h1>
                <button
                    onClick={() => navigate('/work-orders/create')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                    Create Work Order
                </button>
            </div>

            {loading ? (
                <p>Loading...</p>
            ) : (
                <div className="bg-white rounded-lg shadow">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-200">
                            <tr>
                                <th className="p-3 text-left">Title</th>
                                <th className="p-3 text-left">Project</th>
                                <th className="p-3 text-left">Client</th>
                                <th className="p-3 text-left">Status</th>
                                <th className="p-3 text-left">Planned</th>
                                <th className="p-3 text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {workOrders.map((wo) => (
                                <tr key={wo.id} className="border-t hover:bg-gray-50 cursor-pointer">
                                    <td className="p-3">{wo.title}</td>
                                    <td className="p-3">{wo.project_name}</td>
                                    <td className="p-3">{wo.client_name}</td>
                                    <td className="p-3">{wo.status}</td>
                                    <td className="p-3">{wo.planned_date}</td>
                                    <td className="p-3">
                                        <button
                                            onClick={() => navigate(`/work-orders/edit/${wo.id}`, { state: { workOrder: wo } })}
                                            className="text-blue-600 mr-2"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(wo.id)}
                                            className="text-red-600"
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
        </div>
    );
};

export default WorkOrdersList;
