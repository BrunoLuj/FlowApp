import React,{useCallback,useEffect,useState} from "react";
import {useSearchParams} from "react-router-dom";
import {FaCertificate,FaClipboardList,FaFileAlt,FaPlus,FaSave,FaStamp} from "react-icons/fa";
import {toast} from "sonner";
import useStore from "../store";
import {
  completeMetrologyCase,createMetrologyCase,generateMetrologyCaseDocument,
  getMetrologyCase,getMetrologyCaseOptions,getMetrologyCases,saveMetrologyCase,
} from "../services/metrologyCaseServices.js";
import {downloadAttachment} from "../services/serviceCenterServices.js";
import {downloadBlob} from "../libs/downloadBlob.js";

const serviceLabels={volumeter:"Volumetri",dipstick:"Mjerna letva",tank:"Rezervoar",amn:"AMN"};
const statusLabels={request:"Zahtjev",work_order:"Radni nalog",measurement:"Mjerenje",completed:"Završeno",approved:"Odobreno",cancelled:"Otkazano"};
const emptyCase={client_id:"",station_id:"",service_type:"volumeter",inspection_kind:"regular",requested_by_name:"",contact_phone:"",request_description:"",attachments_description:"",location_text:""};
const date=value=>value?new Date(value).toLocaleDateString("hr-HR"):"—";

const MetrologyCases=()=>{
  const permissions=useStore(state=>state.permissions);
  const [searchParams]=useSearchParams();
  const canManage=permissions.includes("manage_metrology_cases");
  const canGenerate=permissions.includes("generate_metrology_case_documents");
  const [cases,setCases]=useState([]);
  const [options,setOptions]=useState({clients:[],stations:[],users:[],probes:[],volumeters:[],tanks:[],dipsticks:[],rules:{}});
  const [selected,setSelected]=useState(null);
  const [form,setForm]=useState(emptyCase);
  const [showNew,setShowNew]=useState(false);
  const [loading,setLoading]=useState(true);
  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const [caseResponse,optionResponse]=await Promise.all([getMetrologyCases(),getMetrologyCaseOptions()]);
      setCases(caseResponse.data||[]);
      setOptions(optionResponse.data||{});
    }catch{toast.error("Predmete inspekcije nije moguće učitati.");}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{
    const station=searchParams.get("station");
    const client=searchParams.get("client");
    const rawType=searchParams.get("type");
    const type={dispenser:"volumeter",volumeter:"volumeter",tank:"tank",amn_probe:"amn",dipstick:"dipstick"}[rawType];
    if(station&&client&&type){
      setForm(current=>({...current,station_id:station,client_id:client,service_type:type}));
      setShowNew(true);
    }
  },[searchParams]);
  const open=async id=>{
    try{const response=await getMetrologyCase(id);setSelected(response.data);setForm({...response.data,inspector_ids:(response.data.inspectors||[]).map(item=>item.id)});}
    catch{toast.error("Predmet nije moguće učitati.");}
  };
  const create=async event=>{
    event.preventDefault();
    try{const response=await createMetrologyCase(form);setShowNew(false);await load();await open(response.data.id);toast.success("Zahtjev za inspekciju je otvoren.");}
    catch(error){toast.error(error.response?.data?.error||"Zahtjev nije moguće kreirati.");}
  };
  if(loading)return <div className="min-h-screen bg-slate-100 pt-28 text-center text-slate-500">Učitavanje predmeta…</div>;
  if(selected)return <CaseEditor record={selected} form={form} setForm={setForm} options={options} canManage={canManage} canGenerate={canGenerate} onBack={()=>{setSelected(null);load();}} onReload={()=>open(selected.id)}/>;
  return <div className="min-h-screen bg-slate-100 px-4 pb-10 pt-24 sm:ml-16 sm:px-7"><div className="mx-auto max-w-7xl">
    <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-bold uppercase tracking-widest text-indigo-600">Zakonski workflow</p><h1 className="text-3xl font-bold">Predmeti mjeriteljske inspekcije</h1><p className="mt-2 text-slate-500">Zahtjev → radni nalog → mjerenje → izvještaj → certifikati.</p></div>{canManage&&<button onClick={()=>{setForm(emptyCase);setShowNew(true);}} className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white"><FaPlus className="mr-2 inline"/>Novi zahtjev</button>}</header>
    <div className="grid gap-4 lg:grid-cols-3">{cases.map(item=><button key={item.id} onClick={()=>open(item.id)} className="rounded-2xl border bg-white p-5 text-left shadow-sm hover:border-indigo-300"><div className="flex justify-between gap-3"><span className="text-xs font-bold uppercase text-indigo-600">{serviceLabels[item.service_type]}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{statusLabels[item.status]}</span></div><h2 className="mt-2 text-lg font-bold">{item.case_number}</h2><p className="text-sm text-slate-500">{item.company_name} · {item.station_name||"bez stanice"}</p><div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><Badge label="Mjerila" value={item.item_count}/><Badge label="Dokumenti" value={item.document_count}/><Badge label="Zahtjev" value={date(item.request_date)}/></div></button>)}</div>
    {!cases.length&&<div className="rounded-2xl bg-white p-12 text-center text-slate-400">Još nema predmeta inspekcije.</div>}
  </div>{showNew&&<NewCase form={form} setForm={setForm} options={options} onSubmit={create} onClose={()=>setShowNew(false)}/>}</div>;
};

