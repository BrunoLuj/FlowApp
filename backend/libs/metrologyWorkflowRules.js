import crypto from 'node:crypto';

export const workflowError = message => Object.assign(new Error(message), { status: 409 });
export const initialWorkflow = () => ({ version: 1, events: [], files: [], request: {}, preparation: {} });
export function fingerprint(record) {
    const ignored = new Set(['id','case_id','case_item_id','sequence_no','sort_order','status','created_at','updated_at','approval_date','approved_by','next_verification_date','documents','workflow','rules','inspectors','source_id']);
    const normalize = value => Array.isArray(value) ? value.map(normalize) : value && typeof value === 'object'
        ? Object.fromEntries(Object.keys(value).sort().filter(key=>!ignored.has(key)).map(key=>[key,normalize(value[key])])) : value;
    const fields = ['service_type','inspection_kind','client_id','station_id','location_text','inspection_date','work_started_at','work_finished_at','technical_manager_id','request_description','items','standards'];
    return crypto.createHash('sha256').update(JSON.stringify(normalize(Object.fromEntries(fields.map(key=>[key,record[key]??null]))))).digest('hex');
}
export function requirePreparation(record, workflow) {
    if (!workflow.request.returned_at) throw workflowError('Najprije priložite vraćeni zahtjev klijenta.');
    if (!record.items?.length) throw workflowError('Odaberite najmanje jedno mjerilo.');
    if (!record.inspectors?.length) throw workflowError('Dodijelite inspektora prije pripreme terena.');
    if (!record.standards?.length) throw workflowError('Unesite korištene etalone.');
    if (!workflow.preparation.risk || !workflow.preparation.review) throw workflowError('Ispunite procjenu rizika i preispitivanje zahtjeva.');
}
export function requireMeasurements(record) {
    if (!record.items?.length) throw workflowError('Predmet nema mjerila.');
    if (!record.inspection_date || !record.technical_manager_id) throw workflowError('Unesite datum inspekcije i odgovornu osobu.');
    const required = {
        amn: { comparison: ['reference_mm','amn_mm','gdg_mm'] },
        volumeter: { flow_test: ['qmin_l_min','qmid_l_min','qmax_l_min','set_volume_l','reference_qmin_l','reference_qmid_l','reference_qmax_l','error_qmin_percent','error_qmid_percent','error_qmax_percent'] },
        dipstick: { scale_point: ['standard_reading_mm','equipment_reading_mm','mpe_mm'] },
        tank: { volumetric_fill: ['cumulative_standard_volume','height_mm','standard_fluid_temperature','tank_fluid_temperature','flow_l_min'], mobile_meter_check: ['before_standard_l','before_meter_l','before_difference_l','after_standard_l','after_meter_l','after_difference_l'] },
    }[record.service_type];
    for (const item of record.items) {
        if (!item.notes?.trim()) throw workflowError('Za svako mjerilo unesite zaključak inspektora.');
        const measurements = item.measurements || [];
        const primary = {amn:'comparison',volumeter:'flow_test',dipstick:'scale_point',tank:'volumetric_fill'}[record.service_type];
        if (!measurements.some(row=>row.measurement_group===primary)) throw workflowError('Nedostaju rezultati mjerenja za mjerilo.');
        if (record.service_type==='amn' && measurements.filter(row=>row.measurement_group==='comparison').length!==3) throw workflowError('AMN zahtijeva tri mjerenja po sondi.');
        for (const row of measurements) for (const key of required?.[row.measurement_group]||[]) {
            const value=row.values?.[key];
            if (value===null || value===undefined || String(value).trim()==='' || !Number.isFinite(Number(value))) throw workflowError(`Dopunite mjerenja (${key}) za ${item.serial_number||item.name||'mjerilo'}.`);
        }
        if ((item.checks||[]).some(check=>check.passed===null || check.passed===undefined)) throw workflowError('Potvrdite sve provjere mjerila.');
    }
}
export function requireClose(record, workflow) {
    if (record.status!=='approved') throw workflowError('Odgovorna osoba prvo mora odobriti predmet.');
    if (!workflow.final_package || workflow.final_package.source_hash!==fingerprint(record)) throw workflowError('Generirajte završni paket za aktualne podatke predmeta.');
    if (!workflow.request.returned_at) throw workflowError('Nedostaje vraćeni zahtjev klijenta.');
}
