import React,{useCallback,useEffect,useState} from "react";
import "./BuildingActiveKeys.css";

const formatDate=value=>value?new Date(value).toLocaleString("cs-CZ",{dateStyle:"short",timeStyle:"short"}):"—";

export default function BuildingActiveKeys({supabase,buildingId}){
 const [loans,setLoans]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const load=useCallback(async()=>{
  if(!buildingId)return;
  setLoading(true);setError("");
  const [loansResult,keysResult]=await Promise.all([
   supabase.from("key_loans").select("*").is("returned_at",null).order("loaned_at",{ascending:false}),
   supabase.from("keys").select("id,building_id,label,identifier")
  ]);
  if(loansResult.error||keysResult.error){
   setError("Nepodařilo se načíst aktuálně zapůjčené klíče.");
   setLoans([]);
  }else{
   const keys=new Map((keysResult.data||[]).map(key=>[String(key.id),key]));
   const active=(loansResult.data||[]).filter(loan=>{
    const id=loan.building_id||keys.get(String(loan.key_id))?.building_id;
    return String(id)===String(buildingId);
   }).map(loan=>{
    const key=keys.get(String(loan.key_id));
    return {...loan,displayKey:loan.key_description||[key?.label,key?.identifier&&"("+key.identifier+")"].filter(Boolean).join(" ")||"Neuvedené klíče"};
   });
   setLoans(active);
  }
  setLoading(false);
 },[supabase,buildingId]);
 useEffect(()=>{let alive=true;const refresh=()=>{if(alive)load()};refresh();window.addEventListener("focus",refresh);return()=>{alive=false;window.removeEventListener("focus",refresh)}},[load]);
 return <div className="detailsection building-active-keys">
  <div className="building-active-keys-heading"><div><h3>Aktuálně zapůjčené klíče</h3><span>{loading?"Načítání…":error?"Nedostupné":loans.length+" aktivních výpůjček"}</span></div><button type="button" className="secondarybutton" onClick={load} disabled={loading}>Obnovit</button></div>
  {error?<p className="building-active-keys-error" role="alert">{error}</p>:loading?<p>Načítání výpůjček…</p>:loans.length===0?<p>Od tohoto objektu nejsou aktuálně zapůjčené žádné klíče.</p>:<div className="building-active-keys-list">{loans.map(loan=><article className="building-active-key-item" key={loan.id}>
   <div className="building-active-key-main"><strong>{loan.displayKey}</strong><span>Zapůjčeno: {formatDate(loan.loaned_at)}</span></div>
   <div className="building-active-key-person"><span>Vypůjčil(a)</span><strong>{loan.borrower_name||"Neuvedeno"}</strong>{loan.borrower_company&&<small>{loan.borrower_company}</small>}</div>
   <span className="building-active-key-status">Nevráceno</span>
  </article>)}</div>}
 </div>;
}
