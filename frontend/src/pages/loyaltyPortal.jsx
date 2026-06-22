import React,{useCallback,useEffect,useMemo,useState} from "react";
import {FaArrowUp,FaBolt,FaCoins,FaCrown,FaGift,FaHistory,FaRedo} from "react-icons/fa";
import {toast} from "sonner";
import {getMyLoyalty} from "../services/loyaltyPortalServices.js";

const first=(object,keys,fallback)=>{for(const key of keys)if(object?.[key]!==undefined&&object[key]!==null)return object[key];return fallback;};
const list=(object,keys)=>{const value=first(object,keys,[]);return Array.isArray(value)?value:[];};
const number=value=>Number(value||0);
const date=value=>value?new Intl.DateTimeFormat("hr-HR",{dateStyle:"medium"}).format(new Date(value)):"";

const LoyaltyPortal=()=>{
  const [response,setResponse]=useState(null);
  const [loading,setLoading]=useState(true);
  const load=useCallback(async()=>{setLoading(true);try{setResponse((await getMyLoyalty()).data);}catch(error){toast.error(error.response?.data?.error||"Loyalty podatke nije moguće učitati.");}finally{setLoading(false);}},[]);
  useEffect(()=>{load();},[load]);
  const view=useMemo(()=>{
    const raw=response?.data||{};
    const member=first(raw,["member","customer","user","profile"],raw);
    const balance=number(first(member,["points_balance","balance","points","available_points"],first(raw,["points_balance","balance","points","available_points"],0)));
    const lifetime=number(first(member,["lifetime_points","total_points","earned_points"],first(raw,["lifetime_points","total_points","earned_points"],balance)));
    const tier=first(member,["tier","level","status_name","rank"],"Član");
    const nextTier=first(member,["next_tier","next_level"],"");
    return {
      member,balance,lifetime,tier,nextTier,
      transactions:list(raw,["transactions","activity","history","point_transactions"]),
      rewards:list(raw,["rewards","available_rewards","benefits"]),
      promotions:list(raw,["promotions","campaigns","offers"]),
    };
  },[response]);
  if(loading)return <div className="min-h-screen bg-slate-950 pt-32 text-center text-white">Učitavanje vaših pogodnosti…</div>;
  if(!response)return <ErrorState onRetry={load}/>;
  if(!response.configured)return <div className="min-h-screen bg-slate-950 px-5 pt-28 text-white"><div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center"><FaBolt className="mx-auto text-4xl text-violet-400"/><h1 className="mt-4 text-2xl font-bold">Loyalty integracija je spremna</h1><p className="mt-3 text-slate-300">Potrebno je još unijeti adresu i API ključ vanjskog Loyalty sustava na serveru.</p></div></div>;
  const name=first(view.member,["full_name","name"],`${response.customer.first_name||""} ${response.customer.last_name||""}`.trim());
  return <main className="min-h-screen bg-[#080b18] px-4 pb-14 pt-24 text-white sm:px-7"><div className="mx-auto max-w-6xl">
    <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-700 via-indigo-700 to-cyan-600 p-7 shadow-2xl sm:p-10">
      <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10"/><div className="absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-cyan-300/10"/>
      <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-end"><div><div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold"><FaCrown/>{view.tier}</div><p className="text-violet-100">Dobro došli natrag</p><h1 className="mt-1 text-3xl font-bold sm:text-4xl">{name}</h1><p className="mt-2 text-violet-100">{response.customer.company_name}</p></div><div className="rounded-3xl border border-white/20 bg-slate-950/25 p-6 backdrop-blur"><p className="text-sm text-violet-100">Raspoloživi bodovi</p><div className="mt-1 flex items-baseline gap-2"><FaCoins className="text-2xl text-amber-300"/><b className="text-5xl">{view.balance.toLocaleString("hr-HR")}</b></div><p className="mt-2 text-sm text-violet-100">Ukupno osvojeno: {view.lifetime.toLocaleString("hr-HR")}</p></div></div>
    </section>
    {!!view.promotions.length&&<section className="mt-7"><Title icon={FaBolt}>Aktualne pogodnosti</Title><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{view.promotions.map((item,index)=><article key={first(item,["id","code"],index)} className="rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-950 to-slate-900 p-6"><span className="text-xs font-bold uppercase tracking-widest text-violet-300">{first(item,["badge","type","category"],"Posebna ponuda")}</span><h3 className="mt-2 text-xl font-bold">{first(item,["title","name"],"Pogodnost")}</h3><p className="mt-2 text-sm leading-6 text-slate-300">{first(item,["message","description","text"],"")}</p>{first(item,["bonus_points","points"],null)!==null&&<div className="mt-4 inline-flex rounded-full bg-amber-300 px-3 py-1 text-sm font-bold text-slate-950">+{first(item,["bonus_points","points"],0)} bodova</div>}</article>)}</div></section>}
    <div className="mt-7 grid gap-7 lg:grid-cols-2">
      <section className="rounded-3xl border border-white/10 bg-white/[.04]"><div className="p-6"><Title icon={FaHistory}>Posljednje aktivnosti</Title></div><div className="divide-y divide-white/10">{view.transactions.slice(0,10).map((item,index)=>{const points=number(first(item,["points","point_delta","amount_points"],0));return <div key={first(item,["id"],index)} className="flex items-center justify-between gap-4 px-6 py-4"><div><b>{first(item,["description","title","reference"],"Loyalty transakcija")}</b><p className="mt-1 text-xs text-slate-400">{date(first(item,["created_at","date","transaction_date"],""))}</p></div><div className={`flex items-center gap-1 font-bold ${points>=0?"text-emerald-400":"text-rose-400"}`}>{points>=0&&<FaArrowUp className="text-xs"/>}{points>0?"+":""}{points.toLocaleString("hr-HR")}</div></div>})}{!view.transactions.length&&<Empty>Nema zabilježenih aktivnosti.</Empty>}</div></section>
      <section className="rounded-3xl border border-white/10 bg-white/[.04]"><div className="p-6"><Title icon={FaGift}>Nagrade za vas</Title></div><div className="grid gap-3 p-5 pt-0">{view.rewards.map((item,index)=><article key={first(item,["id","code"],index)} className="flex items-center justify-between gap-4 rounded-2xl bg-white/[.05] p-4"><div><b>{first(item,["name","title"],"Nagrada")}</b><p className="mt-1 text-sm text-slate-400">{first(item,["description","text"],"")}</p></div><div className="whitespace-nowrap rounded-full bg-violet-500/20 px-3 py-1 text-sm font-bold text-violet-300">{number(first(item,["points_cost","points","cost"],0)).toLocaleString("hr-HR")} bod.</div></article>)}{!view.rewards.length&&<Empty>Trenutno nema dostupnih nagrada.</Empty>}</div></section>
    </div>
  </div></main>;
};
const Title=({icon:Icon,children})=><h2 className="flex items-center gap-3 text-xl font-bold"><span className="rounded-xl bg-violet-500/20 p-2 text-violet-300"><Icon/></span>{children}</h2>;
const Empty=({children})=><div className="p-10 text-center text-slate-500">{children}</div>;
const ErrorState=({onRetry})=><div className="min-h-screen bg-slate-950 px-5 pt-32 text-center text-white"><h1 className="text-2xl font-bold">Podaci trenutno nisu dostupni</h1><button onClick={onRetry} className="mt-5 rounded-xl bg-violet-600 px-5 py-3 font-bold"><FaRedo className="mr-2 inline"/>Pokušaj ponovno</button></div>;
export default LoyaltyPortal;
