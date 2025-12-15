import { pool } from "../libs/database.js";

/*export const getAllProjects = async () => {
    const result = await pool.query('SELECT * FROM projects');
    return result.rows;
};*/

export const getAllProjects = async () => {
    const result = await pool.query(`
        SELECT 
            p.*, 
            c.id AS client_id, 
            c.company_name AS client_name
        FROM projects p
        JOIN clients c ON p.client_id = c.id
    `);
    return result.rows;
};

/*export const createProject = async (name, project_type, status, start_date, end_date, responsible_person,service_executors, description, client_id ) => {
    const result = await pool.query(
        'INSERT INTO projects (name, project_type, status, start_date, end_date, responsible_person, service_executors, description, client_id ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
        [name, project_type, status, start_date, end_date, responsible_person, service_executors, description, client_id]
    );
    return result.rows[0];
};*/

export const createProject = async (client_id, name, address, city, gps_lat, gps_lng, active ) => {
    const result = await pool.query(
        'INSERT INTO projects (client_id, name, address, city, gps_lat, gps_lng, active, sttn ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [client_id, name, address, city, gps_lat, gps_lng, active]
    );
    return result.rows[0];
};

export const updateProject = async (client_id, name, address, city, gps_lat, gps_lng, active, sttn, id ) => {
    try {
        const result = await pool.query('UPDATE projects SET client_id = $1, name = $2, address = $3, city = $4, gps_lat = $5, gps_lng = $6, active = $7, sttn = $8 WHERE id = $9 RETURNING *', 
            [client_id, name, address, city, gps_lat, gps_lng, active, sttn, id]);
        return result.rows[0];
    } catch (error) {
        console.log(error.error);
        console.error('Error updating project:', error);
        throw error;
    }
};

export const deleteProject = async (id) => {
    const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
};

export const getActiveProjects = async () => {
  const result = await pool.query("SELECT * FROM projects WHERE status = 'Active'");
  return result.rows;
};