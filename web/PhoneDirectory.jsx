import React,{useEffect,useMemo,useState} from "react";
import "./PhoneDirectory.css";

const clean=v=>String(v??"").trim();
const dial=v=>clean(v).replace(/[^+0-9]/g,"");
const personKey=v=>clean(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("cs").replace(/\b(ing|mgr|bc|mudr|judr|rndr|phdr|phd|dis)\b\.?/g," ").replace(/[^a-z\s]/g," ").split(/\s+/).filter(Boolean).sort().join(" ");
export default function PhoneDirectory({supabase,staff=[] ,buildings=[]}){
 const [search,setSearch]=useState("");
 const [contacts,setContacts]=useState([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 useEffect(()=>{
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
 },[supabase]);
 const buildingById=useMemo(()=>new Map(buildings.map(b=>[String(b.id),b])),[buildings]);
 const entries=useMemo(()=>{
  const employees=staff.map(s=>({id:"staff-"+s.id,name:clean(s.display_name||s.full_name||s.email),position:"SBD Praha 8",phone:clean(s.phone||s.phone_number||s.mobile),email:clean(s.email),object:""})).filter(s=>s.name);
  const functionaries=contacts.map(c=>{const b=buildingById.get(String(c.building_id));return {id:"contact-"+c.id,name:clean(c.full_name),position:clean(c.position)||"Člen výboru",phone:clean(c.phone),email:clean(c.email),object:b?[(b.object_number||""),(b.street||b.address||b.name||"")].filter(Boolean).join(" – "):"Objekt nenalezen"}});
  const merged=new Map();
  for(const person of [...employees,...functionaries]){
   const key=personKey(person.name)||person.id;
   const existing=merged.get(key);
   if(!existing){merged.set(key,{...person,positions:[person.position],objects:person.object?[person.object]:[]});continue}
   // Stejný člověk může být současně zaměstnancem SBD i kontaktem objektu.
   // Upřednostníme skutečně vyplněné kontaktní údaje z importu Domus.
   if(!existing.phone&&person.phone)existing.phone=person.phone;
   if(!existing.email&&person.email)existing.email=person.email;
   if(!existing.phone&&!existing.email&&person.phone)existing.phone=person.phone;
   if(!existing.positions.includes(person.position))existing.positions.push(person.position);
   if(person.object&&!existing.objects.includes(person.object))existing.objects.push(person.object);
   if(person.position!=="SBD Praha 8"&&person.phone&&person.email)existing.name=person.name;
  }
  const people=[...merged.values()].map(p=>({...p,position:p.positions.join(" · "),object:p.objects.join("; ")}));
  const q=search.toLocaleLowerCase("cs").trim();
  const digits=q.replace(/[^0-9]/g,"");
  return people.filter(p=>!q||[p.name,p.phone,p.email].some(v=>v.toLocaleLowerCase("cs").includes(q))||(digits.length>=3&&p.phone.replace(/[^0-9]/g,"").includes(digits))).sort((a,b)=>a.name.localeCompare(b.name,"cs"));
 },[staff,contacts,buildingById,search]);
 return <section className="foxa-phonebook">
  <div className="foxa-phonebook-head"><div><h2>Telefonní seznam</h2><p>Zaměstnanci SBD Praha 8 a kontakty spravovaných objektů.</p></div></div>
  <div className="foxa-phonebook-body">
   <div className="foxa-phonebook-controls"><input type="search" aria-label="Hledat kontakt" placeholder="Hledat podle jména, telefonního čísla nebo e-mailu…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
   {error&&<p role="alert" className="error">Kontakty se nepodařilo načíst: {error}</p>}
   {loading?<p>Načítám kontakty…</p>:<div className="foxa-phonebook-list">{entries.length?entries.map(p=><article className="foxa-phonebook-person" key={p.id}><div><strong>{p.name}</strong><small>{[p.position,p.object].filter(Boolean).join(" · ")}</small></div><div className="foxa-phonebook-links">{p.phone&&<a href={"tel:"+dial(p.phone)}>{p.phone}</a>}{p.email&&<a href={"mailto:"+p.email}>{p.email}</a>}{!p.phone&&!p.email&&<small>Kontaktní údaje nejsou vyplněny</small>}</div></article>):<p>Žádné odpovídající kontakty.</p>}</div>}
  </div>
 </section>;
}
