import React,{useEffect,useMemo,useState} from "react";
import * as XLSX from "xlsx";
import "./PhoneDirectory.css";

const clean=v=>String(v??"").trim();
const dial=v=>clean(v).replace(/[^+0-9]/g,"");
const emailList=v=>[...new Set((clean(v).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)||[]).map(x=>x.toLowerCase()))];
const mobileOnly=v=>{const parts=clean(v).split(/[;,\n]+/).map(x=>x.trim());return parts.filter(x=>{const d=x.replace(/\D/g,"");return d.length===9||d.length===12&&d.startsWith("420")}).join(", ")};
const extensionList=v=>[...new Set(clean(v).split(/[;,\n]+/).flatMap(part=>{
 const explicit=[...part.matchAll(/(?:linka|klapka|interní(?:\s+linka)?|ext\.?|extension|pobočka)\s*[:#.-]?\s*(\d{2,6})/gi)].map(m=>m[1]);
 const raw=part.trim();
 if(/^\d{2,6}$/.test(raw))explicit.push(raw);
 return explicit;
}))];
const extensionOnly=v=>extensionList(v).join(", ");
const personKey=v=>clean(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("cs").replace(/\b(ing|mgr|bc|mudr|judr|rndr|phdr|phd|dis)\b\.?/g," ").replace(/[^a-z\s]/g," ").split(/\s+/).filter(Boolean).sort().join(" ");
export default function PhoneDirectory({supabase,staff=[] ,buildings=[],isAdmin=false}){
 const [search,setSearch]=useState("");
 const [mergeRows,setMergeRows]=useState([]);
 const [mergeTarget,setMergeTarget]=useState(null);
 const [mergeSource,setMergeSource]=useState("");
 const [mergeSearch,setMergeSearch]=useState("");
 const [mergeBusy,setMergeBusy]=useState(false);
 const [contactFilter,setContactFilter]=useState("all");
 const [presence,setPresence]=useState({});
 const [presenceError,setPresenceError]=useState("");
 const [contacts,setContacts]=useState([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [importRows,setImportRows]=useState(null);
 const [importBusy,setImportBusy]=useState(false);
 const [staffContacts,setStaffContacts]=useState([]);
 const [reload,setReload]=useState(0);
 const [hiddenKeys,setHiddenKeys]=useState([]);
 const [hiddenBusy,setHiddenBusy]=useState("");
 const [showHidden,setShowHidden]=useState(false);
 const [editing,setEditing]=useState(null);
 const [editBusy,setEditBusy]=useState(false);
 const [editError,setEditError]=useState("");
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
 useEffect(()=>{let active=true;supabase.from("foxa_phone_directory_hidden").select("person_key").then(({data,error})=>{if(active){if(error)setError("Skryté kontakty nelze načíst: "+error.message);else setHiddenKeys((data||[]).map(x=>x.person_key))}});return()=>{active=false}},[supabase]);
 useEffect(()=>{let active=true;supabase.from("foxa_phone_directory_merges").select("source_key,target_key").then(({data,error})=>{if(!active)return;if(error)setError("Sloučení kontaktů nelze načíst: "+error.message);else setMergeRows(data||[])});return()=>{active=false}},[supabase]);
 async function saveMerge(){
  if(!isAdmin||!mergeTarget||!mergeSource||mergeBusy)return;
  const target=personKey(mergeTarget.name);
  if(!target||target===mergeSource){setError("Vyber dva různé kontakty.");return}
  const paths=new Map(mergeRows.map(x=>[x.source_key,x.target_key]));
  let next=target;const seen=new Set([mergeSource]);
  while(paths.has(next)){if(seen.has(next)){setError("Sloučení by vytvořilo cyklus.");return}seen.add(next);next=paths.get(next)}
  if(next===mergeSource){setError("Sloučení by vytvořilo cyklus.");return}
  setMergeBusy(true);setError("");
  const {error:mergeError}=await supabase.from("foxa_phone_directory_merges").upsert({source_key:mergeSource,target_key:target},{onConflict:"source_key"});
  if(mergeError)setError("Kontakty nelze sloučit: "+mergeError.message);
  else{setMergeRows(rows=>[...rows.filter(x=>x.source_key!==mergeSource),{source_key:mergeSource,target_key:target}]);setMergeTarget(null);setMergeSource("");setMergeSearch("")}
  setMergeBusy(false);
 }
 async function undoMerge(person){
  if(!isAdmin)return;
  const key=personKey(person.name);
  const related=mergeRows.filter(x=>x.target_key===key);
  if(!related.length)return;
  setMergeBusy(true);setError("");
  const {error:mergeError}=await supabase.from("foxa_phone_directory_merges").delete().in("source_key",related.map(x=>x.source_key));
  if(mergeError)setError("Sloučení nelze zrušit: "+mergeError.message);
  else setMergeRows(rows=>rows.filter(x=>!related.some(y=>y.source_key===x.source_key)));
  setMergeBusy(false);
 }
 async function toggleHidden(person){
  if(!isAdmin)return;
  const key=personKey(person.name);if(!key)return;
  setHiddenBusy(key);setError("");
  const currentlyHidden=hiddenKeys.includes(key);
  const {error:err}=currentlyHidden?await supabase.from("foxa_phone_directory_hidden").delete().eq("person_key",key):await supabase.from("foxa_phone_directory_hidden").insert({person_key:key});
  if(err)setError("Viditelnost kontaktu se nepodařilo změnit: "+err.message);
  else setHiddenKeys(keys=>currentlyHidden?keys.filter(x=>x!==key):[...keys,key]);
  setHiddenBusy("");
 }
 useEffect(()=>{let active=true;const load=async()=>{const {data,error}=await supabase.rpc("foxa_directory_attendance_status");if(!active)return;if(error){setPresenceError("Stav docházky není dostupný.");return}setPresence(Object.fromEntries((data||[]).map(x=>[String(x.user_id),x.status])));setPresenceError("")};load();const timer=setInterval(load,60000);return()=>{active=false;clearInterval(timer)}},[supabase]);
 const buildingById=useMemo(()=>new Map(buildings.map(b=>[String(b.id),b])),[buildings]);
 const entries=useMemo(()=>{
  const employees=staff.map(s=>({id:"staff-"+s.id,name:clean(s.display_name||s.full_name||s.email),position:"SBD Praha 8",phone:mobileOnly(s.mobile||s.phone||s.phone_number),email:clean(s.email),extension:extensionOnly([s.extension,s.internal_extension,s.phone_extension,s.linka,s.phone,s.phone_number].filter(Boolean).join("; ")),object:"",employeeId:String(s.id)})).filter(s=>s.name);
  const imported=staffContacts.map(s=>({id:"import-"+s.id,name:clean(s.full_name),position:[s.position,s.department].filter(Boolean).join(" · ")||"SBD Praha 8",phone:mobileOnly(s.phone),extension:extensionOnly(s.phone),email:clean(s.email),object:""}));
  const functionaries=contacts.map(c=>{const b=buildingById.get(String(c.building_id));return {id:"contact-"+c.id,name:clean(c.full_name),position:clean(c.position)||"Člen výboru",phone:mobileOnly(c.phone),extension:extensionOnly(c.phone),email:clean(c.email),object:b?[(b.object_number||""),(b.street||b.address||b.name||"")].filter(Boolean).join(" – "):"Objekt nenalezen"}});
  const merged=new Map();
  const aliases=new Map(mergeRows.map(x=>[x.source_key,x.target_key]));
  const resolveKey=key=>{const seen=new Set();while(aliases.has(key)&&!seen.has(key)){seen.add(key);key=aliases.get(key)}return key};
  const names=new Map([...employees,...imported,...functionaries].map(x=>[personKey(x.name),x.name]));
  for(const person of [...employees,...imported,...functionaries]){
   const originalKey=personKey(person.name)||person.id;
   const key=resolveKey(originalKey);
   const existing=merged.get(key);
   if(!existing){merged.set(key,{...person,name:names.get(key)||person.name,mergeKey:key,positions:[person.position],objects:person.object?[person.object]:[],emails:emailList(person.email),extensions:extensionList(person.extension),sources:[person],employeeId:person.employeeId||null});continue}
   // Stejný člověk může být současně zaměstnancem SBD i kontaktem objektu.
   // Upřednostníme skutečně vyplněné kontaktní údaje z importu Domus.
   if(!existing.phone&&!existing.sources.some(s=>s.id.startsWith("import-"))&&person.phone)existing.phone=person.phone;
   existing.sources.push(person);
   if(person.id.startsWith("import-"))existing.extensions=extensionList(person.extension);
   else if(!existing.sources.some(s=>s.id.startsWith("import-")))for(const extension of extensionList(person.extension))if(!existing.extensions.includes(extension))existing.extensions.push(extension);
   if(person.employeeId)existing.employeeId=person.employeeId;
   if(person.id.startsWith("import-")){existing.phone=person.phone||""; if(person.email)existing.name=person.name;}
   for(const address of emailList(person.email))if(!existing.emails.includes(address))existing.emails.push(address);
   if(!existing.phone&&!existing.sources.some(s=>s.id.startsWith("import-"))&&person.phone)existing.phone=person.phone;
   if(!existing.positions.includes(person.position))existing.positions.push(person.position);
   if(person.object&&!existing.objects.includes(person.object))existing.objects.push(person.object);
   if(person.position!=="SBD Praha 8"&&person.phone&&person.email)existing.name=person.name;
  }
  const people=[...merged.values()].map(p=>({...p,position:p.positions.join(" · "),object:p.objects.join("; "),email:p.emails.join("; "),extension:p.extensions.join(", ")}));
  const q=search.toLocaleLowerCase("cs").trim();
  const digits=q.replace(/[^0-9]/g,"");
  return people.filter(p=>(contactFilter==="all"||(contactFilter==="employees"?p.sources.some(s=>s.id.startsWith("staff-")||s.id.startsWith("import-")):p.sources.some(s=>s.id.startsWith("contact-"))))&&(isAdmin&&showHidden||!hiddenKeys.includes(personKey(p.name)))&&(!q||[p.name,p.phone,p.extension,p.email].some(v=>v.toLocaleLowerCase("cs").includes(q))||(digits.length>=3&&[p.phone,p.extension].some(v=>v.replace(/[^0-9]/g,"").includes(digits))))).sort((a,b)=>a.name.localeCompare(b.name,"cs"));
 },[staff,staffContacts,contacts,buildingById,search,contactFilter,hiddenKeys,isAdmin,showHidden,mergeRows]);
 const mergeCandidates=useMemo(()=>{
  const all=[...staff.map(s=>clean(s.display_name||s.full_name||s.email)),...staffContacts.map(s=>clean(s.full_name)),...contacts.map(c=>clean(c.full_name))];
  const unique=new Map();for(const name of all){const key=personKey(name);if(key&&!unique.has(key))unique.set(key,{name})}
  return [...unique.values()].sort((a,b)=>a.name.localeCompare(b.name,"cs"));
 },[staff,staffContacts,contacts]);
 function startEdit(person){
  const source=person.sources.find(x=>x.id.startsWith("import-"))||person.sources.find(x=>x.id.startsWith("contact-"))||person.sources[0];
  const kind=source.id.startsWith("import-")?"staff":source.id.startsWith("contact-")?"committee":"account";
  setEditError("");
  setEditing({kind,recordId:kind==="account"?null:source.id.slice(source.id.indexOf("-")+1),name:source.name,phone:source.phone,extension:source.extension||"",email:source.email,position:kind==="staff"?(staffContacts.find(x=>String(x.id)===source.id.slice(7))?.position||""):kind==="committee"?(contacts.find(x=>String(x.id)===source.id.slice(8))?.position||""):"",department:kind==="staff"?(staffContacts.find(x=>String(x.id)===source.id.slice(7))?.department||""):"",buildingId:kind==="committee"?(contacts.find(x=>String(x.id)===source.id.slice(8))?.building_id||""):null});
 }
 async function saveEdit(e){
  e.preventDefault();if(!isAdmin||!editing||editBusy)return;
  if(!clean(editing.name)){setEditError("Vyplň jméno kontaktu.");return}
  setEditBusy(true);setEditError("");
  try{
   const data={full_name:clean(editing.name),phone:[clean(editing.phone),...extensionList(editing.extension).map(x=>"linka "+x)].filter(Boolean).join("; "),email:emailList(editing.email).join("; "),position:clean(editing.position)};
   if(editing.kind==="staff")data.department=clean(editing.department);
   const table=editing.kind==="committee"?"foxa_building_committee_contacts":"foxa_staff_directory_contacts";
   const request=editing.recordId?supabase.from(table).update(data).eq("id",editing.recordId).select("id").single():supabase.from(table).insert({...data,department:clean(editing.department)}).select("id").single();
   const {error:saveError}=await request;
   if(saveError)throw saveError;
   if(editing.kind==="committee"){
    const {data:updated,error:loadError}=await supabase.from(table).select("id,building_id,full_name,position,phone,email");
    if(loadError)throw loadError;setContacts(updated||[]);
   }else setReload(v=>v+1);
   setEditing(null);
  }catch(err){setEditError("Kontakt se nepodařilo uložit: "+(err.message||err))}
  finally{setEditBusy(false)}
 }
 async function readImport(e){
  const file=e.target.files?.[0];e.target.value="";if(!file)return;
  setError("");setImportRows(null);
  try{
   const wb=XLSX.read(await file.arrayBuffer(),{type:"array"});
   const sheet=wb.Sheets[wb.SheetNames[0]];
   const grid=XLSX.utils.sheet_to_json(sheet,{header:1,defval:"",raw:true});
   const normalize=s=>clean(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
   // Starší telefonní seznamy SBD mohou mít několik řádků hlavičky a samostatný
   // sloupec s krátkými interními linkami bez výslovného označení.
   const headerIndex=grid.findIndex(row=>{
    const h=row.map(normalize);
    return h.some(v=>/jmeno|prijmeni|zamestnanec|pracovnik|kontaktni osoba/.test(v));
   });
   const headers=headerIndex>=0?grid[headerIndex].map(normalize):[];
   const col=(...names)=>headers.findIndex(h=>names.some(n=>h.includes(n)));
   const full=col("prijmeni a jmeno","jmeno a prijmeni","cele jmeno","zamestnanec","pracovnik","kontaktni osoba");
   const first=col("jmeno"),last=col("prijmeni");
   const phone=col("mobil","telefon","tel."),extension=col("linka","klapka","pobocka","interni"),email=col("e-mail","email"),position=col("funkce","pozice","pracovni zarazeni","pracovni cinnost"),department=col("oddeleni","utvar","usek");
   const isName=s=>/^[\p{L}][\p{L} .'-]{3,}$/u.test(clean(s))&&!/telefon|email|e-mail|mobil|ustredna|seznam|zamestnanc|oddeleni|referat/i.test(clean(s));
   const phoneNumbers=v=>[...new Set(clean(v).split(/[;\n/]+/).map(s=>s.trim()).filter(s=>{const d=s.replace(/\D/g,"");return d.length===9||d.length===12&&d.startsWith("420")}))];
   const internalNumbers=v=>[...new Set(clean(v).split(/[;,\n/]+/).flatMap(s=>{
    const match=s.match(/(?:linka|klapka|intern[ií]|ext\.?)\s*[:#.-]?\s*(\d{2,6})/i);
    if(match)return [match[1]];
    const t=s.trim();return /^\d{2,6}$/.test(t)?[t]:[];
   }))];
   const rows=[];
   for(const row of grid.slice(headerIndex>=0?headerIndex+1:0)){
    const cells=row.map(clean);
    const name=full>=0?cells[full]:first>=0&&last>=0&&first!==last?[cells[last],cells[first]].filter(Boolean).join(" "):first>=0?cells[first]:last>=0?cells[last]:"";
    const candidates=cells.filter(v=>isName(v)&&!emailList(v).length&&!phoneNumbers(v).length);
    const inferred=name||candidates.find(v=>v.split(/\s+/).length>=2)||"";
    if(!isName(inferred))continue;
    const phones=[...new Set((phone>=0?[cells[phone]]:cells).flatMap(phoneNumbers))];
    const links=[...new Set((extension>=0?[cells[extension]]:phone>=0?[cells[phone]]:cells).flatMap(internalNumbers))];
    const emails=[...new Set(cells.flatMap(emailList))];
    if(!phones.length&&!links.length&&!emails.length)continue;
    rows.push({full_name:inferred,phone:[...phones,...links.map(x=>"linka "+x)].join("; "),email:emails.join("; "),position:position>=0?cells[position]||"":"",department:department>=0?cells[department]||"":""});
   }
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
     const changes={phone:[mobileOnly(item.phone),...extensionList(item.phone).map(x=>"linka "+x)].filter(Boolean).join("; "),email:[...new Set([...emailList(old.email),...emailList(item.email)])].join("; "),position:item.position||old.position,department:item.department||old.department};
     const {error}=await supabase.from("foxa_staff_directory_contacts").update(changes).eq("id",old.id);if(error)throw error;updated++;
    }else{
     const {data,error}=await supabase.from("foxa_staff_directory_contacts").insert({...item,phone:[mobileOnly(item.phone),...extensionList(item.phone).map(x=>"linka "+x)].filter(Boolean).join("; ")}).select("id,full_name").single();if(error)throw error;
     existing.set(normalize(item.full_name),data);created++;
    }
   }
   setImportRows(null);setReload(v=>v+1);alert("Import dokončen: "+created+" nových, "+updated+" aktualizovaných kontaktů.");
  }catch(err){setError("Import se nepodařil dokončit: "+err.message)}
  finally{setImportBusy(false)}
 }
 return <section className="foxa-phonebook">
  <div className="foxa-phonebook-head"><div><h2>Telefonní seznam</h2><p>Zaměstnanci SBD Praha 8 a kontakty spravovaných objektů.</p></div></div>
  <div className="foxa-phonebook-body">
   {isAdmin&&<div className="foxa-phonebook-import"><label className="secondarybutton filebutton">Importovat zaměstnance SBD (.xls, .xlsx)<input type="file" accept=".xls,.xlsx" onChange={readImport}/></label>{importRows&&<div className="importpanel"><p>Připraveno {importRows.length} kontaktů. Existujícím zaměstnancům se mobilní číslo a interní linka nahradí údaji ze souboru (původní linka se odstraní). Nové kontakty se přidají.</p><button type="button" className="primary" disabled={importBusy} onClick={saveImport}>{importBusy?"Importuji…":"Potvrdit import"}</button><button type="button" className="secondarybutton" onClick={()=>setImportRows(null)}>Zrušit</button></div>}</div>}
   <div className="foxa-phonebook-filter" role="group" aria-label="Filtrovat telefonní seznam">{[["all","Všechny kontakty"],["employees","Zaměstnanci SBD"],["committees","Výbory objektů"]].map(([value,label])=><button key={value} type="button" aria-pressed={contactFilter===value} className={contactFilter===value?"active":""} onClick={()=>setContactFilter(value)}>{label}</button>)}</div>
   {isAdmin&&mergeTarget&&<div className="foxa-phonebook-merge"><strong>Sloučit kontakt: {mergeTarget.name}</strong><p>Vyber další kontakt, který se má připojit k vybranému kontaktu. Původní databázové záznamy zůstanou zachované.</p><div className="foxa-merge-picker"><input type="search" aria-label="Vyhledat kontakt ke sloučení" placeholder="Hledat kontakt podle jména…" value={mergeSearch} onChange={e=>setMergeSearch(e.target.value)}/><div className="foxa-merge-results" role="listbox" aria-label="Výsledky hledání kontaktů">{mergeCandidates.filter(p=>personKey(p.name)!==personKey(mergeTarget.name)&&(!mergeSearch||personKey(p.name).includes(personKey(mergeSearch))||p.name.toLocaleLowerCase("cs").includes(mergeSearch.toLocaleLowerCase("cs")))).slice(0,60).map(p=><button type="button" role="option" aria-selected={mergeSource===personKey(p.name)} className={mergeSource===personKey(p.name)?"selected":""} key={personKey(p.name)} onClick={()=>{setMergeSource(personKey(p.name));setMergeSearch(p.name)}}>{p.name}</button>)}{!mergeCandidates.some(p=>personKey(p.name)!==personKey(mergeTarget.name)&&(!mergeSearch||personKey(p.name).includes(personKey(mergeSearch))||p.name.toLocaleLowerCase("cs").includes(mergeSearch.toLocaleLowerCase("cs"))))&&<span>Žádný odpovídající kontakt</span>}</div></div><button type="button" disabled={!mergeSource||mergeBusy} onClick={saveMerge}>Potvrdit sloučení</button><button type="button" className="secondarybutton" onClick={()=>{setMergeTarget(null);setMergeSource("")}}>Zrušit</button></div>}
   <div className="foxa-phonebook-controls">{isAdmin&&<label className="foxa-phonebook-showhidden"><input type="checkbox" checked={showHidden} onChange={e=>setShowHidden(e.target.checked)}/> Zobrazit i skryté kontakty</label>}<input type="search" aria-label="Hledat kontakt" placeholder="Hledat podle jména, telefonního čísla nebo e-mailu…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
   {presenceError&&<p className="foxa-presence-warning">{presenceError}</p>}
   {error&&<p role="alert" className="error">Kontakty se nepodařilo načíst: {error}</p>}
   {loading?<p>Načítám kontakty…</p>:<div className="foxa-phonebook-list">{entries.length?entries.map(p=><article className="foxa-phonebook-person" key={p.id}><div><strong>{p.name}</strong>{p.employeeId&&<span className={"foxa-presence foxa-presence-"+(presence[p.employeeId]||"unknown")}>{presence[p.employeeId]==="vacation"?"Dovolená":presence[p.employeeId]==="present"?"Přítomen":presence[p.employeeId]==="absent"?"Nepřítomen":"Stav nezjištěn"}</span>}<small>{[p.position,p.object].filter(Boolean).join(" · ")}</small></div><div className="foxa-phonebook-links">{p.phone&&<a href={"tel:"+dial(p.phone)}>{p.phone}</a>}{p.extension&&<span className="foxa-phonebook-extension">Interní linka: {p.extension}</span>}{emailList(p.email).map(address=><a key={address} href={"mailto:"+address}>{address}</a>)}{!p.phone&&!p.extension&&!p.email&&<small>Kontaktní údaje nejsou vyplněny</small>}</div>{isAdmin&&<div className="foxa-phonebook-admin-actions"><button type="button" className="secondarybutton" onClick={()=>startEdit(p)}>Upravit kontakt</button><button type="button" className="secondarybutton" onClick={()=>{setMergeTarget(p);setMergeSource("");setMergeSearch("");setError("")}}>Sloučit</button>{mergeRows.some(x=>x.target_key===personKey(p.name))&&<button type="button" className="secondarybutton" disabled={mergeBusy} onClick={()=>undoMerge(p)}>Zrušit sloučení</button>}<button type="button" className="secondarybutton" disabled={hiddenBusy===personKey(p.name)} onClick={()=>toggleHidden(p)}>{hiddenKeys.includes(personKey(p.name))?"Znovu zobrazit":"Skrýt ze seznamu"}</button></div>}{hiddenKeys.includes(personKey(p.name))&&<small>Skrytý kontakt</small>}</article>):<p>Žádné odpovídající kontakty.</p>}</div>}
  </div>
  {isAdmin&&editing&&<div className="foxa-contact-edit-backdrop" role="presentation"><form className="foxa-contact-edit" onSubmit={saveEdit} role="dialog" aria-modal="true" aria-label="Upravit kontakt"><h3>Upravit kontakt</h3>{editing.kind==="account"&&<p>Kontakt je z uživatelského adresáře. Úpravy se uloží do telefonního seznamu bez změny uživatelského účtu.</p>}{editing.kind==="committee"&&<p>Upravuješ kontaktní záznam přiřazený k objektu.</p>}<label>Jméno a příjmení<input required value={editing.name} onChange={e=>setEditing(s=>({...s,name:e.target.value}))}/></label><label>Telefonní číslo<input type="tel" value={editing.phone} onChange={e=>setEditing(s=>({...s,phone:e.target.value}))}/></label><label>Interní linka<input inputMode="numeric" value={editing.extension||""} onChange={e=>setEditing(s=>({...s,extension:e.target.value}))}/></label><label>E-maily (odděl středníkem)<textarea rows={2} value={editing.email} onChange={e=>setEditing(s=>({...s,email:e.target.value}))}/></label><label>Funkce<input value={editing.position} onChange={e=>setEditing(s=>({...s,position:e.target.value}))}/></label>{editing.kind!=="committee"&&<label>Oddělení<input value={editing.department} onChange={e=>setEditing(s=>({...s,department:e.target.value}))}/></label>}{editError&&<p role="alert" className="error">{editError}</p>}<div className="foxa-contact-edit-actions"><button type="button" className="secondarybutton" disabled={editBusy} onClick={()=>setEditing(null)}>Zrušit</button><button type="submit" disabled={editBusy}>{editBusy?"Ukládám…":"Uložit kontakt"}</button></div></form></div>}
 </section>;
}
