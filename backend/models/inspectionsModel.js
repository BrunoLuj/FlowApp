import { pool } from "../libs/database.js";

export const addInspections = async (
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
) => {
    const result = await pool.query(
       `INSERT INTO inspection_results (
                project_id, probe, manufacturer, type, official_label,
                reference_results, amn_results, errors,
                temperature, humidity, installation_check,
                label_check, integrity_check, inspection_result
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
        [
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
        ]
    );
    return result.rows[0];
};