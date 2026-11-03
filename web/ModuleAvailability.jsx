import React,{useEffect,useMemo,useState} from "react";
import "./module-availability.css";
export const managedModules=["Přehled","Objekty","Kontroly","Technické kontroly","Evidence klíčů","Docházka","Dovolené","Tiskopisy","Kniha odchozí pošty","Úkoly","Wiki","Hlasování SVJ","Elektronické podpisy","Android aplikace"];
const groups=[{title:"Správa a evidence",description:"Každodenní práce s objekty a kontrolami",modules:["Přehled","Objekty","Kontroly","Technické kontroly","Evidence klíčů"]},{title:"Zaměstnanci a provoz",description:"Personální a provozní agenda",modules:["Docházka","Dovolené","Úkoly"]},{title:"Dokumenty a znalosti",description:"Tiskopisy, korespondence a interní informace",modules:["Tiskopisy","Kniha odchozí pošty","Wiki","Hlasování SVJ","Elektronické podpisy","Android aplikace"]}];
export default function ModuleAvailability({supabase}){
 const [states,setStates]=useState({}),[loading,setLoading]=useState(true),[busy,setBusy]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState(""),[query,setQuery]=useState("");
 const load=async()=>{setLoading(true);setError("");const {data,error:e}=await supabase.from("isys_module_availability").select("module,enabled");if(e)setError("Načtení dostupnosti modulů selhalo: "+e.message+" — Spusť module-availability.sql.");else{setStates(Object.fromEntries((data||[]).map(x=>[x.module,x.enabled])));setError("")}setLoading(false)};
 useEffect(()=>{load()},[]);
 const toggle=async(module,enabled)=>{
  setBusy(module);setError("");setNotice("");
  try{const {error:e}=await supabase.rpc("isys_set_module_availability",{target_module:module,is_enabled:enabled});
   if(e)setError("Změna dostupnosti selhala: "+e.message);
   else{setStates(prev=>({...prev,[module]:enabled}));setNotice(module+(enabled?" je znovu dostupný.":" je nyní v režimu údržby pro ostatní uživatele."))}
  }catch(e){setError("Změna dostupnosti selhala: "+(e?.message||"Neznámá chyba"))}finally{setBusy("")}
 };
 const available=managedModules.filter(m=>states[m]===true).length;
 const maintenance=managedModules.filter(m=>states[m]===false).length;
 const filtered=useMemo(()=>groups.map(g=>({...g,modules:g.modules.filter(m=>m.toLocaleLowerCase("cs").includes(query.trim().toLocaleLowerCase("cs")))})).filter(g=>g.modules.length),[query]);
 return <section className="module-availability" aria-label="Správa dostupnosti modulů">
  <div className="module-availability-heading"><div><span className="module-availability-eyebrow">ADMINISTRACE SYSTÉMU</span><h2>Dostupnost modulů</h2><p>Spravujte dostupnost jednotlivých částí FOXA. Moduly v údržbě zůstávají přístupné administrátorům.</p></div><button type="button" className="module-availability-refresh" disabled={loading||!!busy} onClick={load} aria-label="Obnovit stav modulů">↻ <span>Obnovit</span></button></div>
  <div className="module-availability-stats"><div><strong>{loading?"–":available}</strong><span><i className="module-availability-dot is-online"/>Dostupné moduly</span></div><div><strong>{loading?"–":maintenance}</strong><span><i className="module-availability-dot is-maintenance"/>V režimu údržby</span></div><div><strong>{managedModules.length}</strong><span>Celkem modulů</span></div></div>
  <div className="module-availability-toolbar"><label className="module-availability-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Vyhledat modul…" value={query} onChange={e=>setQuery(e.target.value)} aria-label="Vyhledat modul"/></label><span className="module-availability-hint">Změny se ukládají okamžitě</span></div>
  {error&&<p className="module-availability-message is-error" role="alert">{error}</p>}{notice&&<p className="module-availability-message is-success" role="status">{notice}</p>}
  {loading?<p className="module-availability-loading" role="status">Načítám dostupnost modulů…</p>:filtered.length===0?<p className="module-availability-empty">Žádný modul neodpovídá hledání.</p>:filtered.map(group=><div className="module-availability-group" key={group.title}><div className="module-availability-group-heading"><div><h3>{group.title}</h3><p>{group.description}</p></div><span className="module-availability-group-count">{group.modules.length}</span></div><div className="module-availability-list">{group.modules.map(module=>{const enabled=states[module]===true,unknown=states[module]===undefined,working=busy===module;return <div key={module} className={"module-availability-row"+(!enabled?" is-maintenance":"")}><div className="module-availability-row-info"><strong>{module}</strong><span className={"module-availability-status "+(enabled?"is-online":"is-maintenance")}><i className="module-availability-dot"/>{unknown?"Stav není k dispozici":working?"Ukládám změnu…":enabled?"Dostupný":"Režim údržby"}</span></div><label className="module-availability-toggle"><input type="checkbox" role="switch" checked={enabled} disabled={!!busy||unknown} onChange={e=>toggle(module,e.target.checked)} aria-label={module+": "+(enabled?"dostupný":"režim údržby")}/><span className="module-availability-track" aria-hidden="true"/></label></div>})}</div></div>)}
  <p className="module-availability-footnote">Při vypnutí modulu se ostatním uživatelům zobrazí upozornění na údržbu. Administrátoři mají přístup i nadále.</p>
 </section>;
}
