import React,{useCallback,useEffect,useState} from "react";
import {useSearchParams} from "react-router-dom";
import {FaCertificate,FaCheckCircle,FaClock,FaExclamationTriangle,FaFlask,FaPlus,FaSave} from "react-icons/fa";
import {toast} from "sonner";
import useStore from "../store";
import {
  completeMetrologyInspection,configureMetrologyAsset,createMetrologyInspection,
  generateMetrologyCertificate,getMetrologyAssets,getMetrologyInspection,
  getMetrologyOverview,saveMetrologyInspection,
} from "../services/metrologyServices.js";
import {downloadAttachment} from "../services/serviceCenterServices.js";
import {downloadBlob} from "../libs/downloadBlob.js";

const emptyMeasurement={measurement_point:"",reference_value:"",measured_value:"",tolerance_min:"",tolerance_max:"",unit:"L"};
const emptyInspection={asset_id:"",work_order_id:"",inspection_type:"verification",standard_reference:"",procedure_reference:"",temperature:"",humidity:"",notes:"",corrective_action:"",installation_check:false,label_check:false,integrity_check:false,measurements:[{...emptyMeasurement}]};
const date=value=>value?new Date(value).toLocaleDateString("hr-HR"):"Nije postavljeno";

const Metrology=()=>{
  const permissions=useStore(state=>state.permissions);
  const canManage=permissions.includes("manage_metrology_inspections");
  const canApprove=permissions.includes("approve_metrology_inspections");
  const canCertificate=permissions.includes("generate_metrology_certificates");
  const [searchParams]=useSearchParams();
  const [overview,setOverview]=useState({summary:{},dueAssets:[],inspections:[]});
  const [assets,setAssets]=useState([]);
  const [selected,setSelected]=useState(null);
  const [form,setForm]=useState(emptyInspection);
  const [showNew,setShowNew]=useState(false);
  const [tab,setTab]=useState("deadlines");
  const [loading,setLoading]=useState(true);

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const [overviewResponse,assetsResponse]=await Promise.all([getMetrologyOverview(),getMetrologyAssets()]);
      setOverview(overviewResponse.data);
      setAssets(assetsResponse.data||[]);
    }catch{toast.error("Mjeriteljski centar nije moguće učitati.");}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{
    const assetId=searchParams.get("asset");
    if(assetId){
      setForm(current=>({...current,asset_id:assetId,work_order_id:searchParams.get("workOrder")||""}));
      setShowNew(true);
    }
  },[searchParams]);

  const openInspection=async id=>{
    try{
      const response=await getMetrologyInspection(id);
      setSelected(response.data);
      setForm({...response.data,measurements:response.data.measurements?.length?response.data.measurements:[{...emptyMeasurement}]});
    }catch{toast.error("Pregled nije moguće učitati.");}
  };
  const createInspection=async event=>{
    event.preventDefault();
    try{
      const response=await createMetrologyInspection(form);
      setShowNew(false);
      await load();
      await openInspection(response.data.id);
      toast.success("Mjeriteljski pregled je kreiran.");
    }catch(error){toast.error(error.response?.data?.error||"Pregled nije moguće kreirati.");}
  };
  const save=async()=>{
    try{
      await saveMetrologyInspection(selected.id,form);
      toast.success("Mjerenja su spremljena.");
      await openInspection(selected.id);
      await load();
    }catch(error){toast.error(error.response?.data?.error||"Mjerenja nije moguće spremiti.");}
  };
  const finish=async approve=>{
    try{
      await saveMetrologyInspection(selected.id,form);
      await completeMetrologyInspection(selected.id,{approve});
      toast.success(approve?"Pregled je odobren.":"Pregled je završen.");
      await openInspection(selected.id);
      await load();
    }catch(error){toast.error(error.response?.data?.error||"Pregled nije moguće završiti.");}
  };
  const certificate=async()=>{
    try{
      const response=await generateMetrologyCertificate(selected.id);
      const file=await downloadAttachment(response.data.id);
      downloadBlob(file.data,response.data.file_name);
      toast.success("Certifikat je generiran i arhiviran.");
      await openInspection(selected.id);
    }catch(error){toast.error(error.response?.data?.error||"Certifikat nije moguće generirati.");}
  };
  const configure=async(asset,enabled)=>{
    try{
      await configureMetrologyAsset(asset.id,{metrology_required:enabled,verification_interval_months:asset.verification_interval_months,metrology_standard:asset.metrology_standard});
      await load();
      toast.success("Mjeriteljske postavke opreme su spremljene.");
    }catch{toast.error("Postavke nije moguće spremiti.");}
  };
  if(loading)return <div className="min-h-screen bg-slate-100 pt-28 text-center text-slate-500">Učitavanje mjeriteljstva…</div>;
  if(selected)return <Editor inspection={selected} form={form} setForm={setForm} onBack={()=>setSelected(null)} onSave={save} onFinish={finish} onCertificate={certificate} canManage={canManage} canApprove={canApprove} canCertificate={canCertificate}/>;
  const summary=overview.summary||{};
  return <div className="min-h-screen bg-slate-100 px-4 pb-10 pt-24 sm:ml-16 sm:px-7"><div className="mx-auto max-w-7xl">
    <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-sm font-bold uppercase tracking-widest text-indigo-600">Mjeriteljstvo</p><h1 className="text-3xl font-bold text-slate-900">Centar ovjera i kalibracija</h1><p className="mt-2 text-slate-500">Rokovi, digitalna mjerenja, prolaz/pad i certifikati.</p></div>
      {canManage&&<button onClick={()=>{setForm(emptyInspection);setShowNew(true);}} className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white"><FaPlus className="mr-2 inline"/>Novi pregled</button>}
    </header>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Stat label="Mjeriteljska oprema" value={summary.required_assets||0} icon={FaFlask} tone="text-indigo-700 bg-indigo-100"/>
      <Stat label="Istječe u 30 dana" value={summary.due_30_days||0} icon={FaClock} tone="text-amber-700 bg-amber-100"/>
      <Stat label="Isteklo" value={summary.expired||0} icon={FaExclamationTriangle} tone="text-red-700 bg-red-100"/>
      <Stat label="Otvoreni pregledi" value={summary.open_inspections||0} icon={FaSave} tone="text-sky-700 bg-sky-100"/>
      <Stat label="Ne zadovoljava" value={summary.failed||0} icon={FaExclamationTriangle} tone="text-rose-700 bg-rose-100"/>
    </div>
    <nav className="my-6 flex flex-wrap gap-2 rounded-xl bg-white p-2 shadow-sm">{[["deadlines","Rokovi"],["inspections","Pregledi"],["assets","Postavke opreme"]].map(([value,label])=><button key={value} onClick={()=>setTab(value)} className={`rounded-lg px-4 py-2 font-semibold ${tab===value?"bg-indigo-600 text-white":"text-slate-600"}`}>{label}</button>)}</nav>
    {tab==="deadlines"&&<Table headers={["Klijent / stanica","Oprema","Službena oznaka","Istek","Preostalo"]} rows={(overview.dueAssets||[]).map(asset=>[`${asset.client_name} · ${asset.station_name||"—"}`,asset.name,asset.official_mark||"—",date(asset.calibration_expires_at),asset.days_remaining==null?"—":asset.days_remaining<0?`${Math.abs(asset.days_remaining)} dana kasni`:`${asset.days_remaining} dana`])}/>}
    {tab==="inspections"&&<Table headers={["Broj","Oprema","Datum","Status","Rezultat","Mjerenja"]} rows={(overview.inspections||[]).map(item=>({id:item.id,cells:[item.inspection_number,item.asset_name,date(item.inspected_at||item.created_at),item.status,item.result,`${item.measurement_count} (${item.failed_measurements} ne prolazi)`]}))} onClick={openInspection}/>}
    {tab==="assets"&&<div className="grid gap-4 lg:grid-cols-2">{assets.map(asset=><AssetConfig key={asset.id} asset={asset} disabled={!canManage} onSave={configure}/>)}</div>}
  </div>{showNew&&<NewModal form={form} setForm={setForm} assets={assets} onSubmit={createInspection} onClose={()=>setShowNew(false)}/>}</div>;
};

