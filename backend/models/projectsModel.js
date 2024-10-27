import { pool } from "../libs/database.js";

export const getAllProjects = async () => {
    const result = await pool.query('SELECT * FROM projects');
    return result.rows;
};

export const createProject = async (name, description) => {
    const result = await pool.query('INSERT INTO projects (name, description) VALUES ($1, $2) RETURNING *', [name, description]);
    return result.rows[0];
};

export const updateProject = async (id, name, description) => {
    const result = await pool.query('UPDATE projects SET name = $1, description = $2 WHERE id = $3 RETURNING *', [name, description, id]);
    return result.rows[0];
};

export const deleteProject = async (id) => {
    const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
};