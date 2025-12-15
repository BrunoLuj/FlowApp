import * as projectModel from '../models/projectsModel.js';

export const getWorkOrders = async (req, res) => {
    try {
        const projects = await projectModel.getAllWorkOrders();
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching projects' });
    }
};

export const addWorkOrder = async (req, res) => {
    //const { name, project_type, status, end_date, start_date, responsible_person, service_executors, description, client_id } = req.body;
    const { client_id, name, address, city, gps_lat, gps_lng, active, sttn } = req.body;
    try {
        const newProject = await projectModel.createWorkOrder(client_id, name, address, city, gps_lat, gps_lng, active, sttn );
        console.log(newProject);
        res.status(201).json(newProject);
    } catch (error) {
        res.status(500).json({ error: 'Error creating project', error });
    }
};

export const updateWorkOrder = async (req, res) => {
    const { id } = req.params;
    const { client_id, name, address, city, gps_lat, gps_lng, active, sttn } = req.body;
    try {
        const updatedProject = await projectModel.updateWorkOder(client_id, name, address, city, gps_lat, gps_lng, active, sttn, id );
        if (updatedProject) {
            res.json(updatedProject);
        } else {
            res.status(404).json({ error: 'Project not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error updating project' });
    }
};

export const deleteWorkOrder = async (req, res) => {
    const { id } = req.params;
    try {
        const deletedProject = await projectModel.deleteWorkOrder(id);
        if (deletedProject) {
            res.json({ message: 'Project deleted' });
        } else {
            res.status(404).json({ error: 'Project not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error deleting project' });
    }
};

export const getActiveWorkOrders = async (req, res) => {
    try {
        const projects = await projectModel.getActiveWorkOrders();
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching projects' });
    }
};
