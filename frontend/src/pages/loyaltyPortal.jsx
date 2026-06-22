import React,{useCallback,useEffect,useMemo,useRef,useState} from "react";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import {
  FaArrowUp,FaBolt,FaCoins,FaCrown,FaFileInvoice,FaGift,FaHistory,
  FaPalette,FaQrcode,FaRedo,FaTicketAlt,FaTimes,
} from "react-icons/fa";
import {toast} from "sonner";
import useStore from "../store";
import {
  getMyLoyalty,redeemMyReward,updateMyLoyaltyBranding,
} from "../services/loyaltyPortalServices.js";

const first=(object,keys,fallback)=>{for(const key of keys)if(object?.[key]!==undefined&&object[key]!==null)return object[key];return fallback;};
const list=(object,keys)=>{const value=first(object,keys,[]);return Array.isArray(value)?value:[];};
const number=value=>Number(value||0);
const date=value=>value?new Intl.DateTimeFormat("hr-HR",{dateStyle:"medium"}).format(new Date(value)):"";
const money=(value,currency="EUR")=>new Intl.NumberFormat("hr-HR",{style:"currency",currency}).format(number(value));
const defaultBranding={
  brand_name:"FlowApp Loyalty",brand_tagline:"Nagrađujemo vašu vjernost",
  primary_color:"#7C3AED",secondary_color:"#2563EB",accent_color:"#FBBF24",
  background_color:"#080B18",surface_color:"#111827",text_color:"#FFFFFF",
  muted_text_color:"#CBD5E1",
};