const CaseEditor=({record,form,setForm,options,canManage,canGenerate,onBack,onReload})=>{
  const locked=record.status==="approved";
  const sources={volumeter:options.volumeters||[],dipstick:options.dipsticks||[],tank:options.tanks||[],amn:options.probes||[]};
  const addSource=source=>{
    const item=fromSource(record.service_type,source);
    setForm(current=>({...current,items:[...(current.items||[]),item]}));
  };
  const updateItem=(index,key,value)=>setForm(current=>({...current,items:current.items.map((item,i)=>i===index?{...item,[key]:value}:item)}));
  const removeItem=index=>setForm(current=>({...current,items:current.items.filter((_,i)=>i!==index)}));
  const addMeasurement=index=>setForm(current=>({...current,items:current.items.map((item,i)=>i===index?{...item,measurements:[...(item.measurements||[]),measurementTemplate(record.service_type)]}:item)}));
  const updateMeasurement=(itemIndex,measurementIndex,key,value)=>setForm(current=>({...current,items:current.items.map((item,i)=>i===itemIndex?{...item,measurements:item.measurements.map((measurement,m)=>m===measurementIndex?{...measurement,values:{...measurement.values,[key]:value}}:measurement)}:item)}));
  const updateMeasurementPassed=(itemIndex,measurementIndex,value)=>setForm(current=>({...current,items:current.items.map((item,i)=>i===itemIndex?{...item,measurements:item.measurements.map((measurement,m)=>m===measurementIndex?{...measurement,passed:value}:measurement)}:item)}));
  const updateCheck=(itemIndex,checkIndex,value)=>setForm(current=>({...current,items:current.items.map((item,i)=>i===itemIndex?{...item,checks:item.checks.map((check,c)=>c===checkIndex?{...check,passed:value}:check)}:item)}));
  const save=async(status=form.status)=>{
    try{await saveMetrologyCase(record.id,{...form,status});toast.success("Predmet je spremljen.");await onReload();}
    catch(error){toast.error(error.response?.data?.error||"Predmet nije moguće spremiti.");}
  };
  const complete=async()=>{
    try{await saveMetrologyCase(record.id,{...form,status:"measurement"});await completeMetrologyCase(record.id);toast.success("Predmet je odobren i rok verifikacije izračunat.");await onReload();}
    catch(error){toast.error(error.response?.data?.error||"Predmet nije moguće odobriti.");}
  };
  const generate=async type=>{
    try{const response=await generateMetrologyCaseDocument(record.id,type);const file=await downloadAttachment(response.data.id);downloadBlob(file.data,response.data.file_name);toast.success("Dokument je generiran i arhiviran.");await onReload();}
    catch(error){toast.error(error.response?.data?.error||"Dokument nije moguće generirati.");}
  };
  const available=sources[record.service_type].filter(source=>
    Number(source.client_id)===Number(record.client_id)
    && (!record.station_id||Number(source.station_id)===Number(record.station_id))
  );
  return <div className="min-h-screen bg-slate-100 px-4 pb-10 pt-24 sm:ml-16 sm:px-7"><div className="mx-auto max-w-7xl">
    <button onClick={onBack} className="mb-4 font-bold text-indigo-600">← Povratak na predmete</button>
    <div className="rounded-2xl bg-slate-900 p-6 text-white"><div className="flex flex-wrap justify-between gap-4"><div><p className="text-indigo-300">{serviceLabels[record.service_type]}</p><h1 className="text-2xl font-bold">{record.case_number}</h1><p className="text-slate-300">{record.company_name} · {record.station_name}</p></div><div className="text-right"><div className="font-bold">{statusLabels[record.status]}</div><div className={record.result==="passed"?"text-emerald-300":record.result==="failed"?"text-rose-300":"text-slate-300"}>{record.result}</div></div></div></div>
    <div className="mt-5 grid gap-5 lg:grid-cols-3"><section className="space-y-3 rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-bold">Workflow i podaci</h2><Field label="Status"><select disabled={locked} value={form.status} onChange={event=>setForm({...form,status:event.target.value})}><option value="request">Zahtjev</option><option value="work_order">Radni nalog</option><option value="measurement">Mjerenje</option></select></Field><Field label="Početak rada"><input disabled={locked} type="datetime-local" value={localDate(form.work_started_at)} onChange={event=>setForm({...form,work_started_at:event.target.value})}/></Field><Field label="Završetak rada"><input disabled={locked} type="datetime-local" value={localDate(form.work_finished_at)} onChange={event=>setForm({...form,work_finished_at:event.target.value})}/></Field><Field label="Datum inspekcije"><input disabled={locked} type="date" value={form.inspection_date?.slice?.(0,10)||""} onChange={event=>setForm({...form,inspection_date:event.target.value})}/></Field><Field label="Mjesto izvršenja"><input disabled={locked} value={form.location_text||""} onChange={event=>setForm({...form,location_text:event.target.value})}/></Field><Field label="Tehnički rukovoditelj"><select disabled={locked} value={form.technical_manager_id||""} onChange={event=>setForm({...form,technical_manager_id:event.target.value})}><option value="">Odaberite</option>{options.users.map(user=><option key={user.id} value={user.id}>{user.firstname} {user.lastname}</option>)}</select></Field><Field label="Inspektori"><select multiple disabled={locked} value={form.inspector_ids||[]} onChange={event=>setForm({...form,inspector_ids:[...event.target.selectedOptions].map(option=>Number(option.value))})}>{options.users.map(user=><option key={user.id} value={user.id}>{user.firstname} {user.lastname}</option>)}</select></Field></section>
      <section className="rounded-2xl border bg-white p-5 shadow-sm lg:col-span-2"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Mjerila predmeta</h2><p className="text-xs text-slate-500">{ruleHint(record.service_type)}</p></div>{canManage&&!locked&&<select value="" onChange={event=>{const source=available.find(item=>`${item.id}`===event.target.value);if(source)addSource(source);}} className="rounded-xl border p-2"><option value="">+ Dodaj postojeće mjerilo</option>{available.map(source=><option key={source.id} value={source.id}>{source.serial_number} · {source.name}</option>)}</select>}</div>
        <div className="space-y-4">{(form.items||[]).map((item,index)=><ItemEditor key={`${item.source_table}-${item.source_id}-${index}`} serviceType={record.service_type} item={item} index={index} locked={locked} update={updateItem} remove={removeItem} addMeasurement={addMeasurement} updateMeasurement={updateMeasurement} updateMeasurementPassed={updateMeasurementPassed} updateCheck={updateCheck}/>)}</div>{!(form.items||[]).length&&<div className="rounded-xl bg-slate-50 p-8 text-center text-slate-400">Dodajte mjerila koja ulaze u ovu inspekciju.</div>}
      </section>
    </div>
    <section className="mt-5 rounded-2xl border bg-white p-5 shadow-sm"><div className="flex justify-between"><h2 className="font-bold">Korištena mjerna oprema / etaloni</h2>{!locked&&<button onClick={()=>setForm({...form,standards:[...(form.standards||[]),{equipment_name:"",manufacturer:"",serial_number:"",calibration_certificate:"",valid_until:""}]})} className="font-bold text-indigo-600"><FaPlus className="mr-1 inline"/>Dodaj</button>}</div><div className="mt-3 space-y-2">{(form.standards||[]).map((standard,index)=><div key={index} className="grid gap-2 md:grid-cols-5">{["equipment_name","manufacturer","serial_number","calibration_certificate","valid_until"].map(key=><input key={key} disabled={locked} type={key==="valid_until"?"date":"text"} placeholder={{equipment_name:"Oprema",manufacturer:"Proizvođač",serial_number:"Serijski broj",calibration_certificate:"Certifikat",valid_until:"Vrijedi do"}[key]} value={standard[key]||""} onChange={event=>setForm({...form,standards:form.standards.map((item,i)=>i===index?{...item,[key]:event.target.value}:item)})} className="rounded-lg border p-2"/>)}</div>)}</div></section>
    <div className="mt-5 flex flex-wrap justify-end gap-2">{canManage&&!locked&&<><button onClick={()=>save()} className="rounded-xl border border-indigo-300 px-4 py-3 font-bold text-indigo-700"><FaSave className="mr-2 inline"/>Spremi</button><button onClick={complete} className="rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white"><FaStamp className="mr-2 inline"/>Odobri predmet</button></>}{canGenerate&&documentButtons(record.status).map(button=><button key={button.type} onClick={()=>generate(button.type)} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white"><button.icon className="mr-2 inline"/>{button.label}</button>)}</div>
    <div className="mt-5 rounded-2xl border bg-white p-5"><h2 className="font-bold">Generirani dokumenti</h2><div className="mt-3 grid gap-2 md:grid-cols-2">{(record.documents||[]).map(document=><div key={document.id} className="rounded-xl bg-slate-50 p-3 text-sm"><b>{document.document_number}</b><br/><span className="text-slate-500">{document.document_type} · v{document.version_no}</span></div>)}</div></div>
  </div></div>;
};

const ItemEditor=({serviceType,item,index,locked,update,remove,addMeasurement,updateMeasurement,updateMeasurementPassed,updateCheck})=><div className="rounded-xl border border-slate-200 p-4"><div className="flex justify-between"><div><b>{item.serial_number||item.apparatus_serial_number||item.tank_reference}</b><p className="text-xs text-slate-500">{item.manufacturer} · {item.model}</p></div>{!locked&&<button onClick={()=>remove(index)} className="text-sm font-bold text-rose-600">Ukloni</button>}</div><div className="mt-3 grid gap-2 sm:grid-cols-3">{serviceType==="amn"&&<><Mini label="Rezervoar *"><input disabled={locked} value={item.tank_reference||""} onChange={event=>update(index,"tank_reference",event.target.value)}/></Mini><Mini label="Kontroler"><input disabled={locked} value={item.apparatus_serial_number||""} onChange={event=>update(index,"apparatus_serial_number",event.target.value)}/></Mini><Mini label="Gorivo"><input disabled={locked} value={item.fuel_type||""} onChange={event=>update(index,"fuel_type",event.target.value)}/></Mini></>}{serviceType==="volumeter"&&<><Mini label="Serijski broj aparata *"><input disabled={locked} value={item.apparatus_serial_number||""} onChange={event=>update(index,"apparatus_serial_number",event.target.value)}/></Mini><Mini label="Verifikacijska markica"><input disabled={locked} value={item.verification_mark||""} onChange={event=>update(index,"verification_mark",event.target.value)}/></Mini><Mini label="Broj plombe"><input disabled={locked} value={item.seal_number||""} onChange={event=>update(index,"seal_number",event.target.value)}/></Mini></>}{serviceType==="tank"&&<><Mini label="Zapremina L"><input disabled={locked} type="number" value={item.nominal_capacity||""} onChange={event=>update(index,"nominal_capacity",event.target.value)}/></Mini><Mini label="Gorivo"><input disabled={locked} value={item.fuel_type||""} onChange={event=>update(index,"fuel_type",event.target.value)}/></Mini></>}{serviceType==="dipstick"&&<Mini label="Dužina / mjerni opseg"><input disabled={locked} value={item.measurement_range||""} onChange={event=>update(index,"measurement_range",event.target.value)}/></Mini>}</div><div className="mt-3 flex flex-wrap gap-2">{(item.checks||[]).map((check,checkIndex)=><label key={check.check_code} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold"><input disabled={locked} type="checkbox" checked={Boolean(check.passed)} onChange={event=>updateCheck(index,checkIndex,event.target.checked)}/>{check.label}</label>)}</div><div className="mt-3 flex justify-between"><b className="text-sm">Mjerenja</b>{!locked&&<button onClick={()=>addMeasurement(index)} className="text-xs font-bold text-indigo-600">+ Mjerenje</button>}</div><div className="mt-2 space-y-2">{(item.measurements||[]).map((measurement,mIndex)=><MeasurementFields key={mIndex} serviceType={serviceType} measurement={measurement} onChange={(key,value)=>updateMeasurement(index,mIndex,key,value)} onPassed={value=>updateMeasurementPassed(index,mIndex,value)} locked={locked}/>)}</div></div>;

const MeasurementFields=({serviceType,measurement,onChange,onPassed,locked})=>{
  const fields=measurementFields[serviceType];
  return <div className={`grid gap-2 rounded-lg bg-slate-50 p-2 ${serviceType==="tank"?"md:grid-cols-6":"md:grid-cols-6"}`}>{fields.map(field=><input key={field.key} disabled={locked} type={field.type||"number"} step="any" placeholder={field.label} value={measurement.values?.[field.key]??""} onChange={event=>onChange(field.key,event.target.value)} className="rounded-lg border p-2 text-sm"/>)}<label className="flex items-center justify-center gap-2 text-xs font-bold"><input disabled={locked} type="checkbox" checked={measurement.passed!==false} onChange={event=>onPassed(event.target.checked)}/>Zadovoljava</label></div>;
};
const measurementFields={
  amn:[{key:"reference_mm",label:"Etalon mm"},{key:"amn_mm",label:"AMN mm"},{key:"error_mm",label:"Greška mm"},{key:"gdg_mm",label:"GDG mm"}],
  volumeter:[{key:"fuel",label:"Gorivo",type:"text"},{key:"flow",label:"Q l/min"},{key:"set_volume",label:"V1 L"},{key:"reference_volume",label:"V2 L"},{key:"error_percent",label:"Greška %"}],
  dipstick:[{key:"nominal_mm",label:"Nazivno mm"},{key:"measured_mm",label:"Izmjereno mm"},{key:"error_mm",label:"Greška mm"},{key:"tolerance_mm",label:"Tolerancija mm"}],
  tank:[{key:"filling_mass",label:"Masa punjenja"},{key:"cumulative_volume",label:"Kumulativno L"},{key:"height_mm",label:"Visina mm"},{key:"tank_temperature",label:"Temp. rezervoara"},{key:"flow_l_min",label:"Protok l/min"}],
};
const measurementTemplate=serviceType=>({measurement_group:serviceType==="volumeter"?"flow_test":serviceType==="tank"?"volumetric_fill":"comparison",values:{},passed:true});
const fromSource=(serviceType,source)=>({item_type:{volumeter:"volumeter",dipstick:"dipstick",tank:"tank",amn:"amn_probe"}[serviceType],source_table:"equipment_assets",source_id:source.id,name:source.name,manufacturer:source.manufacturer,model:source.model,serial_number:source.serial_number,official_mark:source.official_mark,apparatus_serial_number:serviceType==="volumeter"?(source.parent_serial_number||source.parent_name||""):serviceType==="amn"?(source.metadata?.controller_serial_number||""):"",tank_reference:serviceType==="amn"?(source.parent_serial_number||source.parent_name||""):"",fuel_type:source.fuel_type||"",nominal_capacity:source.metadata?.capacity||"",measurement_range:source.metadata?.measurement_range||"",verification_mark:"",seal_number:"",measurements:[measurementTemplate(serviceType)],checks:defaultChecks(serviceType)});
const defaultChecks=serviceType=>(serviceType==="volumeter"?[["flow","Provjera protoka"],["external","Spoljašnji pregled"],["leak","Provjera curenja"],["display","Pokazivač zapremine"]]:[["installation","Ugradnja"],["labels","Oznake"],["integrity","Integritet"]]).map(([check_code,label])=>({check_code,label,passed:true}));
const ruleHint=type=>({amn:"Jedna sonda pripada jednom konkretnom rezervoaru.",volumeter:"Jedan aparat može sadržavati više volumetara; jedna markica i plomba vrijede za cijeli aparat.",dipstick:"Svaka mjerna letva vodi se kao zasebno mjerilo.",tank:"Svaki rezervoar ima vlastitu volumetrijsku tablicu i period od 6 godina."}[type]);
const documentButtons=status=>[{type:"inspection_request",label:"Zahtjev",icon:FaFileAlt},{type:"inspection_work_order",label:"Radni nalog",icon:FaClipboardList},...(status==="approved"?[{type:"inspection_report",label:"Izvještaj",icon:FaFileAlt},{type:"inspection_certificate",label:"Certifikat inspekcije",icon:FaCertificate},{type:"verification_certificate",label:"Certifikat verifikacije",icon:FaStamp}]:[])];
const NewCase=({form,setForm,options,onSubmit,onClose})=><div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={onSubmit} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white"><div className="border-b p-6"><h2 className="text-xl font-bold">Novi zahtjev za inspekciju</h2></div><div className="grid gap-4 p-6 sm:grid-cols-2"><Field label="Klijent *"><select required value={form.client_id} onChange={event=>setForm({...form,client_id:event.target.value,station_id:""})}><option value="">Odaberite</option>{options.clients.map(client=><option key={client.id} value={client.id}>{client.company_name}</option>)}</select></Field><Field label="Benzinska stanica"><select value={form.station_id} onChange={event=>setForm({...form,station_id:event.target.value})}><option value="">Bez stanice</option>{options.stations.filter(station=>!form.client_id||Number(station.client_id)===Number(form.client_id)).map(station=><option key={station.id} value={station.id}>{station.name}</option>)}</select></Field><Field label="Vrsta mjerila"><select value={form.service_type} onChange={event=>setForm({...form,service_type:event.target.value})}>{Object.entries(serviceLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></Field><Field label="Vrsta inspekcije"><select value={form.inspection_kind} onChange={event=>setForm({...form,inspection_kind:event.target.value})}><option value="regular">Redovna</option><option value="extraordinary">Vanredna</option></select></Field><Field label="Ovlaštena osoba"><input value={form.requested_by_name} onChange={event=>setForm({...form,requested_by_name:event.target.value})}/></Field><Field label="Kontakt"><input value={form.contact_phone} onChange={event=>setForm({...form,contact_phone:event.target.value})}/></Field><label className="sm:col-span-2"><span className="mb-1 block text-xs font-bold text-slate-500">Opis usluge</span><textarea rows={3} value={form.request_description} onChange={event=>setForm({...form,request_description:event.target.value})} className="w-full rounded-xl border p-3"/></label><label className="sm:col-span-2"><span className="mb-1 block text-xs font-bold text-slate-500">Prilozi</span><textarea rows={2} value={form.attachments_description} onChange={event=>setForm({...form,attachments_description:event.target.value})} className="w-full rounded-xl border p-3"/></label></div><div className="flex justify-end gap-3 border-t p-6"><button type="button" onClick={onClose}>Odustani</button><button className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white">Otvori zahtjev</button></div></form></div>;
const Badge=({label,value})=><div className="rounded-lg bg-slate-50 p-2"><b className="block text-base">{value}</b><span className="text-slate-400">{label}</span></div>;
const Field=({label,children})=><label><span className="mb-1 block text-xs font-bold text-slate-500">{label}</span>{React.cloneElement(children,{className:"w-full rounded-xl border p-3 disabled:bg-slate-100"})}</label>;
const Mini=({label,children})=><label><span className="block text-xs font-bold text-slate-500">{label}</span>{React.cloneElement(children,{className:"mt-1 w-full rounded-lg border p-2"})}</label>;
const localDate=value=>value?new Date(value).toISOString().slice(0,16):"";
export default MetrologyCases;
