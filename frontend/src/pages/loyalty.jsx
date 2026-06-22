import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FaBullhorn, FaCoins, FaGift, FaPlus, FaTimes, FaUsers } from "react-icons/fa";
import { toast } from "sonner";
import useStore from "../store";
import {
  addLoyaltyTransaction, createLoyaltyCampaign, createLoyaltyMember,
  createLoyaltyReward, getLoyaltyOverview, saveLoyaltyProgram,
} from "../services/loyaltyServices.js";

const blanks={
  program:{client_id:"",name:"",description:"",points_per_currency:1,currency_per_point:.01,status:"active",terms:""},
  member:{program_id:"",user_id:"",full_name:"",email:"",phone:"",tier:"standard",marketing_consent:false},
  transaction:{member_id:"",transaction_type:"earn",points:0,amount:"",reference:"",description:""},
  reward:{program_id:"",name:"",description:"",points_cost:0,valid_from:"",valid_until:"",quantity_limit:"",status:"active"},
  campaign:{program_id:"",title:"",message:"",channel:"in_app",audience_tier:"",bonus_points:"",starts_at:"",ends_at:"",status:"draft"},
};

const Loyalty=()=>{
  const permissions=useStore(s=>s.permissions);
  const canProgram=permissions.includes("manage_loyalty_program");
  const canMembers=permissions.includes("manage_loyalty_members");
  const canCampaigns=permissions.includes("manage_loyalty_campaigns");
  const [data,setData]=useState({programs:[],members:[],transactions:[],rewards:[],campaigns:[],clients:[],users:[]});
  const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState("");
  const [form,setForm]=useState({});
  const load=useCallback(async()=>{
    try{setData((await getLoyaltyOverview()).data);}
    catch(error){toast.error(error.response?.data?.error||"Loyalty centar nije moguće učitati.");}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);
  const totals=useMemo(()=>({
    members:data.programs.reduce((sum,x)=>sum+Number(x.member_count||0),0),
    points:data.programs.reduce((sum,x)=>sum+Number(x.points_outstanding||0),0),
    campaigns:data.campaigns.filter(x=>["active","scheduled"].includes(x.status)).length,
  }),[data]);
  const open=name=>{setForm({...blanks[name]});setModal(name);};
  const save=async(event)=>{
    event.preventDefault();
    const actions={program:saveLoyaltyProgram,member:createLoyaltyMember,
      transaction:addLoyaltyTransaction,reward:createLoyaltyReward,campaign:createLoyaltyCampaign};
    try{await actions[modal](form);toast.success("Podaci su spremljeni.");setModal("");load();}
    catch(error){toast.error(error.response?.data?.error||"Podatke nije moguće spremiti.");}
  };
  if(loading)return <div className="min-h-screen bg-slate-100 pt-28 text-center text-slate-500">Učitavanje loyalty centra…</div>;
  return <div className="min-h-screen bg-slate-100 px-4 pb-10 pt-24 sm:ml-16 sm:px-7"><div className="mx-auto max-w-7xl">
    <header className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div><p className="text-sm font-bold uppercase tracking-widest text-violet-600">Loyalty centar</p><h1 className="text-3xl font-bold">Bodovi, nagrade i promocije</h1><p className="mt-2 text-slate-500">Program pogodnosti koji klijenti i njihovi korisnici prate iz aplikacije.</p></div>
      <div className="flex flex-wrap gap-2">{canProgram&&<Action onClick={()=>open("program")}>Novi program</Action>}{canMembers&&<Action onClick={()=>open("member")}>Novi član</Action>}{canCampaigns&&<Action onClick={()=>open("campaign")}>Nova promocija</Action>}</div>
    </header>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Card icon={FaGift} label="Programa" value={data.programs.length}/><Card icon={FaUsers} label="Članova" value={totals.members}/><Card icon={FaCoins} label="Aktivnih bodova" value={totals.points.toFixed(0)}/><Card icon={FaBullhorn} label="Aktivnih promocija" value={totals.campaigns}/></div>
    {!!data.campaigns.length&&<section className="mt-6"><h2 className="mb-3 text-xl font-bold">Promocije za korisnike</h2><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.campaigns.map(x=><article key={x.id} className="rounded-2xl bg-gradient-to-br from-violet-700 to-indigo-600 p-5 text-white shadow"><div className="text-xs font-bold uppercase tracking-widest">{x.channel==="both"?"Aplikacija i e-mail":x.channel}</div><h3 className="mt-2 text-xl font-bold">{x.title}</h3><p className="mt-2 text-violet-100">{x.message}</p>{x.bonus_points&&<div className="mt-4 inline-flex rounded-full bg-white/20 px-3 py-1 text-sm font-bold">+{Number(x.bonus_points).toFixed(0)} bodova</div>}</article>)}</div></section>}
    <section className="mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm"><Header title="Programi i stanje"/><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="p-4">Klijent / program</th><th className="p-4">Članovi</th><th className="p-4">Bodovi</th><th className="p-4">Status</th></tr></thead><tbody className="divide-y">{data.programs.map(x=><tr key={x.id}><td className="p-4"><b>{x.name}</b><div className="text-slate-500">{x.company_name}</div></td><td className="p-4">{x.member_count}</td><td className="p-4 font-bold">{Number(x.points_outstanding).toFixed(0)}</td><td className="p-4"><Badge value={x.status}/></td></tr>)}</tbody></table>{!data.programs.length&&<Empty text="Još nema loyalty programa."/>}</div></section>
    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <section className="rounded-2xl border bg-white shadow-sm"><Header title="Članovi">{canMembers&&<Action onClick={()=>open("transaction")}>Upis bodova</Action>}</Header><div className="divide-y">{data.members.slice(0,12).map(x=><div key={x.id} className="flex items-center justify-between p-4"><div><b>{x.full_name}</b><div className="text-xs text-slate-500">{x.member_number} · {x.tier}</div></div><div className="font-bold text-violet-700">{Number(x.points_balance).toFixed(0)} bod.</div></div>)}{!data.members.length&&<Empty text="Nema članova."/>}</div></section>
      <section className="rounded-2xl border bg-white shadow-sm"><Header title="Nagrade">{canCampaigns&&<Action onClick={()=>open("reward")}>Nova nagrada</Action>}</Header><div className="divide-y">{data.rewards.map(x=><div key={x.id} className="flex justify-between p-4"><div><b>{x.name}</b><div className="text-sm text-slate-500">{x.description}</div></div><div className="font-bold text-violet-700">{Number(x.points_cost).toFixed(0)} bod.</div></div>)}{!data.rewards.length&&<Empty text="Nema definiranih nagrada."/>}</div></section>
    </div>
  </div>
  {modal&&<Modal title={{program:"Loyalty program",member:"Novi član",transaction:"Transakcija bodova",reward:"Nova nagrada",campaign:"Marketinška promocija"}[modal]} onClose={()=>setModal("")} onSubmit={save}>
    {modal==="program"&&<><Field label="Klijent *"><select required value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})}><option value="">Odaberite</option>{data.clients.map(x=><option key={x.id} value={x.id}>{x.company_name}</option>)}</select></Field><Field label="Naziv *"><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Bodova po valuti"><input type="number" step=".01" value={form.points_per_currency} onChange={e=>setForm({...form,points_per_currency:e.target.value})}/></Field><Field label="Vrijednost boda"><input type="number" step=".0001" value={form.currency_per_point} onChange={e=>setForm({...form,currency_per_point:e.target.value})}/></Field><Text label="Opis" value={form.description} set={v=>setForm({...form,description:v})}/><Text label="Uvjeti programa" value={form.terms} set={v=>setForm({...form,terms:v})}/></>}
    {modal==="member"&&<><Program data={data} value={form.program_id} set={v=>setForm({...form,program_id:v})}/><Field label="Povezani korisnik"><select value={form.user_id} onChange={e=>{const u=data.users.find(x=>String(x.id)===e.target.value);setForm({...form,user_id:e.target.value,full_name:u?`${u.firstname||""} ${u.lastname||""}`.trim():form.full_name,email:u?.email||form.email});}}><option value="">Bez računa</option>{data.users.map(x=><option key={x.id} value={x.id}>{x.firstname} {x.lastname} ({x.email})</option>)}</select></Field><Field label="Ime i prezime *"><input required value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/></Field><Field label="E-mail"><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></Field><Field label="Telefon"><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></Field><Field label="Razina"><input value={form.tier} onChange={e=>setForm({...form,tier:e.target.value})}/></Field><label className="flex items-center gap-2"><input type="checkbox" checked={form.marketing_consent} onChange={e=>setForm({...form,marketing_consent:e.target.checked})}/>Privola za marketinške poruke</label></>}
    {modal==="transaction"&&<><Field label="Član *"><select required value={form.member_id} onChange={e=>setForm({...form,member_id:e.target.value})}><option value="">Odaberite</option>{data.members.map(x=><option key={x.id} value={x.id}>{x.full_name} · {x.points_balance} bod.</option>)}</select></Field><Field label="Vrsta"><select value={form.transaction_type} onChange={e=>setForm({...form,transaction_type:e.target.value})}><option value="earn">Dodjela</option><option value="redeem">Iskorištavanje</option><option value="adjustment">Korekcija</option><option value="expire">Istek</option></select></Field><Field label="Bodovi *"><input required type="number" step=".01" value={form.points} onChange={e=>setForm({...form,points:e.target.value})}/></Field><Field label="Iznos kupnje"><input type="number" step=".01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></Field><Field label="Referenca"><input value={form.reference} onChange={e=>setForm({...form,reference:e.target.value})}/></Field><Text label="Opis" value={form.description} set={v=>setForm({...form,description:v})}/></>}
    {modal==="reward"&&<><Program data={data} value={form.program_id} set={v=>setForm({...form,program_id:v})}/><Field label="Naziv *"><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Cijena u bodovima *"><input required type="number" value={form.points_cost} onChange={e=>setForm({...form,points_cost:e.target.value})}/></Field><Field label="Količinsko ograničenje"><input type="number" value={form.quantity_limit} onChange={e=>setForm({...form,quantity_limit:e.target.value})}/></Field><Field label="Vrijedi od"><input type="date" value={form.valid_from} onChange={e=>setForm({...form,valid_from:e.target.value})}/></Field><Field label="Vrijedi do"><input type="date" value={form.valid_until} onChange={e=>setForm({...form,valid_until:e.target.value})}/></Field><Text label="Opis" value={form.description} set={v=>setForm({...form,description:v})}/></>}
    {modal==="campaign"&&<><Program data={data} value={form.program_id} set={v=>setForm({...form,program_id:v})}/><Field label="Naslov *"><input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></Field><Field label="Kanal"><select value={form.channel} onChange={e=>setForm({...form,channel:e.target.value})}><option value="in_app">U aplikaciji</option><option value="email">E-mail</option><option value="both">Aplikacija i e-mail</option></select></Field><Field label="Status"><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="draft">Nacrt</option><option value="scheduled">Zakazano</option><option value="active">Aktivno</option></select></Field><Field label="Bonus bodovi"><input type="number" value={form.bonus_points} onChange={e=>setForm({...form,bonus_points:e.target.value})}/></Field><Field label="Početak"><input type="datetime-local" value={form.starts_at} onChange={e=>setForm({...form,starts_at:e.target.value})}/></Field><Field label="Završetak"><input type="datetime-local" value={form.ends_at} onChange={e=>setForm({...form,ends_at:e.target.value})}/></Field><Text required label="Poruka *" value={form.message} set={v=>setForm({...form,message:v})}/></>}
  </Modal>}</div>;
};

