import { pool } from "../libs/database.js";

export const getAllProjects = async () => {
    const result = await pool.query('SELECT * FROM projects');
    return result.rows;
};

export const createProject = async (name, project_type, status, due_date) => {
    const result = await pool.query(
        'INSERT INTO projects (name, project_type, status, due_date) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, project_type, status, due_date]
    );
    return result.rows[0];
};

export const updateProject = async (id, name, project_type, status, due_date) => {
    const result = await pool.query('UPDATE projects SET name = $1, project_type = $2, status = $3, due_date = $4 WHERE id = $5 RETURNING *', [name, project_type, status, due_date, id]);
    return result.rows[0];
};

export const deleteProject = async (id) => {
    const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
};