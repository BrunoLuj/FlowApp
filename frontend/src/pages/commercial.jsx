import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FaEuroSign, FaFileInvoiceDollar, FaHandshake, FaPlus, FaTimes } from "react-icons/fa";
import { toast } from "sonner";
import useStore from "../store";
import {
  createContract, createQuotation, createQuotationFromWorkOrder,
  getCommercialOverview, getContract, getQuotation, updateContract, updateQuotation,
} from "../services/commercialServices.js";

const date = () => new Date().toISOString().slice(0, 10);
const blankContract = {
  id:null, contract_number:"", client_id:"", title:"", status:"draft",
  start_date:date(), end_date:"", monthly_fee:0, currency:"EUR", billing_cycle:"monthly",
  response_hours_normal:24, response_hours_high:8, response_hours_urgent:2,
  resolution_hours_normal:72, resolution_hours_high:24, resolution_hours_urgent:8,
  station_ids:[], included_services_text:"", notes:"",
};
const blankItem = { item_type:"service", description:"", quantity:1, unit:"usluga", unit_price:0, discount_percent:0 };
const blankQuote = {
  id:null, client_id:"", station_id:"", work_order_id:"", contract_id:"",
  title:"", status:"draft", issue_date:date(), valid_until:"", currency:"EUR",
  discount_percent:0, tax_percent:0, notes:"", internal_notes:"",
  items:[{...blankItem}],
};