const Card=({icon:Icon,label,value})=><div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="inline-flex rounded-xl bg-violet-100 p-3 text-violet-700"><Icon/></div><div className="mt-3 text-2xl font-bold">{value}</div><div className="text-sm text-slate-500">{label}</div></div>;
const Action=({onClick,children})=><button type="button" onClick={onClick} className="rounded-xl bg-violet-600 px-4 py-2.5 font-semibold text-white"><FaPlus className="mr-2 inline"/>{children}</button>;
const Header=({title,children})=><div className="flex items-center justify-between border-b p-5"><h2 className="text-xl font-bold">{title}</h2>{children}</div>;
const Badge=({value})=><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">{value}</span>;
const Empty=({text})=><div className="p-10 text-center text-slate-400">{text}</div>;
const Field=({label,children})=><label><b className="mb-2 block">{label}</b>{React.cloneElement(children,{className:"w-full rounded-xl border p-3"})}</label>;
const Text=({label,value,set,required=false})=><label className="md:col-span-2"><b className="mb-2 block">{label}</b><textarea required={required} rows={3} value={value||""} onChange={e=>set(e.target.value)} className="w-full rounded-xl border p-3"/></label>;
const Program=({data,value,set})=><Field label="Program *"><select required value={value} onChange={e=>set(e.target.value)}><option value="">Odaberite</option>{data.programs.map(x=><option key={x.id} value={x.id}>{x.company_name} · {x.name}</option>)}</select></Field>;
const Modal=({title,onClose,onSubmit,children})=><div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={onSubmit} className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white"><div className="flex justify-between border-b p-5"><h2 className="text-xl font-bold">{title}</h2><button type="button" onClick={onClose}><FaTimes/></button></div><div className="grid gap-4 p-5 md:grid-cols-2">{children}</div><div className="flex justify-end gap-3 border-t p-5"><button type="button" onClick={onClose}>Odustani</button><button className="rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white">Spremi</button></div></form></div>;
export default Loyalty;
