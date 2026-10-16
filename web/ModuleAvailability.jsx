import React,{useEffect,useState} from "react";
import "./module-availability.css";
export const managedModules=["Přehled","Objekty","Kontroly","Evidence klíčů","Docházka","Úkoly","Wiki"];
export default function ModuleAvailability({supabase}){
 const [states,setStates]=useState({}),[loading,setLoading]=useState(true),[busy,setBusy]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const load=async()=>{setLoading(true);const {data,error:e}=await supabase.from("isys_module_availability").select("module,enabled");if(e)setError("Načtení dostupnosti modulů selhalo: "+e.message+" — Spusť module-availability.sql.");else{setStates(Object.fromEntries((data||[]).map(x=>[x.module,x.enabled])));setError("")}setLoading(false)};
 useEffect(()=>{load()},[]);
 const toggle=async(module,enabled)=>{
  setBusy(module);setError("");setNotice("");
  const {error:e}=await supabase.rpc("isys_set_module_availability",{target_module:module,is_enabled:enabled});
  if(e)setError("Změna dostupnosti selhala: "+e.message);
  else{setStates(prev=>({...prev,[module]:enabled}));setNotice(module+(enabled?" je znovu dostupný.":" je nyní v režimu údržby pro ostatní uživatele."))}
  setBusy("");
 };
 return <section className="module-availability"><div className="module-availability-heading"><div><h2>Dostupnost modulů</h2><p>Vypnutý modul zůstává přístupný administrátorům. Ostatním se zobrazí upozornění na údržbu.</p></div><button type="button" className="secondarybutton" disabled={loading||!!busy} onClick={load}>Obnovit</button></div>{error&&<p className="error" role="alert">{error}</p>}{notice&&<p className="notice" role="status">{notice}</p>}{loading?<p>Načítám dostupnost…</p>:managedModules.map(module=><label key={module} className="module-availability-row"><span><strong>{module}</strong><small>{states[module]===false?"Režim údržby":"Dostupný"}</small></span><input type="checkbox" checked={states[module]!==false} disabled={!!busy||states[module]===undefined} onChange={e=>toggle(module,e.target.checked)} aria-label={"Dostupnost modulu "+module}/></label>)}</section>;
}
