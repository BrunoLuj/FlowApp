import * as projectModel from '../models/projectModel.js';

export const getProjects = async (req, res) => {
    try {
        const projects = await projectModel.getAllProjects();
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching projects' });
    }
};

export const addProjects = async (req, res) => {
    const { name, description } = req.body;
    try {
        const newProject = await projectModel.createProject(name, description);
        res.status(201).json(newProject);
    } catch (error) {
        res.status(500).json({ error: 'Error creating project' });
    }
};

export const updateProjects = async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    try {
        const updatedProject = await projectModel.updateProject(id, name, description);
        if (updatedProject) {
            res.json(updatedProject);
        } else {
            res.status(404).json({ error: 'Project not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error updating project' });
    }
};

export const deleteProjects = async (req, res) => {
    const { id } = req.params;
    try {
        const deletedProject = await projectModel.deleteProject(id);
        if (deletedProject) {
            res.json({ message: 'Project deleted' });
        } else {
            res.status(404).json({ error: 'Project not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error deleting project' });
    }
};
