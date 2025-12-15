import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWorkOrders, deleteWorkOrder } from '../services/workorderServices';
import { toast } from 'sonner';
import Modal from '../components/Modal';

const WorkOrdersList = () => {
    const navigate = useNavigate();
    const [workOrders, setWorkOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedWO, setSelectedWO] = useState(null); // za modal

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
                                <th className="p-3 text-left">Start</th>
                                <th className="p-3 text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {workOrders.map((wo) => (
                                <tr
                                    key={wo.id}
                                    className="border-t hover:bg-gray-50 cursor-pointer"
                                    onClick={() => setSelectedWO(wo)}
                                >
                                    <td className="p-3">{wo.title}</td>
                                    <td className="p-3">{wo.project_name}</td>
                                    <td className="p-3">{wo.client_name}</td>
                                    <td className="p-3">{wo.status}</td>
                                    <td className="p-3">{new Date(wo.start_date).toLocaleDateString()}</td>
                                    <td className="p-3">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); navigate(`/work-orders/edit/${wo.id}`, { state: { workOrder: wo } }); }}
                                            className="text-blue-600 mr-2"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(wo.id); }}
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

            {/* Modal za detalje */}
            {selectedWO && (
                <Modal onClose={() => setSelectedWO(null)}>
                    <h2 className="text-xl font-semibold mb-2">{selectedWO.title}</h2>
                    <p><strong>Project:</strong> {selectedWO.project_name}</p>
                    <p><strong>Client:</strong> {selectedWO.client_name}</p>
                    <p><strong>Status:</strong> {selectedWO.status}</p>
                    <p><strong>Planned Date:</strong> {new Date(selectedWO.planned_date).toLocaleDateString() || '-'}</p>
                    <p><strong>Start Date:</strong> {new Date(selectedWO.start_date).toLocaleDateString() || '-'}</p>
                    <p><strong>End Date:</strong> {new Date(selectedWO.end_date).toLocaleDateString() || '-'}</p>
                    <p><strong>Description:</strong> {selectedWO.description || '-'}</p>
                    <p><strong>Assigned Users:</strong> {selectedWO.assigned_users?.map(u => `${u.firstname} ${u.lastname}`).join(', ') || '-'}</p>
                </Modal>
            )}
        </div>
    );
};

export default WorkOrdersList;
