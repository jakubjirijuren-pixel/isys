import React,{useEffect,useMemo,useState} from "react";
import * as XLSX from "xlsx";
import "./PhoneDirectory.css";

const clean=v=>String(v??"").trim();
const dial=v=>clean(v).replace(/[^+0-9]/g,"");
const personKey=v=>clean(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("cs").replace(/\b(ing|mgr|bc|mudr|judr|rndr|phdr|phd|dis)\b\.?/g," ").replace(/[^a-z\s]/g," ").split(/\s+/).filter(Boolean).sort().join(" ");
export default function PhoneDirectory({supabase,staff=[] ,buildings=[],isAdmin=false}){
 const [search,setSearch]=useState("");
 const [contacts,setContacts]=useState([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [importRows,setImportRows]=useState(null);
 const [importBusy,setImportBusy]=useState(false);
 const [staffContacts,setStaffContacts]=useState([]);
 const [reload,setReload]=useState(0);
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
 useEffect(()=>{let active=true;supabase.from("foxa_staff_directory_contacts").select("id,full_name,phone,email,position,department").then(({data,error})=>{if(active){if(error)setError(error.message);else setStaffContacts(data||[])}});return()=>{active=false}},[supabase,reload]);
 const buildingById=useMemo(()=>new Map(buildings.map(b=>[String(b.id),b])),[buildings]);
 const entries=useMemo(()=>{
  const employees=staff.map(s=>({id:"staff-"+s.id,name:clean(s.display_name||s.full_name||s.email),position:"SBD Praha 8",phone:clean(s.phone||s.phone_number||s.mobile),email:clean(s.email),object:""})).filter(s=>s.name);
  const imported=staffContacts.map(s=>({id:"import-"+s.id,name:clean(s.full_name),position:[s.position,s.department].filter(Boolean).join(" · ")||"SBD Praha 8",phone:clean(s.phone),email:clean(s.email),object:""}));
  const functionaries=contacts.map(c=>{const b=buildingById.get(String(c.building_id));return {id:"contact-"+c.id,name:clean(c.full_name),position:clean(c.position)||"Člen výboru",phone:clean(c.phone),email:clean(c.email),object:b?[(b.object_number||""),(b.street||b.address||b.name||"")].filter(Boolean).join(" – "):"Objekt nenalezen"}});
  const merged=new Map();
  for(const person of [...employees,...imported,...functionaries]){
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
 },[staff,staffContacts,contacts,buildingById,search]);
 async function readImport(e){
  const file=e.target.files?.[0];e.target.value="";if(!file)return;
  setError("");setImportRows(null);
  try{
   const wb=XLSX.read(await file.arrayBuffer(),{type:"array"});
   const sheet=wb.Sheets[wb.SheetNames[0]];
   const grid=XLSX.utils.sheet_to_json(sheet,{header:1,defval:"",raw:false});
   const normalize=s=>clean(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
   const headerIndex=grid.findIndex(row=>row.some(v=>/prijmeni|jmeno|zamestnanec|pracovnik|telefon|mobil|email|e-mail/.test(normalize(v))));
   if(headerIndex<0)throw Error("Nepodařilo se najít hlavičku tabulky.");
   const headers=grid[headerIndex].map(normalize);
   const col=(...names)=>headers.findIndex(h=>names.some(n=>h.includes(n)));
   const first=col("jmeno"),last=col("prijmeni"),full=col("zamestnanec","pracovnik","jmeno a prijmeni","prijmeni a jmeno");
   const phone=col("mobil","telefon","linka"),email=col("e-mail","email"),position=col("funkce","pozice","pracovni zarazeni"),department=col("oddeleni","utvar","usek");
   if(first<0&&last<0&&full<0)throw Error("V souboru chybí sloupec se jménem.");
   const rows=grid.slice(headerIndex+1).map(row=>({full_name:clean(full>=0?row[full]:[last>=0?row[last]:"",first>=0?row[first]:""].filter(Boolean).join(" ")),phone:clean(phone>=0?row[phone]:""),email:clean(email>=0?row[email]:""),position:clean(position>=0?row[position]:""),department:clean(department>=0?row[department]:"")})).filter(x=>x.full_name&&x.full_name.length>3);
   if(!rows.length)throw Error("Nebyly nalezeny žádné kontakty.");
   setImportRows(rows);
  }catch(err){setError("Import kontaktů: "+err.message)}
 }
 async function saveImport(){
  if(!importRows||importBusy)return;setImportBusy(true);setError("");
  try{
   const normalize=s=>clean(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().split(/\s+/).filter(Boolean).sort().join(" ");
   const existing=new Map(staffContacts.map(x=>[normalize(x.full_name),x]));
   let created=0,updated=0;
   for(const item of importRows){
    const old=existing.get(normalize(item.full_name));
    if(old){
     const changes={phone:item.phone||old.phone,email:item.email||old.email,position:item.position||old.position,department:item.department||old.department};
     const {error}=await supabase.from("foxa_staff_directory_contacts").update(changes).eq("id",old.id);if(error)throw error;updated++;
    }else{
     const {data,error}=await supabase.from("foxa_staff_directory_contacts").insert(item).select("id,full_name").single();if(error)throw error;
     existing.set(normalize(item.full_name),data);created++;
    }
   }
   setImportRows(null);setReload(v=>v+1);alert("Import dokončen: "+created+" nových, "+updated+" aktualizovaných kontaktů.");
  }catch(err){setError("Import se nepodařil dokončit: "+err.message)}
  finally{setImportBusy(false)}
 }
 return <section className="foxa-phonebook">
  <div className="foxa-phonebook-head"><div><h2>Telefonní seznam</h2><p>Zaměstnanci SBD Praha 8 a kontakty spravovaných objektů.</p></div></div>
  <div className="foxa-phonebook-body">\n   {isAdmin&&<div className="foxa-phonebook-import"><label className="secondarybutton filebutton">Importovat zaměstnance SBD (.xls, .xlsx)<input type="file" accept=".xls,.xlsx" onChange={readImport}/></label>{importRows&&<div className="importpanel"><p>Připraveno {importRows.length} kontaktů. Existující jména se aktualizují, nové kontakty se přidají.</p><button type="button" className="primary" disabled={importBusy} onClick={saveImport}>{importBusy?"Importuji…":"Potvrdit import"}</button><button type="button" className="secondarybutton" onClick={()=>setImportRows(null)}>Zrušit</button></div>}</div>}
   <div className="foxa-phonebook-controls"><input type="search" aria-label="Hledat kontakt" placeholder="Hledat podle jména, telefonního čísla nebo e-mailu…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
   {error&&<p role="alert" className="error">Kontakty se nepodařilo načíst: {error}</p>}
   {loading?<p>Načítám kontakty…</p>:<div className="foxa-phonebook-list">{entries.length?entries.map(p=><article className="foxa-phonebook-person" key={p.id}><div><strong>{p.name}</strong><small>{[p.position,p.object].filter(Boolean).join(" · ")}</small></div><div className="foxa-phonebook-links">{p.phone&&<a href={"tel:"+dial(p.phone)}>{p.phone}</a>}{p.email&&<a href={"mailto:"+p.email}>{p.email}</a>}{!p.phone&&!p.email&&<small>Kontaktní údaje nejsou vyplněny</small>}</div></article>):<p>Žádné odpovídající kontakty.</p>}</div>}
  </div>
 </section>;
}
