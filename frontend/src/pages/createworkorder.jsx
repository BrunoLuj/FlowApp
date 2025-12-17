import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { saveWorkOrder } from '../services/workorderServices';
import { getProjects } from '../services/projectsServices';
import { getUsers } from '../services/usersServices';
import { toast } from 'sonner';
import Select from 'react-select';

const WORK_ORDER_TYPES = [
    { value: 'Preventive', label: 'Preventive' },
    { value: 'Corrective', label: 'Corrective' },
    { value: 'Calibration', label: 'Calibration' },
    { value: 'Separator Service', label: 'Separator Service' },
];

const WORK_ORDER_STATUS = [
    { value: 'New', label: 'New' },
    { value: 'Open', label: 'Open' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Completed', label: 'Completed' },
    { value: 'On Hold', label: 'On Hold' },
];

const CreateWorkOrder = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const editingWO = location.state?.wo;

    const toDateInputValue = (date) => {
        if (!date) return '';
        return new Date(date).toISOString().slice(0, 10);
    };

    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [form, setForm] = useState({
        id: editingWO?.id ?? null,
        title: editingWO?.title || '',
        project_id: editingWO?.project_id || '',
        type: editingWO?.type || WORK_ORDER_TYPES[0].value,
        status: editingWO?.status || 'Open',
        description: editingWO?.description || '',
        assigned_to: editingWO?.assigned_to || [],
        start_date: toDateInputValue(editingWO?.start_date) || '',
        end_date: toDateInputValue(editingWO?.end_date) || '',
        planned_date: toDateInputValue(editingWO?.planned_date) || ''
    });


    useEffect(() => {
        const fetchData = async () => {
            try {
                const resProjects = await getProjects();
                setProjects(resProjects.data || resProjects);

                const resUsers = await getUsers();
                setUsers(resUsers.data || resUsers);
            } catch (error) {
                console.error(error);
                toast.error("Error fetching projects or users");
            }
        };
        fetchData();
    }, []);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleAssignedChange = (selectedOptions) => {
        setForm({
            ...form,
            assigned_to: selectedOptions ? selectedOptions.map(o => o.value) : []
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await saveWorkOrder(form);
            toast.success(editingWO ? "Work order updated!" : "Work order created!");
            navigate('/work-order');
        } catch (error) {
            console.error(error);
            toast.error("Error saving work order");
        }
    };

    const userOptions = users.map(u => ({
        value: u.id,
        label: `${u.firstname || ''} ${u.lastname || ''}`.trim()
    }));

    return (
        <div className="bg-gray-100 min-h-screen p-6 mt-14 sm:ml-16">
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold mb-6 text-gray-800">
                    {editingWO ? "Edit Work Order" : "Create Work Order"}
                </h1>

                <form onSubmit={handleSubmit} className="space-y-5">

                    <input
                        type="text"
                        name="title"
                        placeholder="Title"
                        value={form.title}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        required
                    />

                    <select
                        name="project_id"
                        value={form.project_id}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        required
                    >
                        <option value="">Select Project</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.name} | {p.client_name} | {p.address}
                            </option>
                        ))}
                    </select>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select
                            name="type"
                            value={form.type}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            required
                        >
                            {WORK_ORDER_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>

                        <select
                            name="status"
                            value={form.status}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            required
                        >
                            {WORK_ORDER_STATUS.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </div>

                    <textarea
                        name="description"
                        placeholder="Description"
                        value={form.description}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        rows={4}
                    />

                    <div>
                        <label className="block text-sm font-medium mb-1">Assign To</label>
                        <Select
                            isMulti
                            options={userOptions}
                            value={userOptions.filter(u => form.assigned_to.includes(u.value))}
                            onChange={handleAssignedChange}
                            className="basic-multi-select"
                            classNamePrefix="select"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm mb-1">Start Date</label>
                            <input
                                type="date"
                                name="start_date"
                                value={form.start_date}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm mb-1">End Date</label>
                            <input
                                type="date"
                                name="end_date"
                                value={form.end_date}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm mb-1">Planned Date</label>
                            <input
                                type="date"
                                name="planned_date"
                                value={form.planned_date}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold shadow hover:scale-105 transition"
                    >
                        {editingWO ? "Update Work Order" : "Create Work Order"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CreateWorkOrder;
