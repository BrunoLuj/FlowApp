import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { saveWorkOrder } from '../services/workorderServices';
import { toast } from 'sonner';
import { getProjects } from '../services/projectsServices';

const CreateWorkOrder = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const editingWO = location.state?.workOrder;

    const [clients, setClients] = useState([]);
    const [form, setForm] = useState({
        title: editingWO?.title || '',
        project_id: editingWO?.project_id || '',
        client_id: editingWO?.client_id || '',
        type: editingWO?.type || '',
        status: editingWO?.status || 'Open',
        description: editingWO?.description || '',
        assigned_to: editingWO?.assigned_to || '',
        planned_date: editingWO?.planned_date || ''
    });

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const res = await getProjects();
                setClients(res.data || res);
            } catch (error) {
                console.error(error);
                toast.error("Error fetching clients");
            }
        };
        fetchClients();
    }, []);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await saveWorkOrder(form);
            toast.success(editingWO ? "Work order updated!" : "Work order created!");
            navigate('/work-orders');
        } catch (error) {
            console.error(error);
            toast.error("Error saving work order");
        }
    };

    return (
        <div className="bg-gray-100 min-h-screen p-6 mt-14 sm:ml-16">
            <div className="bg-white rounded-lg shadow p-6 max-w-3xl mx-auto">
                <h1 className="text-2xl font-semibold mb-4">{editingWO ? "Edit Work Order" : "Create Work Order"}</h1>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="text"
                        name="title"
                        placeholder="Title"
                        value={form.title}
                        onChange={handleChange}
                        className="w-full border rounded px-3 py-2"
                        required
                    />
                    <select
                        name="client_id"
                        value={form.client_id}
                        onChange={handleChange}
                        className="w-full border rounded px-3 py-2"
                        required
                    >
                        <option value="">Select Client</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.client_name} {c.name} {c.address}</option>)}
                    </select>
                    <input
                        type="text"
                        name="type"
                        placeholder="Type"
                        value={form.type}
                        onChange={handleChange}
                        className="w-full border rounded px-3 py-2"
                        required
                    />
                    <textarea
                        name="description"
                        placeholder="Description"
                        value={form.description}
                        onChange={handleChange}
                        className="w-full border rounded px-3 py-2"
                        rows={3}
                    />
                    <input
                        type="text"
                        name="assigned_to"
                        placeholder="Assigned To"
                        value={form.assigned_to}
                        onChange={handleChange}
                        className="w-full border rounded px-3 py-2"
                    />
                    <input
                        type="date"
                        name="planned_date"
                        value={form.planned_date}
                        onChange={handleChange}
                        className="w-full border rounded px-3 py-2"
                        required
                    />
                    <button
                        type="submit"
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                        {editingWO ? "Update Work Order" : "Create Work Order"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CreateWorkOrder;
