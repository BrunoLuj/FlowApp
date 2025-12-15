import { useState } from "react";

const CreateWorkOrder = ({ projectId }) => {
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "Normal",
    planned_date: "",
    assigned_to: "",
  });

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = e => {
    e.preventDefault();
    console.log({
      ...form,
      project_id: projectId,
      status: "Open",
    });
  };

  return (
    <div className="bg-gray-100 min-h-screen p-6 mt-14 sm:ml-16">
      <h1 className="text-2xl font-semibold mb-6">Create Work Order</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow max-w-3xl space-y-4"
      >
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        {/* Priority + Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              name="priority"
              value={form.priority}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option>Low</option>
              <option>Normal</option>
              <option>High</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Planned date
            </label>
            <input
              type="date"
              name="planned_date"
              value={form.planned_date}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Assigned */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assigned to
          </label>
          <input
            name="assigned_to"
            value={form.assigned_to}
            onChange={handleChange}
            placeholder="Serviser"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            className="px-4 py-2 text-sm text-gray-600 hover:underline"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateWorkOrder;
