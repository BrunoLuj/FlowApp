import { pool } from "../libs/database.js";

export const getAllProjects = async () => {
    const result = await pool.query('SELECT * FROM projects');
    return result.rows;
};

export const createProject = async (name, project_type, status, start_date, end_date, main_person ) => {
    const result = await pool.query(
        'INSERT INTO projects (name, project_type, status, start_date, end_date, main_person) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [name, project_type, status, start_date, end_date ]
    );
    return result.rows[0];
};

export const updateProject = async (id, name, project_type, status, start_date, end_date, main_person ) => {
    try {
        const result = await pool.query('UPDATE projects SET name = $1, project_type = $2, status = $3, end_date = $4, start_date = $5, main_person = $6 WHERE id = $7 RETURNING *', 
            [name, project_type, status, end_date , start_date, main_person, id]);
        return result.rows[0];
    } catch (error) {
        console.error('Error updating project:', error); // Prikaz greške
        throw error;
    }
};

export const deleteProject = async (id) => {
    const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
};