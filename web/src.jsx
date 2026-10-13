import React,{useEffect,useState,useCallback} from "react";
import {createRoot} from "react-dom/client";
import {createClient} from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import "./style.css";
const supabase=createClient("https://qcbyjxovnf fdruiznlnt.supabase.co".replace(" ",""),"sb_publishable_AFfvrodRnmBTOLjlFadYfQ_Foa4e_P1");
const extraFields=[["object_number","Číslo objektu"],["street","Ulice"],["city","Město"],["manager","Správce"],["referent","Referent"],["economist","Ekonom"],["accountant","Účetní"],["legal_entity","Hlavní účetní subjekt"],["company_id","IČO"],["external_id","Unikátní číslo"],["flats_count","Počet bytů"],["nonresidential_count","Počet nebytů"],["garages_count","Počet garáží"],["shared_spaces_count","Počet spol. prostor"],["invoice_approvers_count","Počet schvalovatelů faktur"],["manager_flag","P. Správce"],["economist_flag","P. Ekon"]];
const numericFields=["flats_count","nonresidential_count","garages_count","shared_spaces_count","invoice_approvers_count","manager_flag","economist_flag"];
const empty={name:"",address:"",description:"",...Object.fromEntries(extraFields.map(([k])=>[k,""]))};
const readView=()=>{try{return JSON.parse(sessionStorage.getItem("isys-view")||"{}")}catch{return {}}};
function App(){
 const [initialView]=useState(()=>({...readView(),scrollY:(()=>{try{return sessionStorage.getItem("isys-scroll")}catch{return 0}})()}));
 const [theme,setTheme]=useState(()=>{try{return localStorage.getItem("isys-theme")||"light"}catch{return "light"}});
 useEffect(()=>{document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;try{localStorage.setItem("isys-theme",theme)}catch{}},[theme]);
 const [session,setSession]=useState(null),[loading,setLoading]=useState(true),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const [importRows,setImportRows]=useState(null),[importError,setImportError]=useState(""),[importBusy,setImportBusy]=useState(false),[search,setSearch]=useState(initialView.search||"");
 const [selectedBuilding,setSelectedBuilding]=useState(null);
 const [filters,setFilters]=useState(initialView.filters||{city:"",manager:"",referent:""});
 const [page,setPage]=useState(initialView.page||"Přehled"),[buildings,setBuildings]=useState([]),[listLoading,setListLoading]=useState(false),[listError,setListError]=useState(""),[role,setRole]=useState("technician"),[editing,setEditing]=useState(null),[form,setForm]=useState(empty),[saving,setSaving]=useState(false),[message,setMessage]=useState("");
 useEffect(()=>{supabase.auth.getSession().then(({data,error})=>{if(error)setError(error.message);setSession(data?.session??null);setLoading(false)});const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>setSession(s));return()=>subscription.unsubscribe()},[]);
 const load=useCallback(async()=>{if(!session)return;setListLoading(true);setListError("");const [{data,error:err},{data:profile}]=await Promise.all([supabase.from("buildings").select("id,name,address,description,created_at,object_number,street,city,manager,referent,economist,accountant,legal_entity,company_id,external_id,flats_count,nonresidential_count,garages_count,shared_spaces_count,invoice_approvers_count,manager_flag,economist_flag").order("name"),supabase.from("profiles").select("role").eq("id",session.user.id).maybeSingle()]);if(err)setListError("Nepodařilo se načíst objekty: "+err.message);else {setBuildings(data??[]);setSelectedBuilding(prev=>(data??[]).find(b=>b.id===(prev?.id||initialView.selectedId))??null)}setRole(profile?.role??"technician");setListLoading(false)},[session]);
 useEffect(()=>{load()},[load]);
 useEffect(()=>{if(!session)return;try{sessionStorage.setItem("isys-view",JSON.stringify({page,search,filters,selectedId:selectedBuilding?.id||null}))}catch{}},[session,page,search,filters,selectedBuilding]);
 useEffect(()=>{if(!session||listLoading||listError)return;const y=Number(initialView.scrollY)||0;if(!y)return;const id=requestAnimationFrame(()=>window.scrollTo(0,y));return()=>cancelAnimationFrame(id)},[session,listLoading,listError]);
 useEffect(()=>{if(!session)return;let last=0;const remember=()=>{const now=Date.now();if(now-last<150)return;last=now;try{sessionStorage.setItem("isys-scroll",String(window.scrollY))}catch{}};window.addEventListener("scroll",remember,{passive:true});return()=>window.removeEventListener("scroll",remember)},[session]);
 async function login(e){e.preventDefault();setError("");setBusy(true);const {error}=await supabase.auth.signInWithPassword({email,password});if(error)setError("Přihlášení se nezdařilo. Zkontroluj e-mail, heslo a potvrzení účtu.");setBusy(false)}
 function openForm(item=null){setEditing(item?.id??"new");setForm(item?{...empty,...item}:empty);setMessage("")}
 async function save(e){e.preventDefault();if(role!=="admin")return;setSaving(true);setMessage("");const payload={name:form.name.trim(),address:form.address.trim(),description:form.description.trim()||null,...Object.fromEntries(extraFields.map(([k])=>[k,numericFields.includes(k)?(form[k]===""||form[k]==null?null:Number(form[k])):(String(form[k]??"").trim()||null)]))};if(!payload.name||!payload.address){setMessage("Vyplň název a adresu.");setSaving(false);return}const result=editing==="new"?await supabase.from("buildings").insert(payload):await supabase.from("buildings").update(payload).eq("id",editing);if(result.error)setMessage("Uložení selhalo: "+result.error.message);else{setEditing(null);await load()}setSaving(false)}

 async function readExcel(e){
  const file=e.target.files?.[0];e.target.value="";if(!file)return;
  setImportError("");setImportRows(null);
  if(file.size>5*1024*1024){setImportError("Soubor je příliš velký (max. 5 MB).");return}
  try{
   const wb=XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:false});
   const sheet=wb.Sheets[wb.SheetNames[0]];
   const rows=XLSX.utils.sheet_to_json(sheet,{defval:"",raw:false});
   const normalize=x=>String(x).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
   const get=(r,aliases)=>{const key=Object.keys(r).find(k=>aliases.includes(normalize(k)));return key===undefined?"":String(r[key]??"").trim()};
   const header=Object.keys(rows[0]??{});
   const isLegacy=header.some(h=>normalize(h)==="ulice")&&header.some(h=>normalize(h)==="mesto")&&header.some(h=>normalize(h)==="objekt");
   const cols={
     object_number:["objekt","cisloobjektu"],street:["ulice"],city:["mesto"],manager:["spravce"],referent:["referent"],economist:["ekonom"],accountant:["ucetni"],legal_entity:["hlavniucetnisubjekt"],company_id:["ico"],external_id:["unikatnicislo"],flats_count:["pocetbytu"],nonresidential_count:["pocetnebytu"],garages_count:["pocetgarazi"],shared_spaces_count:["pocetspolprostor"],invoice_approvers_count:["pocetschvalovatelufaktur"],manager_flag:["pspravce"],economist_flag:["pekon"]
   };
   const prepared=rows.map((r,i)=>{
    const details=Object.fromEntries(extraFields.map(([k])=>[k,get(r,cols[k]??[normalize(k)])]));
    const street=details.street,city=details.city;
    const number=details.object_number;
    const name=isLegacy?(number?number+" – "+street:street):get(r,["nazev","nazevobjektu","objekt","name","dum"]);
    const address=isLegacy?[street,city].filter(Boolean).join(", "):get(r,["adresa","adresaobjektu","address"]);
    const description=get(r,["poznamka","popis","description","note"]);
    for(const k of numericFields){const v=details[k];details[k]=v===""?null:Number(v.replace(/\\s/g,"").replace(",","."))}
    return {row:i+2,name,address,description,...details};
   });
   if(!prepared.length){setImportError("Soubor neobsahuje žádné řádky.");return}
   if(prepared.length>500){setImportError("Import je omezen na 500 řádků v jednom souboru.");return}
   if(prepared.some(r=>!r.name||!r.address)){setImportError("Některé řádky nemají Název nebo Adresu. Zkontroluj hlavičky a prázdné buňky.");return}
   if(prepared.some(r=>r.name.length>200||r.address.length>300||r.description.length>3000||numericFields.some(k=>r[k]!==null&&(!Number.isInteger(r[k])||r[k]<0)))){setImportError("Některé údaje mají neplatnou délku nebo číselnou hodnotu.");return}
   const seen=new Set(),existing=new Set(buildings.map(b=>b.object_number?"number:"+b.object_number:"name:"+b.name.toLocaleLowerCase("cs")+"|"+b.address.toLocaleLowerCase("cs")));
   const duplicates=prepared.filter(r=>{const k=r.object_number?"number:"+r.object_number:"name:"+r.name.toLocaleLowerCase("cs")+"|"+r.address.toLocaleLowerCase("cs");if(seen.has(k)||existing.has(k))return true;seen.add(k);return false});
   if(duplicates.length){setImportError("Nalezeny duplicitní objekty (podle čísla objektu nebo názvu a adresy). Import zastaven.");return}
   setImportRows(prepared);
  }catch(err){setImportError("Soubor nelze načíst. Použij .xlsx nebo .xls. "+err.message)}
 }
 async function importExcel(){
  if(role!=="admin"||!importRows?.length)return;
  setImportBusy(true);setImportError("");
  const payload=importRows.map(({row,...item})=>({...item,description:item.description||null}));
  // Batches avoid large requests. Stop on first failure; prior batches may already be saved.
  let completed=0;
  for(let i=0;i<payload.length;i+=50){
   const {error}=await supabase.from("buildings").insert(payload.slice(i,i+50));
   if(error){setImportError("Import přerušen po "+completed+" objektech: "+error.message+". Před opakováním obnov seznam, aby nevznikly duplicity.");setImportBusy(false);await load();return}
   completed+=Math.min(50,payload.length-i);
  }
  setImportRows(null);setImportBusy(false);await load();setMessage("Úspěšně importováno "+completed+" objektů.");
 }
 function downloadTemplate(){
  const wb=XLSX.utils.book_new();const ws=XLSX.utils.aoa_to_sheet([["Objekt","Ulice","Město","Správce","Ekonom","Účetní","Hlavní účetní subjekt","IČO","Unikátní číslo","Počet bytů","Počet nebytů","Počet garáží","Počet spol. prostor","Počet schvalovatelů faktur","Poznámka","P. Správce","P. Ekon"],["001","Ukázková 123","Praha 8","Jan Novák","","","SVJ Ukázková","12345678","abc123",24,0,4,2,1,"Ukázkový objekt",1,1]]);
  XLSX.utils.book_append_sheet(wb,ws,"Objekty");XLSX.writeFile(wb,"isys_sablona_objekty.xlsx");
 }
 if(loading)return <main className="center">Načítání iSYS…</main>;
 if(!session)return <main className="center"><form className="login" onSubmit={login}><div className="mark">iSYS</div><h1>Přihlášení do systému</h1><p>Interní systém správy bytových domů</p><label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label><label>Heslo<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/></label>{error&&<div role="alert" className="error">{error}</div>}<button disabled={busy}>{busy?"Přihlašuji…":"Přihlásit se"}</button><small>Účty zakládá správce systému.</small></form></main>;
 const filterOptions=Object.fromEntries(["city","manager","referent"].map(key=>[key,[...new Set(buildings.map(b=>String(b[key]??"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"cs"))]));
 const visibleBuildings=buildings.filter(b=>[b.name,b.address,b.object_number,b.manager,b.referent].join(" ").toLocaleLowerCase("cs").includes(search.toLocaleLowerCase("cs"))&&Object.entries(filters).every(([key,value])=>!value||String(b[key]??"")===value));
 const filtersActive=Boolean(search.trim()||Object.values(filters).some(Boolean));
 const pages=["Přehled","Objekty","Kontroly","Evidence klíčů","Úkoly"];
 return <div className="layout"><aside><div className="brand"><span className="brandicon">⌂</span><div className="mark">iSYS<small>PROPERTY MANAGEMENT</small></div></div><div className="sideTitle">PRACOVNÍ PROSTOR</div>{pages.map(x=><button type="button" className={"nav "+(page===x?"selected":"")} key={x} onClick={()=>{setPage(x);setEditing(null);setSelectedBuilding(null)}}>{["▦","▤","☑","⚿","✓"][pages.indexOf(x)]} &nbsp; {x}</button>)}<div className="sidefooter">iSYS • Webová aplikace</div></aside><section className="content"><header><div className="breadcrumb">Pracovní prostor <span>/</span> <strong>{page}</strong></div><div className="userbar"><button type="button" className="themebutton" aria-label={theme==="dark"?"Zapnout světlý režim":"Zapnout tmavý režim"} aria-pressed={theme==="dark"} onClick={()=>setTheme(t=>t==="dark"?"light":"dark")}>{theme==="dark"?"☀ Světlý":"☾ Tmavý"}</button><span className="avatar">{session.user.email?.slice(0,1).toUpperCase()}</span><button className="logout" onClick={()=>{try{sessionStorage.removeItem("isys-view");sessionStorage.removeItem("isys-scroll")}catch{}supabase.auth.signOut()}}>Odhlásit se</button></div></header><div className="body">{page==="Přehled"?<><div className="hero"><div><div className="eyebrow">PŘEHLED SPRÁVY</div><h1>Vítej v iSYS</h1><p>Vše důležité o spravovaných objektech na jednom místě.</p></div><button className="heroaction" onClick={()=>{setPage("Objekty");setSelectedBuilding(null)}}>Přejít na objekty →</button></div><div className="tiles">{["Spravované objekty","Pravidelné kontroly","Evidence klíčů","Otevřené úkoly"].map((x,i)=><article key={x}><h3>{x}</h3><p>{i===0?(listLoading?"Načítání…":listError?"Nedostupné":buildings.length):"Modul připravujeme"}</p></article>)}</div><div className="notice">Evidence objektů je připravena. Další moduly budeme postupně připojovat.</div></>:page==="Objekty"?<><div className="pageheading"><div><h1>Evidence objektů</h1><p>Seznam spravovaných domů</p></div>{role==="admin"&&<div className="toolbar"><button className="secondarybutton" onClick={downloadTemplate}>↓ Šablona Excel</button><label className="secondarybutton filebutton">↑ Import Excel<input type="file" accept=".xlsx,.xls" onChange={readExcel}/></label><button className="primary" onClick={()=>openForm()}>+ Přidat objekt</button></div>}</div>{message&&<div className="notice" role="status">{message}</div>}{importError&&<div className="error" role="alert">{importError}</div>}{importRows&&role==="admin"&&<div className="importpanel"><h3>Náhled importu: {importRows.length} objektů</h3><p>První řádky: {importRows.slice(0,5).map(r=>r.name+" – "+r.address).join("; ")}</p><div className="actions"><button className="secondarybutton" onClick={()=>setImportRows(null)}>Zrušit</button><button className="primary" disabled={importBusy} onClick={importExcel}>{importBusy?"Importuji…":"Potvrdit import"}</button></div></div>}{listError&&<div className="error" role="alert">{listError}</div>}{!selectedBuilding&&<div className="filterpanel"><div className="filterheading"><strong>Filtrovat objekty</strong><span>{visibleBuildings.length} z {buildings.length} objektů</span></div><div className="filtercontrols"><input className="searchbox" aria-label="Hledat objekty" placeholder="⌕ Hledat číslo, objekt nebo adresu…" value={search} onChange={e=>setSearch(e.target.value)}/>{[["city","Město"],["manager","Správce"],["referent","Referent"]].map(([key,label])=><select key={key} aria-label={label} value={filters[key]} onChange={e=>setFilters(prev=>({...prev,[key]:e.target.value}))}><option value="">Všichni – {label.toLowerCase()}</option>{filterOptions[key].map(value=><option key={value} value={value}>{value}</option>)}</select>)}<button type="button" className="secondarybutton" disabled={!filtersActive} onClick={()=>{setSearch("");setFilters({city:"",manager:"",referent:""})}}>Vymazat filtry</button></div></div>}{listLoading?<p>Načítání objektů…</p>:selectedBuilding?<section className="buildingdetail">
 <div className="detailtop"><button className="secondarybutton" onClick={()=>setSelectedBuilding(null)}>← Zpět na objekty</button>{role==="admin"&&<button className="primary" onClick={()=>openForm(selectedBuilding)}>Upravit objekt</button>}</div>
 <div className="detailhero"><span className="detailtag">KARTA OBJEKTU {selectedBuilding.object_number||""}</span><h2>{selectedBuilding.name}</h2><p>{selectedBuilding.address}</p></div>
 <div className="detailsection"><h3>Základní informace</h3><div className="detailgrid">{[["name","Název"],["address","Adresa"],["object_number","Číslo objektu"],["street","Ulice"],["city","Město"]].map(([key,label])=><div className="detailfield" key={key}><span>{label}</span><strong>{selectedBuilding[key]??"—"}</strong></div>)}</div></div>
 <div className="detailsection"><h3>Správa a kontaktní osoby</h3><div className="detailgrid">{extraFields.filter(([k])=>["manager","referent","economist","accountant","legal_entity","company_id","external_id"].includes(k)).map(([key,label])=><div className="detailfield" key={key}><span>{label}</span><strong>{selectedBuilding[key]??"—"}</strong></div>)}</div></div>
 <div className="detailsection"><h3>Počty a další údaje</h3><div className="detailgrid">{extraFields.filter(([k])=>["flats_count","nonresidential_count","garages_count","shared_spaces_count","invoice_approvers_count","manager_flag","economist_flag"].includes(k)).map(([key,label])=><div className="detailfield" key={key}><span>{label}</span><strong>{selectedBuilding[key]??"—"}</strong></div>)}</div></div>
 <div className="detailsection"><h3>Poznámka</h3><p className="detailnote">{selectedBuilding.description||"Bez poznámky"}</p></div>
 </section>:<div className="buildinggrid">{visibleBuildings.length===0?<article className="emptybuilding"><h3>Žádné odpovídající objekty</h3><p>Uprav hledání nebo přidej nový objekt.</p></article>:visibleBuildings.map(b=><button type="button" className="buildingcard" key={b.id} onClick={()=>setSelectedBuilding(b)}><span className="buildingnumber">OBJEKT {b.object_number||"—"}</span><strong>{b.street||b.name}</strong><span className="buildingaddress">{b.city||b.address}</span><span className="buildingperson">{b.referent?"Referent: "+b.referent:b.manager?"Správce: "+b.manager:"Bez přiřazeného referenta"}</span><span className="buildinglink">Otevřít kartu →</span></button>)}</div>}{editing&&role==="admin"&&<div className="overlay"><form className="modal" onSubmit={save}><h2>{editing==="new"?"Nový objekt":"Upravit objekt"}</h2><label>Název objektu<input maxLength="200" required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Adresa<input maxLength="300" required value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label><div className="formgrid">{extraFields.map(([key,label])=><label key={key}>{label}<input type={numericFields.includes(key)?"number":"text"} min={numericFields.includes(key)?0:undefined} value={form[key]??""} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}</div><label>Poznámka<textarea rows="4" maxLength="3000" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>{message&&<div className="error" role="alert">{message}</div>}<div className="actions"><button type="button" className="logout" onClick={()=>setEditing(null)}>Zrušit</button><button className="primary" disabled={saving}>{saving?"Ukládám…":"Uložit objekt"}</button></div></form></div>}</>:<><h1>{page}</h1><div className="notice">Tento modul připravujeme.</div></>}</div></section></div>
}
createRoot(document.getElementById("root")).render(<App/>);
