import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import {
  decidePublicQuotation,
  getPublicQuotation,
} from "../services/commercialServices.js";

const PublicQuotation = () => {
  const { token } = useParams();
  const [quotation,setQuotation] = useState(null);
  const [error,setError] = useState("");
  const [form,setForm] = useState({name:"",email:"",reason:""});

  const load=useCallback(async()=>{
    try { setQuotation((await getPublicQuotation(token)).data); }
    catch { setError("Ponuda nije pronađena ili više nije dostupna."); }
  },[token]);
  useEffect(()=>{load();},[load]);

  const decide=async(decision)=>{
    try { await decidePublicQuotation(token,{...form,decision}); await load(); }
    catch(requestError){setError(requestError.response?.data?.error||"Odluku nije moguće spremiti.");}
  };
  if(error)return <div className="min-h-screen bg-slate-100 p-10 text-center text-slate-600">{error}</div>;
  if(!quotation)return <div className="min-h-screen bg-slate-100 p-10 text-center text-slate-500">Učitavanje ponude…</div>;

  const editable=quotation.status==="sent"&&(!quotation.valid_until||new Date(quotation.valid_until)>=new Date(new Date().toDateString()));
  return <div className="min-h-screen bg-slate-100 p-4 sm:p-8"><div className="mx-auto max-w-4xl overflow-hidden rounded-3xl bg-white shadow-xl">
    <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-7 text-white"><div className="text-sm font-bold uppercase tracking-widest text-indigo-200">FlowApp ponuda</div><h1 className="mt-2 text-3xl font-bold">{quotation.quotation_number}</h1><p className="text-slate-300">{quotation.title}</p></div>
    <div className="p-6 sm:p-8"><div className="grid gap-4 sm:grid-cols-2"><Info label="Klijent" value={quotation.company_name}/><Info label="Stanica" value={quotation.station_name||"Sve stanice"}/><Info label="Datum" value={formatDate(quotation.issue_date)}/><Info label="Vrijedi do" value={formatDate(quotation.valid_until)}/></div>
    <div className="mt-7 overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left"><tr><th className="p-3">Opis</th><th className="p-3">Količina</th><th className="p-3">Cijena</th><th className="p-3 text-right">Ukupno</th></tr></thead><tbody className="divide-y">{quotation.items.map(item=><tr key={item.id}><td className="p-3">{item.description}</td><td className="p-3">{item.quantity} {item.unit}</td><td className="p-3">{money(item.unit_price,quotation.currency)}</td><td className="p-3 text-right font-bold">{money(item.line_total,quotation.currency)}</td></tr>)}</tbody></table></div>
    <div className="ml-auto mt-6 max-w-sm space-y-2 rounded-xl bg-slate-50 p-4"><Row label="Međuzbroj" value={money(quotation.subtotal,quotation.currency)}/><Row label="Popust" value={money(quotation.discount_amount,quotation.currency)}/><Row label="Porez" value={money(quotation.tax_amount,quotation.currency)}/><div className="border-t pt-2"><Row label="Ukupno" value={money(quotation.total,quotation.currency)} strong/></div></div>
    {quotation.notes&&<div className="mt-6 rounded-xl border p-4 text-slate-600">{quotation.notes}</div>}
    {!editable?<div className={`mt-7 rounded-xl p-5 text-center font-bold ${quotation.status==="accepted"?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-600"}`}>{quotation.status==="accepted"?<><FaCheckCircle className="mr-2 inline"/>Ponuda je prihvaćena.</>:quotation.status==="rejected"?<><FaTimesCircle className="mr-2 inline"/>Ponuda je odbijena.</>:"Ponuda nije dostupna za odluku."}</div>
    :<div className="mt-7 rounded-2xl border p-5"><h2 className="text-lg font-bold">Odluka o ponudi</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ime i prezime *" className="rounded-xl border p-3"/><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="E-mail" className="rounded-xl border p-3"/></div><textarea value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} placeholder="Napomena ili razlog odbijanja" className="mt-3 w-full rounded-xl border p-3"/><div className="mt-4 flex gap-3"><button onClick={()=>decide("reject")} className="flex-1 rounded-xl border border-red-300 py-3 font-bold text-red-600">Odbij</button><button disabled={!form.name.trim()} onClick={()=>decide("accept")} className="flex-1 rounded-xl bg-emerald-600 py-3 font-bold text-white disabled:opacity-40">Prihvati ponudu</button></div></div>}
    </div></div></div>;
};
const formatDate=value=>value?new Intl.DateTimeFormat("hr-HR").format(new Date(value)):"—";
const money=(value,currency)=>`${Number(value||0).toLocaleString("hr-HR",{minimumFractionDigits:2})} ${currency}`;
const Info=({label,value})=><div><div className="text-xs uppercase text-slate-400">{label}</div><div className="font-semibold text-slate-700">{value}</div></div>;
const Row=({label,value,strong})=><div className={`flex justify-between ${strong?"text-lg font-bold":""}`}><span>{label}</span><span>{value}</span></div>;
export default PublicQuotation;
