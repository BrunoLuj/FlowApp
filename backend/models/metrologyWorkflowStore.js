import { pool } from '../libs/database.js';
import { initialWorkflow, workflowError } from '../libs/metrologyWorkflowRules.js';

let schema;
export function ensureWorkflowSchema() {
    if (!schema) schema=pool.query('CREATE TABLE IF NOT EXISTS metrology_case_workflow (case_id BIGINT PRIMARY KEY, payload TEXT NOT NULL)').catch(error=>{schema=null;throw error;});
    return schema;
}
export async function readWorkflow(caseId) {
    await ensureWorkflowSchema();
    const result=await pool.query('SELECT payload FROM metrology_case_workflow WHERE case_id=$1',[caseId]);
    return result.rows[0] ? JSON.parse(result.rows[0].payload) : initialWorkflow();
}
export async function mutateWorkflow(caseId,user,change) {
    await ensureWorkflowSchema();
    const connection=await pool.connect();
    try {
        await connection.query('BEGIN');
        const record=(await connection.query(`SELECT * FROM metrology_cases WHERE id=$1 ${user.clientId?'AND client_id=$2':''} FOR UPDATE`,user.clientId?[caseId,user.clientId]:[caseId])).rows[0];
        if (!record) throw Object.assign(new Error('Predmet nije pronađen.'),{status:404});
        const existing=(await connection.query('SELECT payload FROM metrology_case_workflow WHERE case_id=$1',[caseId])).rows[0];
        const workflow=existing?JSON.parse(existing.payload):initialWorkflow();
        if (workflow.closed_at) throw workflowError('Predmet je zaključen. Dokumentacija ostaje dostupna za preuzimanje.');
        await change(workflow,record,connection);
        if(existing) await connection.query('UPDATE metrology_case_workflow SET payload=$1 WHERE case_id=$2',[JSON.stringify(workflow),caseId]);
        else await connection.query('INSERT INTO metrology_case_workflow (case_id,payload) VALUES ($1,$2)',[caseId,JSON.stringify(workflow)]);
        await connection.query('COMMIT');
        return workflow;
    } catch(error) { await connection.query('ROLLBACK');throw error; }
    finally { connection.release(); }
}
export function addEvent(workflow,user,action,note='') {
    workflow.events.push({at:new Date().toISOString(),user_id:user.userId,action,note});
}
