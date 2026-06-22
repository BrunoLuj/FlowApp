import React,{useCallback,useEffect,useState} from "react";
import {FaCar,FaExclamationTriangle,FaFireExtinguisher,FaPlus,FaTools,FaTrash} from "react-icons/fa";
import {toast} from "sonner";
import useStore from "../store";
import {
  createFleetRecord,createFleetVehicle,deleteFleetRecord,getFleetOptions,
  getFleetOverview,getFleetVehicle,updateFleetVehicle,
} from "../services/fleetServices";
import {downloadAttachment} from "../services/serviceCenterServices.js";
import {downloadBlob} from "../libs/downloadBlob.js";

const emptyVehicle={registration_number:"",make:"",model:"",vehicle_type:"service_van",vin:"",manufacture_year:"",first_registration_date:"",current_odometer:0,fuel_type:"diesel",assigned_user_id:"",status:"active",notes:""};
const emptyRecord={record_type:"registration",title:"Registracija vozila",performed_at:"",due_date:"",odometer:"",next_odometer:"",provider:"",document_number:"",cost:"",currency:"BAM",status:"active",notes:"",file:null};
const labels={registration:"Registracija",insurance:"Osiguranje",technical_inspection:"Tehnički pregled",service:"Servis",fire_extinguisher:"PP aparat",tire:"Gume",road_assistance:"Pomoć na cesti",vignette:"Vinjeta/cestarina",other:"Ostalo"};
const date=value=>value?new Date(value).toLocaleDateString("hr-HR"):"—";

