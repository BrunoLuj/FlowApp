import { pool } from "../libs/database.js";

export const getAllProjects = async () => {
    const result = await pool.query('SELECT * FROM projects');
    return result.rows;
};

export const createProject = async (name, project_type, status, start_date, end_date, responsible_person,service_executors, description, client_id ) => {
    const result = await pool.query(
        'INSERT INTO projects (name, project_type, status, start_date, end_date, responsible_person, service_executors, description, client_id ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
        [name, project_type, status, start_date, end_date, responsible_person, service_executors, description, client_id]
    );
    return result.rows[0];
};

export const updateProject = async (id, name, project_type, status, start_date, end_date, responsible_person, service_executors, description, client_id ) => {
    try {
        const result = await pool.query('UPDATE projects SET name = $1, project_type = $2, status = $3, end_date = $4, start_date = $5, responsible_person = $6, service_executors = $7, description = $8, client_id = $9 WHERE id = $10 RETURNING *', 
            [name, project_type, status, end_date , start_date, responsible_person, service_executors, description, client_id, id]);
        return result.rows[0];
    } catch (error) {
        console.log(error.error);
        console.error('Error updating project:', error); // Prikaz greške
        throw error;
    }
};

export const deleteProject = async (id) => {
    const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
};