const Editor=({inspection,form,setForm,onBack,onSave,onFinish,onCertificate,canManage,canApprove,canCertificate})=>{
  const locked=["completed","approved","cancelled"].includes(inspection.status);
  const update=(index,key,value)=>setForm(current=>({...current,measurements:current.measurements.map((item,i)=>i===index?{...item,[key]:value}:item)}));
  const add=()=>setForm(current=>({...current,measurements:[...current.measurements,{...emptyMeasurement}]}));
  const remove=index=>setForm(current=>({...current,measurements:current.measurements.filter((_,i)=>i!==index)}));
  return <div className="min-h-screen bg-slate-100 px-4 pb-10 pt-24 sm:ml-16 sm:px-7"><div className="mx-auto max-w-7xl">
    <button onClick={onBack} className="mb-4 text-sm font-bold text-indigo-600">← Povratak u mjeriteljski centar</button>
    <div className="rounded-2xl bg-slate-900 p-6 text-white"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-indigo-300">{inspection.inspection_number}</p><h1 className="text-2xl font-bold">{inspection.asset_name}</h1><p className="mt-1 text-slate-300">{inspection.client_name} · {inspection.station_name}</p></div><span className={`rounded-full px-4 py-2 font-bold ${inspection.result==="passed"?"bg-emerald-500":inspection.result==="failed"?"bg-rose-500":"bg-slate-600"}`}>{inspection.result}</span></div></div>
    <div className="mt-5 grid gap-5 lg:grid-cols-3">
      <section className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-bold">Uvjeti i provjere</h2>
        <Field label="Norma"><input disabled={locked} value={form.standard_reference||""} onChange={e=>setForm({...form,standard_reference:e.target.value})}/></Field>
        <Field label="Postupak"><input disabled={locked} value={form.procedure_reference||""} onChange={e=>setForm({...form,procedure_reference:e.target.value})}/></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Temperatura °C"><input disabled={locked} type="number" value={form.temperature||""} onChange={e=>setForm({...form,temperature:e.target.value})}/></Field><Field label="Vlaga %"><input disabled={locked} type="number" value={form.humidity||""} onChange={e=>setForm({...form,humidity:e.target.value})}/></Field></div>
        {[["installation_check","Ispravna ugradnja"],["label_check","Ispravne oznake"],["integrity_check","Integritet opreme"]].map(([key,label])=><label key={key} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><input disabled={locked} type="checkbox" checked={Boolean(form[key])} onChange={e=>setForm({...form,[key]:e.target.checked})}/><span className="font-semibold">{label}</span></label>)}
        <Field label="Napomena"><textarea disabled={locked} rows={4} value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})}/></Field>
      </section>
      <section className="rounded-2xl border bg-white p-5 shadow-sm lg:col-span-2"><div className="mb-4 flex justify-between"><h2 className="font-bold">Mjerna mjesta</h2>{canManage&&!locked&&<button onClick={add} className="text-sm font-bold text-indigo-600"><FaPlus className="mr-1 inline"/>Dodaj mjerenje</button>}</div>
        <div className="space-y-3">{(form.measurements||[]).map((item,index)=><div key={index} className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-7"><input disabled={locked} placeholder="Mjerna točka" value={item.measurement_point||""} onChange={e=>update(index,"measurement_point",e.target.value)} className="rounded-lg border p-2 sm:col-span-2"/>{["reference_value","measured_value","tolerance_min","tolerance_max","unit"].map(key=><input key={key} disabled={locked} type={key==="unit"?"text":"number"} step="0.000001" placeholder={{reference_value:"Referenca",measured_value:"Izmjereno",tolerance_min:"Tol. min",tolerance_max:"Tol. max",unit:"Jedinica"}[key]} value={item[key]??""} onChange={e=>update(index,key,e.target.value)} className="rounded-lg border p-2"/>)}{!locked&&form.measurements.length>1&&<button onClick={()=>remove(index)} className="text-xs font-bold text-rose-600 sm:col-span-7">Ukloni</button>}</div>)}</div>
      </section>
    </div>
    <div className="mt-5 flex flex-wrap justify-end gap-3">{canManage&&!locked&&<button onClick={onSave} className="rounded-xl border border-indigo-300 px-5 py-3 font-bold text-indigo-700"><FaSave className="mr-2 inline"/>Spremi nacrt</button>}{canApprove&&!locked&&<><button onClick={()=>onFinish(false)} className="rounded-xl bg-slate-800 px-5 py-3 font-bold text-white"><FaCheckCircle className="mr-2 inline"/>Završi</button><button onClick={()=>onFinish(true)} className="rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white">Završi i odobri</button></>}{canCertificate&&["completed","approved"].includes(inspection.status)&&<button onClick={onCertificate} className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white"><FaCertificate className="mr-2 inline"/>Generiraj certifikat</button>}</div>
  </div></div>;
};

const NewModal=({form,setForm,assets,onSubmit,onClose})=><div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={onSubmit} className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl"><div className="border-b p-6"><h2 className="text-xl font-bold">Novi mjeriteljski pregled</h2></div><div className="grid gap-4 p-6 sm:grid-cols-2"><Field label="Oprema *"><select required value={form.asset_id} onChange={e=>setForm({...form,asset_id:e.target.value})}><option value="">Odaberite opremu</option>{assets.map(asset=><option key={asset.id} value={asset.id}>{asset.client_name} · {asset.station_name} · {asset.name}</option>)}</select></Field><Field label="Vrsta pregleda"><select value={form.inspection_type} onChange={e=>setForm({...form,inspection_type:e.target.value})}><option value="verification">Ovjera</option><option value="calibration">Kalibracija</option><option value="inspection">Inspekcija</option></select></Field><Field label="Norma"><input value={form.standard_reference} onChange={e=>setForm({...form,standard_reference:e.target.value})}/></Field><Field label="ID radnog naloga"><input type="number" value={form.work_order_id} onChange={e=>setForm({...form,work_order_id:e.target.value})}/></Field></div><div className="flex justify-end gap-3 border-t p-6"><button type="button" onClick={onClose}>Odustani</button><button className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white">Kreiraj pregled</button></div></form></div>;
const AssetConfig=({asset,disabled,onSave})=>{
  const [config,setConfig]=useState({metrology_required:asset.metrology_required,verification_interval_months:asset.verification_interval_months||12,metrology_standard:asset.metrology_standard||"",metrology_auto_order:asset.metrology_auto_order!==false,metrology_lead_days:asset.metrology_lead_days??30});
  return <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><h3 className="font-bold text-slate-900">{asset.name}</h3><p className="text-sm text-slate-500">{asset.client_name} · {asset.station_name}</p></div><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={config.metrology_required} onChange={event=>setConfig({...config,metrology_required:event.target.checked})} disabled={disabled}/> Mjeriteljska oprema</label></div><div className="mt-4 grid grid-cols-2 gap-3"><label className="text-xs font-bold text-slate-500">Interval mjeseci<input disabled={disabled} type="number" min="1" value={config.verification_interval_months} onChange={event=>setConfig({...config,verification_interval_months:event.target.value})} className="mt-1 w-full rounded-lg border p-2"/></label><label className="text-xs font-bold text-slate-500">Najava naloga (dana)<input disabled={disabled} type="number" min="0" value={config.metrology_lead_days} onChange={event=>setConfig({...config,metrology_lead_days:event.target.value})} className="mt-1 w-full rounded-lg border p-2"/></label><label className="col-span-2 text-xs font-bold text-slate-500">Norma<input disabled={disabled} value={config.metrology_standard} onChange={event=>setConfig({...config,metrology_standard:event.target.value})} className="mt-1 w-full rounded-lg border p-2"/></label><label className="col-span-2 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm font-bold"><input disabled={disabled} type="checkbox" checked={config.metrology_auto_order} onChange={event=>setConfig({...config,metrology_auto_order:event.target.checked})}/> Automatski kreiraj radni nalog prije isteka</label></div>{!disabled&&<button onClick={()=>onSave({...asset,...config},config.metrology_required)} className="mt-3 w-full rounded-xl bg-slate-900 py-2 font-bold text-white">Spremi postavke</button>}</div>;
};
const Stat=({label,value,icon:Icon,tone})=><div className="rounded-2xl border bg-white p-5 shadow-sm"><span className={`inline-flex rounded-xl p-3 ${tone}`}><Icon/></span><div className="mt-3 text-3xl font-bold">{value}</div><div className="text-sm text-slate-500">{label}</div></div>;
const Field=({label,children})=><label><span className="mb-1 block text-xs font-bold text-slate-500">{label}</span>{React.cloneElement(children,{className:`w-full rounded-xl border p-3 disabled:bg-slate-100 ${children.props.className||""}`})}</label>;
const Table=({headers,rows,onClick})=><div className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr>{headers.map(item=><th key={item} className="px-4 py-3">{item}</th>)}</tr></thead><tbody>{rows.map((row,index)=>{const cells=row.cells||row;return <tr key={row.id||index} onClick={()=>row.id&&onClick?.(row.id)} className={`border-t ${row.id?"cursor-pointer hover:bg-indigo-50":""}`}>{cells.map((cell,i)=><td key={i} className="whitespace-nowrap px-4 py-3">{cell}</td>)}</tr>;})}</tbody></table></div>{!rows.length&&<div className="p-12 text-center text-slate-400">Nema podataka.</div>}</div>;
export default Metrology;