const Commercial = () => {
  const { permissions } = useStore();
  const canManageContracts = permissions.includes("manage_contracts");
  const canManageQuotations = permissions.includes("manage_quotations");
  const [data,setData] = useState({contracts:[],quotations:[],clients:[],stations:[],workOrders:[],summary:{}});
  const [tab,setTab] = useState("quotes");
  const [modal,setModal] = useState(null);
  const [contract,setContract] = useState(blankContract);
  const [quote,setQuote] = useState(blankQuote);
  const [linkQuote,setLinkQuote] = useState(null);
  const [loading,setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData((await getCommercialOverview()).data); }
    catch { toast.error("Komercijalni centar nije moguće učitati."); }
    finally { setLoading(false); }
  },[]);
  useEffect(() => { load(); },[load]);

  const stations = useMemo(() => data.stations.filter((item) =>
    String(item.client_id) === String(modal === "contract" ? contract.client_id : quote.client_id)
  ),[contract.client_id,data.stations,modal,quote.client_id]);

  const editContract = async (item) => {
    if (!item) { setContract(blankContract); setModal("contract"); return; }
    const detail=(await getContract(item.id)).data;
    setContract({...blankContract,...detail,
      start_date:String(detail.start_date).slice(0,10),
      end_date:detail.end_date?String(detail.end_date).slice(0,10):"",
      station_ids:detail.stations.map((station)=>station.id),
      included_services_text:(detail.included_services||[]).join("\n"),
    });
    setModal("contract");
  };

  const saveContract = async (event) => {
    event.preventDefault();
    const payload={...contract,included_services:contract.included_services_text.split("\n").map(x=>x.trim()).filter(Boolean)};
    try {
      if(contract.id) await updateContract(contract.id,payload); else await createContract(payload);
      toast.success("Ugovor je spremljen."); setModal(null); load();
    } catch(error){ toast.error(error.response?.data?.error||"Ugovor nije moguće spremiti."); }
  };

  const editQuote = async (item) => {
    if (!item) { setQuote(blankQuote); setModal("quote"); return; }
    const detail=(await getQuotation(item.id)).data;
    setQuote({...blankQuote,...detail,
      issue_date:String(detail.issue_date).slice(0,10),
      valid_until:detail.valid_until?String(detail.valid_until).slice(0,10):"",
    });
    setModal("quote");
  };

  const saveQuote = async (event) => {
    event.preventDefault();
    try {
      if(quote.id) await updateQuotation(quote.id,quote); else await createQuotation(quote);
      toast.success("Ponuda je spremljena."); setModal(null); load();
    } catch(error){ toast.error(error.response?.data?.error||"Ponudu nije moguće spremiti."); }
  };

  const generate = async () => {
    if(!quote.work_order_id) return;
    try {
      const generated=(await createQuotationFromWorkOrder(quote.work_order_id)).data;
      setQuote({...blankQuote,...generated,issue_date:String(generated.issue_date).slice(0,10)});
      toast.success("Nacrt je generiran iz radnog naloga."); load();
    } catch(error){ toast.error(error.response?.data?.error||"Generiranje nije uspjelo."); }
  };

  const totals=useMemo(()=>{
    const subtotal=quote.items.reduce((sum,item)=>{
      const gross=Number(item.quantity||0)*Number(item.unit_price||0);
      return sum+gross*(1-Number(item.discount_percent||0)/100);
    },0);
    const discount=subtotal*Number(quote.discount_percent||0)/100;
    const tax=(subtotal-discount)*Number(quote.tax_percent||0)/100;
    return {subtotal,discount,tax,total:subtotal-discount+tax};
  },[quote]);

  const changeItem=(index,changes)=>setQuote({...quote,items:quote.items.map((item,i)=>i===index?{...item,...changes}:item)});
  const approvalUrl=(item)=>`${window.location.origin}/quotation/${item.approval_token}`;

  if(loading) return <div className="min-h-screen bg-slate-100 pt-28 text-center text-slate-500">Učitavanje komercijalnog centra…</div>;

  return <div className="min-h-screen bg-slate-100 px-4 pb-10 pt-24 sm:ml-16 sm:px-7"><div className="mx-auto max-w-7xl">
    <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Komercijala</p><h1 className="mt-1 text-3xl font-bold">Ugovori i ponude</h1><p className="mt-2 text-slate-500">SLA, pokriće stanica i odobravanje ponuda.</p></div><div className="flex gap-2">{canManageContracts&&<button onClick={()=>editContract()} className="rounded-xl border bg-white px-4 py-3 font-semibold"><FaPlus className="mr-2 inline"/>Novi ugovor</button>}{canManageQuotations&&<button onClick={()=>editQuote()} className="rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white"><FaPlus className="mr-2 inline"/>Nova ponuda</button>}</div></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Summary label="Aktivni ugovori" value={data.summary.active_contracts||0} icon={FaHandshake}/><Summary label="Istječu u 60 dana" value={data.summary.expiring_contracts||0} icon={FaHandshake}/><Summary label="Čekaju odobrenje" value={data.summary.awaiting_approval||0} icon={FaFileInvoiceDollar}/><Summary label="Prihvaćeno ovaj mjesec" value={`${Number(data.summary.accepted_this_month||0).toFixed(2)} €`} icon={FaEuroSign}/></div>
    <div className="my-6 flex gap-2 rounded-xl bg-white p-2 shadow-sm"><Tab active={tab==="quotes"} onClick={()=>setTab("quotes")}>Ponude</Tab><Tab active={tab==="contracts"} onClick={()=>setTab("contracts")}>Ugovori i SLA</Tab></div>
    {tab==="quotes"?<section className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="p-4">Ponuda</th><th className="p-4">Klijent</th><th className="p-4">Iznos</th><th className="p-4">Status</th><th className="p-4">Link</th></tr></thead><tbody className="divide-y">{data.quotations.map(item=><tr key={item.id}><td className="p-4"><button onClick={()=>editQuote(item)} className="text-left"><b className="text-indigo-600">{item.quotation_number}</b><div>{item.title}</div></button></td><td className="p-4">{item.company_name}<div className="text-xs text-slate-400">{item.station_name||"Sve stanice"}</div></td><td className="p-4 font-bold">{Number(item.total).toFixed(2)} {item.currency}</td><td className="p-4"><Status value={item.status}/></td><td className="p-4"><button onClick={()=>setLinkQuote(item)} className="rounded-lg border px-3 py-2 text-xs font-semibold">Otvori</button></td></tr>)}</tbody></table>{!data.quotations.length&&<Empty text="Nema ponuda."/>}</div></section>
    :<div className="grid gap-5 lg:grid-cols-2">{data.contracts.map(item=><button key={item.id} onClick={()=>editContract(item)} className="rounded-2xl border bg-white p-5 text-left shadow-sm"><div className="flex justify-between"><div><div className="text-xs font-bold uppercase text-indigo-600">{item.contract_number}</div><h2 className="text-xl font-bold">{item.title}</h2><p className="text-sm text-slate-500">{item.company_name}</p></div><Status value={item.status}/></div><div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-4 text-sm"><div><b>Stanice</b><br/>{item.covered_stations}</div><div><b>Naknada</b><br/>{Number(item.monthly_fee).toFixed(2)} {item.currency}</div><div><b>Do</b><br/>{item.end_date?new Intl.DateTimeFormat("hr-HR").format(new Date(item.end_date)):"—"}</div></div></button>)}{!data.contracts.length&&<Empty text="Nema ugovora."/>}</div>}
  </div>

  {modal==="contract"&&<Modal title={contract.id?"Uredi ugovor":"Novi ugovor"} onClose={()=>setModal(null)} onSubmit={saveContract}>
    <Field label="Broj ugovora *"><input required value={contract.contract_number} onChange={e=>setContract({...contract,contract_number:e.target.value})}/></Field><Field label="Klijent *"><select required value={contract.client_id} onChange={e=>setContract({...contract,client_id:e.target.value,station_ids:[]})}><option value="">Odaberite</option>{data.clients.map(x=><option key={x.id} value={x.id}>{x.company_name}</option>)}</select></Field><Field label="Naziv *"><input required value={contract.title} onChange={e=>setContract({...contract,title:e.target.value})}/></Field><Field label="Status"><select value={contract.status} onChange={e=>setContract({...contract,status:e.target.value})}><option value="draft">Nacrt</option><option value="active">Aktivan</option><option value="expired">Istekao</option><option value="cancelled">Otkazan</option></select></Field><Field label="Početak *"><input required type="date" value={contract.start_date} onChange={e=>setContract({...contract,start_date:e.target.value})}/></Field><Field label="Završetak"><input type="date" value={contract.end_date} onChange={e=>setContract({...contract,end_date:e.target.value})}/></Field><Field label="Mjesečna naknada"><input type="number" step="0.01" value={contract.monthly_fee} onChange={e=>setContract({...contract,monthly_fee:e.target.value})}/></Field><Field label="Ciklus"><select value={contract.billing_cycle} onChange={e=>setContract({...contract,billing_cycle:e.target.value})}><option value="monthly">Mjesečno</option><option value="quarterly">Kvartalno</option><option value="yearly">Godišnje</option><option value="one_time">Jednokratno</option></select></Field>
    <fieldset className="md:col-span-2 rounded-xl border p-4"><legend className="px-2 font-semibold">SLA odziv / rješavanje u satima</legend><div className="grid gap-3 sm:grid-cols-3">{[["Normalno","normal"],["Visoko","high"],["Hitno","urgent"]].map(([label,key])=><div key={key}><b className="text-sm">{label}</b><div className="mt-1 flex gap-2"><input type="number" value={contract[`response_hours_${key}`]||""} onChange={e=>setContract({...contract,[`response_hours_${key}`]:e.target.value})} placeholder="Odziv" className="w-1/2 rounded-lg border p-2"/><input type="number" value={contract[`resolution_hours_${key}`]||""} onChange={e=>setContract({...contract,[`resolution_hours_${key}`]:e.target.value})} placeholder="Rješenje" className="w-1/2 rounded-lg border p-2"/></div></div>)}</div></fieldset>
    <label className="md:col-span-2"><b>Pokrivene stanice</b><div className="mt-2 grid gap-2 rounded-xl border p-3 sm:grid-cols-2">{stations.map(s=><label key={s.id} className="flex gap-2"><input type="checkbox" checked={contract.station_ids.includes(s.id)} onChange={e=>setContract({...contract,station_ids:e.target.checked?[...contract.station_ids,s.id]:contract.station_ids.filter(id=>id!==s.id)})}/>{s.name}</label>)}</div></label><label className="md:col-span-2"><b>Uključene usluge — jedna po retku</b><textarea rows={4} value={contract.included_services_text} onChange={e=>setContract({...contract,included_services_text:e.target.value})} className="mt-2 w-full rounded-xl border p-3"/></label>
  </Modal>}

  {modal==="quote"&&<Modal wide title={quote.id?`Ponuda ${quote.quotation_number}`:"Nova ponuda"} onClose={()=>setModal(null)} onSubmit={saveQuote}>
    <Field label="Klijent *"><select required value={quote.client_id} onChange={e=>setQuote({...quote,client_id:e.target.value,station_id:""})}><option value="">Odaberite</option>{data.clients.map(x=><option key={x.id} value={x.id}>{x.company_name}</option>)}</select></Field><Field label="Stanica"><select value={quote.station_id||""} onChange={e=>setQuote({...quote,station_id:e.target.value})}><option value="">Sve stanice</option>{stations.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field><Field label="Naslov *"><input required value={quote.title} onChange={e=>setQuote({...quote,title:e.target.value})}/></Field><Field label="Status"><select value={quote.status} onChange={e=>setQuote({...quote,status:e.target.value})}><option value="draft">Nacrt</option><option value="sent">Poslano</option><option value="cancelled">Otkazano</option></select></Field><Field label="Datum *"><input required type="date" value={quote.issue_date} onChange={e=>setQuote({...quote,issue_date:e.target.value})}/></Field><Field label="Vrijedi do"><input type="date" value={quote.valid_until||""} onChange={e=>setQuote({...quote,valid_until:e.target.value})}/></Field>
    {!quote.id&&<div className="md:col-span-2 rounded-xl bg-indigo-50 p-4"><b>Generiraj iz radnog naloga</b><div className="mt-2 flex gap-2"><select value={quote.work_order_id||""} onChange={e=>setQuote({...quote,work_order_id:e.target.value})} className="flex-1 rounded-lg border p-2"><option value="">Odaberite nalog</option>{data.workOrders.map(x=><option key={x.id} value={x.id}>{x.company_name} · {x.title}</option>)}</select><button type="button" onClick={generate} className="rounded-lg bg-indigo-600 px-4 text-white">Generiraj</button></div></div>}
    <div className="md:col-span-2"><div className="mb-2 flex justify-between"><b>Stavke</b><button type="button" onClick={()=>setQuote({...quote,items:[...quote.items,{...blankItem}]})} className="text-indigo-600">+ Dodaj</button></div>{quote.items.map((item,index)=><div key={index} className="mb-2 grid gap-2 rounded-xl border p-3 md:grid-cols-12"><select value={item.item_type} onChange={e=>changeItem(index,{item_type:e.target.value})} className="rounded-lg border p-2 md:col-span-2"><option value="service">Usluga</option><option value="labor">Rad</option><option value="material">Materijal</option><option value="travel">Put</option><option value="other">Ostalo</option></select><input required value={item.description} onChange={e=>changeItem(index,{description:e.target.value})} placeholder="Opis" className="rounded-lg border p-2 md:col-span-4"/><input type="number" step="0.001" value={item.quantity} onChange={e=>changeItem(index,{quantity:e.target.value})} className="rounded-lg border p-2 md:col-span-1"/><input value={item.unit} onChange={e=>changeItem(index,{unit:e.target.value})} className="rounded-lg border p-2 md:col-span-1"/><input type="number" step="0.01" value={item.unit_price} onChange={e=>changeItem(index,{unit_price:e.target.value})} className="rounded-lg border p-2 md:col-span-2"/><input type="number" step="0.01" value={item.discount_percent} onChange={e=>changeItem(index,{discount_percent:e.target.value})} className="rounded-lg border p-2 md:col-span-1"/><button type="button" onClick={()=>setQuote({...quote,items:quote.items.filter((_,i)=>i!==index)})} className="text-red-500"><FaTimes/></button></div>)}</div>
    <Field label="Popust %"><input type="number" step="0.01" value={quote.discount_percent} onChange={e=>setQuote({...quote,discount_percent:e.target.value})}/></Field><Field label="Porez %"><input type="number" step="0.01" value={quote.tax_percent} onChange={e=>setQuote({...quote,tax_percent:e.target.value})}/></Field><div className="md:col-span-2 rounded-xl bg-slate-900 p-4 text-white"><div className="grid grid-cols-4 text-center"><div>Međuzbroj<br/><b>{totals.subtotal.toFixed(2)}</b></div><div>Popust<br/><b>{totals.discount.toFixed(2)}</b></div><div>Porez<br/><b>{totals.tax.toFixed(2)}</b></div><div>Ukupno<br/><b className="text-xl">{totals.total.toFixed(2)} {quote.currency}</b></div></div></div><label className="md:col-span-2"><b>Napomena klijentu</b><textarea rows={3} value={quote.notes||""} onChange={e=>setQuote({...quote,notes:e.target.value})} className="mt-2 w-full rounded-xl border p-3"/></label>
  </Modal>}

  {linkQuote&&<div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4"><div className="w-full max-w-xl rounded-2xl bg-white p-6"><div className="flex justify-between"><h2 className="text-xl font-bold">{linkQuote.quotation_number}</h2><button onClick={()=>setLinkQuote(null)}><FaTimes/></button></div><div className="mt-4 break-all rounded-xl bg-slate-50 p-4 text-sm">{approvalUrl(linkQuote)}</div><button onClick={()=>navigator.clipboard.writeText(approvalUrl(linkQuote)).then(()=>toast.success("Link je kopiran."))} className="mt-4 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white">Kopiraj link</button></div></div>}
  </div>;
};

const styles={active:"bg-emerald-100 text-emerald-700",accepted:"bg-emerald-100 text-emerald-700",sent:"bg-blue-100 text-blue-700",draft:"bg-slate-100 text-slate-600",rejected:"bg-red-100 text-red-700",expired:"bg-amber-100 text-amber-700",cancelled:"bg-red-100 text-red-700"};
const Status=({value})=><span className={`rounded-full px-3 py-1 text-xs font-bold ${styles[value]||styles.draft}`}>{value}</span>;
const Summary=({label,value,icon:Icon})=><div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="inline-flex rounded-xl bg-indigo-100 p-3 text-indigo-700"><Icon/></div><div className="mt-3 text-2xl font-bold">{value}</div><div className="text-sm text-slate-500">{label}</div></div>;
const Tab=({active,onClick,children})=><button onClick={onClick} className={`rounded-lg px-4 py-2 font-semibold ${active?"bg-indigo-600 text-white":"text-slate-600"}`}>{children}</button>;
const Empty=({text})=><div className="p-12 text-center text-slate-400">{text}</div>;
const Field=({label,children})=><label><b className="mb-2 block">{label}</b>{React.cloneElement(children,{className:"w-full rounded-xl border p-3"})}</label>;
const Modal=({title,onClose,onSubmit,children,wide})=><div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={onSubmit} className={`max-h-[94vh] w-full overflow-y-auto rounded-2xl bg-white ${wide?"max-w-6xl":"max-w-4xl"}`}><div className="flex justify-between border-b p-6"><h2 className="text-xl font-bold">{title}</h2><button type="button" onClick={onClose}><FaTimes/></button></div><div className="grid gap-4 p-6 md:grid-cols-2">{children}</div><div className="flex justify-end gap-3 border-t p-6"><button type="button" onClick={onClose} className="px-5 py-3">Odustani</button><button className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white">Spremi</button></div></form></div>;
export default Commercial;
