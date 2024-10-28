import * as clientsModel from '../models/clientsModel.js';

export const getClients = async (req, res) => {
    try {
        const projects = await clientsModel.getAllClients();
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching projects' });
    }
};

export const addClients = async (req, res) => {
    const { name, project_type, status, end_date  } = req.body;
    console.log(req.body);
    try {
        const newProject = await clientsModel.createProject(name, project_type, status, end_date );
        console.log(newProject);
        res.status(201).json(newProject);
    } catch (error) {
        res.status(500).json({ error: 'Error creating project' });
    }
};

export const updateClients = async (req, res) => {
    const { id } = req.params;
    const { name, project_type, status, end_date  } = req.body;
    try {
        const updatedProject = await clientsModel.updateProject(id, name, project_type, status, end_date );
        if (updatedProject) {
            res.json(updatedProject);
        } else {
            res.status(404).json({ error: 'Project not found' });
        }
    } catch (error) {
        // console.error('Error updating project:', error);
        res.status(500).json({ error: 'Error updating project' });
    }
};

export const deleteClients = async (req, res) => {
    const { id } = req.params;
    try {
        const deletedProject = await clientsModel.deleteProject(id);
        if (deletedProject) {
            res.json({ message: 'Project deleted' });
        } else {
            res.status(404).json({ error: 'Project not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error deleting project' });
    }
};
