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
    const { company_name, contact_person, email, phone, address, idbroj, pdvbroj, sttn_broj, status} = req.body;
    console.log("Body" ,req.body);
    try {
        const newClient = await clientsModel.createClient(company_name, contact_person, email, phone, address, idbroj, pdvbroj, sttn_broj, status );
        console.log("newClient",newClient);
        res.status(201).json(newClient);
    } catch (error) {
        res.status(500).json({ error: 'Error creating client' });
    }
};

export const updateClients = async (req, res) => {
    const { id } = req.params;
    console.log(req.params);
    const { company_name, contact_person, email, phone, address, idbroj, pdvbroj, sttn_broj, status  } = req.body;
    console.log(req.body);

    try {
        const updatedClient = await clientsModel.updateClient(id, company_name, contact_person, email, phone, address, idbroj, pdvbroj, sttn_broj, status );
        console.log(updatedClient);
        if (updatedClient) {
            res.json(updatedClient);
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
        const deleteClient = await clientsModel.deleteClient(id);
        if (deleteClient) {
            res.json({ message: 'Client deleted' });
        } else {
            res.status(404).json({ error: 'Client not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error deleting client' });
    }
};
