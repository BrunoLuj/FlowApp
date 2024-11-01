import * as inspectionsModel from '../models/inspectionsModel.js';

export const addInspections = async (req, res) => {
    const { 
        projectId,
        probe,
        manufacturer,
        type,
        officialLabel,
        referenceResults,
        amnResults,
        errors,
        temperature,
        humidity,
        installationCheck,
        labelCheck,
        integrityCheck,
        inspectionResult
    } = req.body;

    console.log(req.body)

    try {
        const newInspections= await inspectionsModel.addInspections(
            projectId,
            probe,
            manufacturer,
            type,
            officialLabel,
            referenceResults,
            amnResults,
            errors,
            temperature,
            humidity,
            installationCheck,
            labelCheck,
            integrityCheck,
            inspectionResult,
        );
        console.log("New",newInspections);
        res.status(201).json(newInspections);
    } catch (error) {
        console.log("Error", error)
        res.status(500).json({ error: 'Error adding inspections' });
    }
};