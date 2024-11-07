import * as clientsModel from '../models/clientsModel.js';
import multer from 'multer';

export const getClients = async (req, res) => {
    try {
        const clients = await clientsModel.getAllClients();  // Get all clients
        
        // Iterate over each client to check and convert the logo to base64 if it exists
        const clientsWithBase64Logo = clients.map(client => {
            if (client.logo) {
                // Convert binary logo data to base64 string
                const base64Logo = client.logo.toString('base64');
                client.logo = `data:image/png;base64,${base64Logo}`; // Set logo as a base64 string
            }
            return client;
        });

        res.json(clientsWithBase64Logo); // Send the updated client list with base64 logos
    } catch (error) {
        console.error("Error fetching clients:", error);
        res.status(500).json({ error: 'Error fetching clients' });
    }
};

export const addClients = async (req, res) => {
    const { company_name, contact_person, email, phone, address, idbroj, pdvbroj, sttn_broj, status, description, logo } = req.body;

    // Ako je logo prisutan, pretvorite ga iz Base64 u Buffer
    let logoBuffer = null;
    if (logo) {
        // Uklonite `data:image/png;base64,` deo
        const base64Data = logo.split(',')[1]; 
        logoBuffer = Buffer.from(base64Data, 'base64'); // Pretvorite u Buffer
    }

    try {
        const newClient = await clientsModel.createClient(company_name, contact_person, email, phone, address, idbroj, pdvbroj, sttn_broj, status, description, logoBuffer);
        res.status(201).json(newClient); // Vratite podatke o novom klijentu
    } catch (error) {
        console.error('Error creating client:', error);
        res.status(500).json({ error: 'Error creating client' });
    }
};

export const updateClients = async (req, res) => {
    const { id } = req.params;
    const { company_name, contact_person, email, phone, address, idbroj, pdvbroj, sttn_broj, status, description, logo } = req.body;

    // Ako je logo prisutan, pretvorite ga iz Base64 u Buffer
    let logoBuffer = null;
    if (logo) {
        // Uklonite `data:image/png;base64,` deo
        const base64Data = logo.split(',')[1]; 
        logoBuffer = Buffer.from(base64Data, 'base64'); // Pretvorite u Buffer
    }

    try {
        // Prvo, dohvatite postojećeg klijenta iz baze podataka
        const existingClient = await clientsModel.getClientById(id);
        
        // Ako klijent ne postoji, vrati grešku
        if (!existingClient) {
            return res.status(404).json({ error: 'Client not found' });
        }

        // Ako novi logo nije prisutan, zadržite stari logo
        const finalLogo = logoBuffer !== null ? logoBuffer : existingClient.logo;

        // Ažurirajte klijenta koristeći finalLogo
        const updatedClient = await clientsModel.updateClient(id, company_name, contact_person, email, phone, address, idbroj, pdvbroj, sttn_broj, status, description, finalLogo);
        res.json(updatedClient);
    } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({ error: 'Error updating client' });
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
