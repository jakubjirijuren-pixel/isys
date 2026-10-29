import React,{useEffect,useMemo,useState} from "react";
import "./PhoneDirectory.css";

const clean=v=>String(v??"").trim();
const dial=v=>clean(v).replace(/[^+0-9]/g,"");
export default function PhoneDirectory({supabase,staff=[] ,buildings=[]}){
 const [open,setOpen]=useState(false);
 const [search,setSearch]=useState("");
 const [tab,setTab]=useState("staff");
 const [contacts,setContacts]=useState([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 useEffect(()=>{
  if(!open)return;
  let alive=true;setLoading(true);setError("");
  (async()=>{
   try{
    const all=[];
    for(let from=0;;from+=1000){
     const {data,error}=await supabase.from("foxa_building_committee_contacts").select("id,building_id,full_name,position,phone,email").range(from,from+999);
     if(error)throw error;
     all.push(...(data||[]));if(!data||data.length<1000)break;
    }
    if(alive)setContacts(all);
   }catch(e){if(alive)setError(e.message)}
   finally{if(alive)setLoading(false)}
  })();
  return()=>{alive=false};
 },[open,supabase]);
 const buildingById=useMemo(()=>new Map(buildings.map(b=>[String(b.id),b])),[buildings]);
 const entries=useMemo(()=>{
  const people=tab==="staff"?staff.map(s=>({id:s.id,name:clean(s.display_name||s.full_name||s.email),position:"SBD Praha 8",phone:clean(s.phone||s.phone_number||s.mobile),email:clean(s.email),object:""})).filter(s=>s.name):
   contacts.filter(c=>!/referent|správce|spravce/i.test(c.position||"")).map(c=>{const b=buildingById.get(String(c.building_id));return {id:c.id,name:c.full_name,position:c.position||"Člen výboru",phone:clean(c.phone),email:clean(c.email),object:b?[(b.object_number||""),(b.street||b.address||b.name||"")].filter(Boolean).join(" – "):"Objekt nenalezen"}});
  const q=search.toLocaleLowerCase("cs").trim();
  return people.filter(p=>!q||[p.name,p.position,p.phone,p.email,p.object].join(" ").toLocaleLowerCase("cs").includes(q)).sort((a,b)=>a.name.localeCompare(b.name,"cs"));
 },[tab,staff,contacts,buildingById,search]);
 return <section className="foxa-phonebook">
  <div className="foxa-phonebook-head"><div><h2>Telefonní seznam</h2><p>Kontakty na zaměstnance SBD Praha 8 a funkcionáře spravovaných objektů.</p></div><button type="button" className="secondarybutton" onClick={()=>setOpen(v=>!v)} aria-expanded={open}>{open?"Skrýt seznam":"Otevřít telefonní seznam"}</button></div>
  {open&&<div className="foxa-phonebook-body">
   <div className="foxa-phonebook-controls"><div className="foxa-phonebook-tabs"><button type="button" className={tab==="staff"?"active":""} onClick={()=>{setTab("staff");setSearch("")}}>SBD Praha 8</button><button type="button" className={tab==="committees"?"active":""} onClick={()=>{setTab("committees");setSearch("")}}>Výbory a domovní funkcionáři</button></div><input aria-label="Hledat kontakt" placeholder="Hledat jméno, objekt, telefon nebo e-mail…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
   {error&&<p role="alert" className="error">Kontakty se nepodařilo načíst: {error}</p>}
   {loading&&tab==="committees"?<p>Načítám kontakty…</p>:<div className="foxa-phonebook-list">{entries.length?entries.map((p,i)=><article className="foxa-phonebook-person" key={p.id||i}><div><strong>{p.name}</strong><small>{[p.position,p.object].filter(Boolean).join(" · ")}</small></div><div className="foxa-phonebook-links">{p.phone&&<a href={"tel:"+dial(p.phone)}>{p.phone}</a>}{p.email&&<a href={"mailto:"+p.email}>{p.email}</a>}{!p.phone&&!p.email&&<small>Kontaktní údaje nejsou vyplněny</small>}</div></article>):<p>Žádné odpovídající kontakty.</p>}</div>}
  </div>}
 </section>;
}