const LoyaltyPortal=()=>{
  const permissions=useStore(state=>state.permissions);
  const canBrand=permissions.includes("manage_loyalty_branding");
  const [response,setResponse]=useState(null);
  const [loading,setLoading]=useState(true);
  const [redeeming,setRedeeming]=useState(null);
  const [qr,setQr]=useState("");
  const [brandingOpen,setBrandingOpen]=useState(false);
  const [brandingForm,setBrandingForm]=useState(defaultBranding);
  const [savingBranding,setSavingBranding]=useState(false);
  const barcodeRef=useRef(null);
  const load=useCallback(async()=>{
    setLoading(true);
    try{setResponse((await getMyLoyalty()).data);}
    catch(error){toast.error(error.response?.data?.error||"Loyalty podatke nije moguće učitati.");}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{if(response?.branding)setBrandingForm({...defaultBranding,...response.branding});},[response]);
  const view=useMemo(()=>{
    const raw=response?.data||{};
    const member=first(raw,["member","customer","user","profile"],raw);
    const balance=number(first(member,["points_balance","balance","points","available_points"],first(raw,["points_balance","balance","points","available_points"],0)));
    return {
      member,balance,
      lifetime:number(first(member,["lifetime_points","total_points","earned_points"],balance)),
      tier:first(member,["tier","level","status_name","rank"],"Član"),
      nextTier:first(member,["next_tier","next_level"],""),
      progress:number(first(member,["tier_progress","progress"],0)),
      pointsToNext:number(first(member,["points_to_next_tier"],0)),
      qrValue:first(member,["qr_value","card_token","member_number","external_id"],response?.customer?.external_id||response?.customer?.email),
      barcodeValue:first(member,["barcode_value","barcode","member_number","external_id"],response?.customer?.external_id||response?.customer?.email),
      transactions:list(raw,["transactions","activity","history","point_transactions"]),
      rewards:list(raw,["rewards","available_rewards","benefits"]),
      promotions:list(raw,["promotions","campaigns","offers"]),
      coupons:list(raw,["coupons","redemptions","vouchers"]),
      receipts:list(raw,["receipts","digital_receipts","invoices"]),
    };
  },[response]);
  useEffect(()=>{
    if(!view.qrValue){setQr("");return;}
    QRCode.toDataURL(String(view.qrValue),{width:240,margin:1,color:{dark:"#111827",light:"#ffffff"}})
      .then(setQr).catch(()=>setQr(""));
  },[view.qrValue]);
  useEffect(()=>{
    if(!barcodeRef.current||!view.barcodeValue)return;
    try{
      JsBarcode(barcodeRef.current,String(view.barcodeValue),{
        format:"CODE128",width:1.65,height:58,margin:0,displayValue:true,
        fontSize:13,lineColor:"#111827",background:"#ffffff",
      });
    }catch{barcodeRef.current.innerHTML="";}
  },[view.barcodeValue]);
  const redeem=async reward=>{
    if(view.balance<number(first(reward,["points_cost","points","cost"],0)))return toast.error("Nemate dovoljno bodova.");
    setRedeeming(reward.id);
    try{
      await redeemMyReward(reward.id);
      toast.success("Nagrada je aktivirana. Kupon je spremljen u vaš portal.");
      await load();
    }catch(error){toast.error(error.response?.data?.error||"Nagradu nije moguće aktivirati.");}
    finally{setRedeeming(null);}
  };
  const saveBranding=async event=>{
    event.preventDefault();
    setSavingBranding(true);
    try{
      const {data}=await updateMyLoyaltyBranding(brandingForm);
      setResponse(current=>({...current,branding:{...current.branding,...data}}));
      setBrandingOpen(false);
      toast.success("Izgled Loyalty portala je spremljen.");
    }catch(error){toast.error(error.response?.data?.error||"Izgled nije moguće spremiti.");}
    finally{setSavingBranding(false);}
  };

  if(loading)return <div className="min-h-screen bg-slate-950 pt-32 text-center text-white">Učitavanje vaših pogodnosti…</div>;
  if(!response)return <ErrorState onRetry={load}/>;
  if(!response.configured)return <PortalNotice title="Loyalty integracija je spremna">Potrebno je još unijeti adresu i API ključ vanjskog Loyalty sustava na serveru.</PortalNotice>;
  if(response.source==="local"&&!response.member_found&&!canBrand)return <PortalNotice title="Članstvo još nije povezano">Administrator treba povezati vaš korisnički račun s članom lokalnog Loyalty programa.</PortalNotice>;

  const theme={...defaultBranding,...response.branding};
  const name=first(view.member,["full_name","name"],`${response.customer.first_name||""} ${response.customer.last_name||""}`.trim());
  return <main className="min-h-screen px-4 pb-14 pt-24 sm:px-7" style={{backgroundColor:theme.background_color,color:theme.text_color}}><div className="mx-auto max-w-6xl">
    {canBrand&&<div className="mb-4 flex justify-end"><button onClick={()=>setBrandingOpen(true)} className="rounded-xl px-4 py-2.5 font-semibold shadow-lg" style={{backgroundColor:theme.accent_color,color:theme.background_color}}><FaPalette className="mr-2 inline"/>Prilagodi izgled</button></div>}
    <section className="relative overflow-hidden rounded-[2rem] p-7 shadow-2xl sm:p-10" style={{backgroundImage:`linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`}}>
      <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10"/>
      <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="flex flex-wrap gap-2">
            <Pill><FaCrown/>{view.tier}</Pill>
            {response.demo&&<Pill tone="bg-amber-300 text-slate-950">DEMO PODACI</Pill>}
          </div>
          <div className="mt-5 flex items-center gap-3">{theme.logo&&<img src={theme.logo} alt={theme.brand_name} className="h-12 max-w-40 rounded-lg bg-white object-contain p-1"/>}<div><p className="font-bold">{theme.brand_name}</p><p className="text-sm opacity-80">{theme.brand_tagline}</p></div></div>
          <p className="mt-5 opacity-80">Dobro došli natrag</p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{name}</h1>
          <p className="mt-2 text-violet-100">{response.customer.company_name}</p>
          {view.nextTier&&<div className="mt-7 max-w-xl">
            <div className="mb-2 flex justify-between text-sm"><span>Napredak prema razini {view.nextTier}</span><b>{Math.round(view.progress)}%</b></div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-950/30"><div className="h-full rounded-full" style={{width:`${Math.min(100,view.progress)}%`,backgroundColor:theme.accent_color}}/></div>
            <p className="mt-2 text-sm opacity-80">Još {view.pointsToNext.toLocaleString("hr-HR")} bodova do sljedeće razine.</p>
          </div>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-white/20 bg-slate-950/25 p-6 backdrop-blur">
            <p className="text-sm opacity-80">Raspoloživi bodovi</p>
            <div className="mt-1 flex items-baseline gap-2"><FaCoins className="text-2xl" style={{color:theme.accent_color}}/><b className="text-5xl">{view.balance.toLocaleString("hr-HR")}</b></div>
            <p className="mt-2 text-sm opacity-80">Ukupno osvojeno: {view.lifetime.toLocaleString("hr-HR")}</p>
          </div>
          <div className="min-w-72 rounded-3xl bg-white p-4 text-slate-950">
            <div className="flex items-center gap-4">
              {qr?<img src={qr} alt="QR Loyalty kartica" className="h-24 w-24 rounded-xl"/>:<FaQrcode className="text-6xl"/>}
              <div><b>Digitalna kartica</b><p className="mt-1 text-xs text-slate-500">{first(view.member,["member_number","external_id"],"Loyalty član")}</p><p className="mt-2 text-xs text-slate-400">QR i barkod jedinstveni su za ovog člana.</p></div>
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white p-3">
              <svg ref={barcodeRef} className="mx-auto max-w-full" aria-label={`Barkod ${view.barcodeValue||""}`}/>
            </div>
          </div>
        </div>
      </div>
    </section>

    {!!view.promotions.length&&<section className="mt-7"><Title icon={FaBolt} accent={theme.accent_color}>Aktualne pogodnosti</Title><div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{view.promotions.map((item,index)=><article key={first(item,["id","code"],index)} className="rounded-3xl border p-6" style={{backgroundImage:`linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`,borderColor:`${theme.accent_color}55`}}><span className="text-xs font-bold uppercase tracking-widest" style={{color:theme.accent_color}}>{first(item,["badge","type","category"],"Posebna ponuda")}</span><h3 className="mt-2 text-xl font-bold">{first(item,["title","name"],"Pogodnost")}</h3><p className="mt-2 text-sm leading-6 opacity-80">{first(item,["message","description","text"],"")}</p></article>)}</div></section>}

    <div className="mt-7 grid gap-7 lg:grid-cols-2">
      <Panel title="Vaši kuponi" icon={FaTicketAlt} theme={theme}>{view.coupons.map((item,index)=><article key={first(item,["id","coupon_code"],index)} className="m-4 rounded-2xl border border-dashed p-4" style={{borderColor:`${theme.accent_color}88`,backgroundColor:`${theme.accent_color}18`}}><div className="flex justify-between gap-4"><div><b>{first(item,["reward_name","name","title"],"Loyalty kupon")}</b><p className="mt-1 font-mono text-sm" style={{color:theme.accent_color}}>{first(item,["coupon_code","code"],"")}</p></div><span className="h-fit rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300">{first(item,["status"],"active")}</span></div><p className="mt-3 text-xs opacity-60">Vrijedi do {date(first(item,["expires_at","valid_until"],""))||"daljnjega"}</p></article>)}{!view.coupons.length&&<Empty>Još nemate aktiviranih kupona.</Empty>}</Panel>
      <Panel title="Nagrade za vas" icon={FaGift} theme={theme}>{view.rewards.map((item,index)=>{const cost=number(first(item,["points_cost","points","cost"],0));return <article key={first(item,["id","code"],index)} className="m-4 flex items-center justify-between gap-4 rounded-2xl p-4" style={{backgroundColor:`${theme.text_color}0D`}}><div><b>{first(item,["name","title"],"Nagrada")}</b><p className="mt-1 text-sm opacity-60">{first(item,["description","text"],"")}</p><span className="mt-2 inline-block text-sm font-bold" style={{color:theme.accent_color}}>{cost.toLocaleString("hr-HR")} bod.</span></div><button onClick={()=>redeem(item)} disabled={redeeming===item.id||view.balance<cost} className="rounded-xl px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40" style={{backgroundColor:theme.primary_color,color:theme.text_color}}>{redeeming===item.id?"Aktiviranje…":"Aktiviraj"}</button></article>})}{!view.rewards.length&&<Empty>Trenutno nema dostupnih nagrada.</Empty>}</Panel>
      <Panel title="Posljednje aktivnosti" icon={FaHistory} theme={theme}>{view.transactions.slice(0,12).map((item,index)=>{const points=number(first(item,["points","point_delta","amount_points"],0));return <div key={first(item,["id"],index)} className="flex items-center justify-between gap-4 border-t px-6 py-4" style={{borderColor:`${theme.text_color}18`}}><div><b>{first(item,["description","title","reference"],"Loyalty transakcija")}</b><p className="mt-1 text-xs opacity-60">{date(first(item,["created_at","date","transaction_date"],""))}</p></div><div className={`flex items-center gap-1 font-bold ${points>=0?"text-emerald-400":"text-rose-400"}`}>{points>=0&&<FaArrowUp className="text-xs"/>}{points>0?"+":""}{points.toLocaleString("hr-HR")}</div></div>})}{!view.transactions.length&&<Empty>Nema zabilježenih aktivnosti.</Empty>}</Panel>
      <Panel title="Digitalni računi" icon={FaFileInvoice} theme={theme}>{view.receipts.map((item,index)=><article key={first(item,["id","receipt_number"],index)} className="border-t px-6 py-4" style={{borderColor:`${theme.text_color}18`}}><div className="flex justify-between gap-4"><div><b>{first(item,["merchant_name"],"Prodajno mjesto")}</b><p className="mt-1 text-xs opacity-60">{first(item,["receipt_number"],"")} · {date(first(item,["purchased_at","created_at"],""))}</p></div><b>{money(first(item,["total_amount","amount"],0),first(item,["currency"],"EUR"))}</b></div>{Array.isArray(item.items)&&item.items.length>0&&<div className="mt-3 space-y-1 text-xs opacity-60">{item.items.map((line,i)=><div key={i} className="flex justify-between"><span>{line.name||line.description} {line.quantity?`× ${line.quantity}`:""}</span><span>{line.total!=null?money(line.total,item.currency||"EUR"):""}</span></div>)}</div>}</article>)}{!view.receipts.length&&<Empty>Nema dostupnih digitalnih računa.</Empty>}</Panel>
    </div>
  </div>{brandingOpen&&<BrandingModal form={brandingForm} setForm={setBrandingForm} onClose={()=>setBrandingOpen(false)} onSubmit={saveBranding} saving={savingBranding}/>}</main>;
};

const Pill=({children,tone="bg-white/15 text-white"})=><div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${tone}`}>{children}</div>;
const Title=({icon:Icon,children,accent="#A78BFA"})=><h2 className="flex items-center gap-3 text-xl font-bold"><span className="rounded-xl p-2" style={{backgroundColor:`${accent}22`,color:accent}}><Icon/></span>{children}</h2>;
const Panel=({title,icon:Icon,children,theme})=><section className="overflow-hidden rounded-3xl border" style={{backgroundColor:theme.surface_color,borderColor:`${theme.text_color}18`}}><div className="p-6"><Title icon={Icon} accent={theme.accent_color}>{title}</Title></div>{children}</section>;
const Empty=({children})=><div className="p-10 text-center text-slate-500">{children}</div>;
const BrandingModal=({form,setForm,onClose,onSubmit,saving})=>{
  const colors=[
    ["primary_color","Primarna"],["secondary_color","Sekundarna"],["accent_color","Naglasna"],
    ["background_color","Pozadina"],["surface_color","Kartice"],["text_color","Tekst"],
    ["muted_text_color","Sekundarni tekst"],
  ];
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4"><form onSubmit={onSubmit} className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white text-slate-900 shadow-2xl">
    <div className="flex items-center justify-between border-b p-6"><div><h2 className="text-2xl font-bold">Branding Loyalty portala</h2><p className="mt-1 text-sm text-slate-500">Promjene će biti vidljive svim članovima vaše tvrtke.</p></div><button type="button" onClick={onClose}><FaTimes/></button></div>
    <div className="grid gap-6 p-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-4">
        <BrandField label="Naziv brenda"><input value={form.brand_name||""} maxLength={120} onChange={e=>setForm({...form,brand_name:e.target.value})}/></BrandField>
        <BrandField label="Slogan"><input value={form.brand_tagline||""} maxLength={200} onChange={e=>setForm({...form,brand_tagline:e.target.value})}/></BrandField>
        <div className="grid grid-cols-2 gap-3">{colors.map(([key,label])=><label key={key} className="rounded-xl border p-3"><span className="mb-2 block text-sm font-semibold">{label}</span><div className="flex items-center gap-2"><input type="color" value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value.toUpperCase()})} className="h-10 w-12"/><input value={form[key]} pattern="^#[0-9A-Fa-f]{6}$" required onChange={e=>setForm({...form,[key]:e.target.value})} className="min-w-0 flex-1 rounded-lg border p-2 font-mono text-sm"/></div></label>)}</div>
      </div>
      <div><p className="mb-3 text-sm font-bold">Pregled uživo</p><div className="overflow-hidden rounded-3xl p-6 shadow-xl" style={{backgroundColor:form.background_color,color:form.text_color}}><div className="rounded-2xl p-6" style={{backgroundImage:`linear-gradient(135deg, ${form.primary_color}, ${form.secondary_color})`}}><p className="text-sm opacity-80">{form.brand_tagline}</p><h3 className="mt-1 text-2xl font-bold">{form.brand_name||"Vaš Loyalty"}</h3><div className="mt-6 h-2 rounded-full bg-black/20"><div className="h-2 w-2/3 rounded-full" style={{backgroundColor:form.accent_color}}/></div></div><div className="mt-4 rounded-2xl border p-5" style={{backgroundColor:form.surface_color,borderColor:`${form.text_color}22`}}><div className="text-sm" style={{color:form.muted_text_color}}>Raspoloživi bodovi</div><div className="mt-1 text-4xl font-bold">2.840</div><button type="button" className="mt-5 rounded-xl px-4 py-2 font-bold" style={{backgroundColor:form.primary_color,color:form.text_color}}>Aktiviraj nagradu</button></div></div></div>
    </div>
    <div className="flex justify-end gap-3 border-t p-6"><button type="button" onClick={onClose} className="px-5 py-3">Odustani</button><button disabled={saving} className="rounded-xl bg-violet-600 px-5 py-3 font-bold text-white disabled:opacity-50">{saving?"Spremanje…":"Spremi izgled"}</button></div>
  </form></div>;
};
const BrandField=({label,children})=><label><span className="mb-2 block text-sm font-semibold">{label}</span>{React.cloneElement(children,{className:"w-full rounded-xl border p-3"})}</label>;
const PortalNotice=({title,children})=><div className="min-h-screen bg-slate-950 px-5 pt-28 text-white"><div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center"><FaBolt className="mx-auto text-4xl text-violet-400"/><h1 className="mt-4 text-2xl font-bold">{title}</h1><p className="mt-3 text-slate-300">{children}</p></div></div>;
const ErrorState=({onRetry})=><div className="min-h-screen bg-slate-950 px-5 pt-32 text-center text-white"><h1 className="text-2xl font-bold">Podaci trenutno nisu dostupni</h1><button onClick={onRetry} className="mt-5 rounded-xl bg-violet-600 px-5 py-3 font-bold"><FaRedo className="mr-2 inline"/>Pokušaj ponovno</button></div>;
export default LoyaltyPortal;