const Fleet=()=>{
  const permissions=useStore(state=>state.permissions);
  const canVehicles=permissions.includes("manage_fleet_vehicles");
  const canRecords=permissions.includes("manage_fleet_records");
  const canDelete=permissions.includes("delete_fleet_records");
  const [data,setData]=useState({stats:{},vehicles:[],dueRecords:[],monthlyCosts:[]});
  const [options,setOptions]=useState({users:[]});
  const [selected,setSelected]=useState(null);
  const [vehicleForm,setVehicleForm]=useState(emptyVehicle);
  const [recordForm,setRecordForm]=useState(emptyRecord);
  const [showVehicle,setShowVehicle]=useState(false);
  const [showRecord,setShowRecord]=useState(false);
  const load=useCallback(async()=>{
    try{const [overview,opts]=await Promise.all([getFleetOverview(),getFleetOptions()]);setData(overview.data);setOptions(opts.data);}
    catch{toast.error("Vozni park nije moguće učitati.");}
  },[]);
  useEffect(()=>{load();},[load]);
  const open=async id=>{try{const response=await getFleetVehicle(id);setSelected(response.data);}catch{toast.error("Vozilo nije moguće učitati.");}};
  const saveVehicle=async event=>{
    event.preventDefault();
    try{
      if(vehicleForm.id)await updateFleetVehicle(vehicleForm.id,vehicleForm);else await createFleetVehicle(vehicleForm);
      setShowVehicle(false);setVehicleForm(emptyVehicle);await load();
      if(vehicleForm.id)await open(vehicleForm.id);
      toast.success("Vozilo je spremljeno.");
    }catch(error){toast.error(error.response?.data?.error||"Vozilo nije moguće spremiti.");}
  };
  const saveRecord=async event=>{
    event.preventDefault();
    try{await createFleetRecord(selected.id,recordForm);setShowRecord(false);setRecordForm(emptyRecord);await open(selected.id);await load();toast.success("Evidencija je dodana.");}
    catch(error){toast.error(error.response?.data?.error||"Evidenciju nije moguće spremiti.");}
  };
  const removeRecord=async id=>{
    if(!window.confirm("Obrisati ovu evidenciju?"))return;
    try{await deleteFleetRecord(id);await open(selected.id);await load();toast.success("Evidencija je obrisana.");}
    catch{toast.error("Evidenciju nije moguće obrisati.");}
  };
  if(selected)return <VehicleDetail vehicle={selected} canVehicles={canVehicles} canRecords={canRecords} canDelete={canDelete} onBack={()=>setSelected(null)} onEdit={()=>{setVehicleForm({...selected,first_registration_date:selected.first_registration_date?.slice(0,10)||""});setShowVehicle(true);}} onRecord={()=>setShowRecord(true)} onDelete={removeRecord} vehicleModal={showVehicle&&<VehicleModal form={vehicleForm} setForm={setVehicleForm} options={options} onSubmit={saveVehicle} onClose={()=>setShowVehicle(false)}/>} recordModal={showRecord&&<RecordModal form={recordForm} setForm={setRecordForm} onSubmit={saveRecord} onClose={()=>setShowRecord(false)}/>}/>;
  return <div className="min-h-screen bg-slate-100 px-4 pb-10 pt-24 sm:ml-16 sm:px-7"><div className="mx-auto max-w-7xl">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-bold uppercase tracking-widest text-indigo-600">Operativni centar</p><h1 className="text-3xl font-bold text-slate-900">Vozni park</h1><p className="mt-2 text-slate-500">Vozila, registracije, servisi, PP aparati, troškovi i rokovi.</p></div>{canVehicles&&<button onClick={()=>{setVehicleForm(emptyVehicle);setShowVehicle(true);}} className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white"><FaPlus className="mr-2 inline"/>Novo vozilo</button>}</div>
    <div className="mt-6 grid gap-4 md:grid-cols-4"><Kpi icon={<FaCar/>} label="Aktivna vozila" value={data.stats.active_vehicles}/><Kpi icon={<FaTools/>} label="Na servisu" value={data.stats.vehicles_in_service}/><Kpi icon={<FaExclamationTriangle/>} label="Isteklo" value={data.stats.overdue_records} danger/><Kpi icon={<FaFireExtinguisher/>} label="Rokovi 30 dana" value={data.stats.due_next_30_days}/></div>
    <div className="mt-6 grid gap-5 lg:grid-cols-3"><section className="lg:col-span-2 rounded-2xl bg-white p-5 shadow-sm"><h2 className="font-bold">Vozila</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{data.vehicles.map(vehicle=><button key={vehicle.id} onClick={()=>open(vehicle.id)} className="rounded-xl border p-4 text-left hover:border-indigo-400"><div className="flex justify-between"><b className="text-lg">{vehicle.registration_number}</b><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{vehicle.status}</span></div><p>{vehicle.make} {vehicle.model}</p><p className="mt-2 text-xs text-slate-500">{vehicle.current_odometer?.toLocaleString()} km · {vehicle.assigned_user_name||"nije dodijeljeno"}</p>{vehicle.next_due_date&&<p className={`mt-2 text-xs font-bold ${vehicle.next_days_remaining<0?"text-rose-600":"text-amber-600"}`}>{vehicle.next_deadline_title}: {date(vehicle.next_due_date)}</p>}</button>)}</div></section>
      <section className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="font-bold">Rokovi do 60 dana</h2><div className="mt-4 space-y-3">{data.dueRecords.map(record=><div key={record.id} className="rounded-xl bg-slate-50 p-3"><b>{record.registration_number} · {labels[record.record_type]}</b><p className="text-sm">{record.title}</p><p className={record.days_remaining<0?"text-rose-600":"text-amber-600"}>{date(record.due_date)} · {record.days_remaining<0?`isteklo ${Math.abs(record.days_remaining)} dana`:`još ${record.days_remaining} dana`}</p></div>)}</div></section></div>
    {showVehicle&&<VehicleModal form={vehicleForm} setForm={setVehicleForm} options={options} onSubmit={saveVehicle} onClose={()=>setShowVehicle(false)}/>}
  </div></div>;
};
const VehicleDetail=({vehicle,canVehicles,canRecords,canDelete,onBack,onEdit,onRecord,onDelete,vehicleModal,recordModal})=><div className="min-h-screen bg-slate-100 px-4 pb-10 pt-24 sm:ml-16 sm:px-7"><div className="mx-auto max-w-7xl"><button onClick={onBack} className="font-bold text-indigo-600">← Vozni park</button><div className="mt-4 rounded-2xl bg-slate-900 p-6 text-white"><div className="flex flex-wrap justify-between gap-3"><div><h1 className="text-3xl font-bold">{vehicle.registration_number}</h1><p>{vehicle.make} {vehicle.model} · {vehicle.current_odometer?.toLocaleString()} km</p></div><div className="flex gap-2">{canVehicles&&<button onClick={onEdit} className="rounded-xl bg-white/10 px-4 py-2">Uredi vozilo</button>}{canRecords&&<button onClick={onRecord} className="rounded-xl bg-indigo-500 px-4 py-2 font-bold"><FaPlus className="mr-2 inline"/>Evidencija</button>}</div></div></div><div className="mt-5 overflow-hidden rounded-2xl bg-white shadow-sm"><table className="w-full text-sm"><thead className="bg-slate-100"><tr><th className="p-3 text-left">Vrsta</th><th className="p-3 text-left">Naziv i opis radova</th><th className="p-3">Izvršeno</th><th className="p-3">Rok</th><th className="p-3">Kilometraža</th><th className="p-3">Trošak</th><th/></tr></thead><tbody>{vehicle.records.map(record=><tr key={record.id} className="border-t"><td className="p-3 font-bold">{labels[record.record_type]}</td><td className="p-3">{record.title}<div className="text-xs text-slate-400">{record.provider} {record.document_number}</div>{record.notes&&<p className="mt-1 max-w-md text-xs text-slate-600">{record.notes}</p>}{record.attachment_id&&<button onClick={async()=>{const file=await downloadAttachment(record.attachment_id);downloadBlob(file.data,record.attachment_file_name);}} className="mt-1 text-xs font-bold text-indigo-600">Preuzmi dokument</button>}</td><td className="p-3 text-center">{date(record.performed_at)}</td><td className={`p-3 text-center ${record.days_remaining<0?"font-bold text-rose-600":""}`}>{date(record.due_date)}</td><td className="p-3 text-center">{record.odometer||"—"}</td><td className="p-3 text-center">{record.cost?`${record.cost} ${record.currency}`:"—"}</td><td>{canDelete&&<button onClick={()=>onDelete(record.id)} className="p-2 text-rose-600"><FaTrash/></button>}</td></tr>)}</tbody></table></div>{vehicleModal}{recordModal}</div></div>;
const VehicleModal=({form,setForm,options,onSubmit,onClose})=><Modal title={form.id?"Uredi vozilo":"Novo vozilo"} onClose={onClose}><form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">{[["registration_number","Registracija *"],["make","Marka *"],["model","Model *"],["vin","VIN"],["manufacture_year","Godina"],["current_odometer","Kilometraža"]].map(([key,label])=><Field key={key} label={label}><input required={label.includes("*")} type={["manufacture_year","current_odometer"].includes(key)?"number":"text"} value={form[key]??""} onChange={e=>setForm({...form,[key]:e.target.value})}/></Field>)}<Field label="Gorivo"><select value={form.fuel_type} onChange={e=>setForm({...form,fuel_type:e.target.value})}><option value="diesel">Dizel</option><option value="petrol">Benzin</option><option value="electric">Električno</option><option value="hybrid">Hibrid</option></select></Field><Field label="Dodijeljeno"><select value={form.assigned_user_id||""} onChange={e=>setForm({...form,assigned_user_id:e.target.value})}><option value="">Nije dodijeljeno</option>{options.users.map(user=><option key={user.id} value={user.id}>{user.firstname} {user.lastname}</option>)}</select></Field><button className="sm:col-span-2 rounded-xl bg-indigo-600 p-3 font-bold text-white">Spremi</button></form></Modal>;
const RecordModal=({form,setForm,onSubmit,onClose})=><Modal title="Nova evidencija vozila" onClose={onClose}><form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2"><Field label="Vrsta *"><select value={form.record_type} onChange={e=>setForm({...form,record_type:e.target.value,title:labels[e.target.value]})}>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></Field><Field label="Naziv *"><input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></Field><Field label="Datum izvršenja"><input type="date" value={form.performed_at} onChange={e=>setForm({...form,performed_at:e.target.value})}/></Field><Field label="Sljedeći rok"><input type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})}/></Field><Field label="Kilometraža"><input type="number" value={form.odometer} onChange={e=>setForm({...form,odometer:e.target.value})}/></Field><Field label="Sljedeći servis na km"><input type="number" value={form.next_odometer} onChange={e=>setForm({...form,next_odometer:e.target.value})}/></Field><Field label="Izvršitelj / osiguranje"><input value={form.provider} onChange={e=>setForm({...form,provider:e.target.value})}/></Field><Field label="Broj dokumenta"><input value={form.document_number} onChange={e=>setForm({...form,document_number:e.target.value})}/></Field><Field label="Trošak"><input type="number" step="0.01" value={form.cost} onChange={e=>setForm({...form,cost:e.target.value})}/></Field><label className="sm:col-span-2"><span className="mb-1 block text-xs font-bold text-slate-500">Opis izvršenih radova / napomena *</span><textarea required rows={4} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className="w-full rounded-xl border p-3"/></label><label className="sm:col-span-2"><span className="mb-1 block text-xs font-bold text-slate-500">Dokument, račun ili zapisnik</span><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx" onChange={e=>setForm({...form,file:e.target.files?.[0]||null})} className="w-full rounded-xl border p-3"/></label><button className="sm:col-span-2 rounded-xl bg-indigo-600 p-3 font-bold text-white">Spremi evidenciju</button></form></Modal>;
const Modal=({title,onClose,children})=><div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4"><div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6"><div className="mb-5 flex justify-between"><h2 className="text-xl font-bold">{title}</h2><button onClick={onClose}>✕</button></div>{children}</div></div>;
const Field=({label,children})=><label><span className="mb-1 block text-xs font-bold text-slate-500">{label}</span>{React.cloneElement(children,{className:"w-full rounded-xl border p-3"})}</label>;
const Kpi=({icon,label,value,danger})=><div className={`rounded-2xl p-5 shadow-sm ${danger?"bg-rose-600 text-white":"bg-white"}`}><div className="text-xl">{icon}</div><b className="mt-3 block text-3xl">{value||0}</b><span className={danger?"text-rose-100":"text-slate-500"}>{label}</span></div>;
export default Fleet;
