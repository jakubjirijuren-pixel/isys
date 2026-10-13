import React,{useEffect,useState,useCallback} from "react";
import {createRoot} from "react-dom/client";
import {createClient} from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import "./style.css";
const supabase=createClient("https://qcbyjxovnf fdruiznlnt.supabase.co".replace(" ",""),"sb_publishable_AFfvrodRnmBTOLjlFadYfQ_Foa4e_P1");
const empty={name:"",address:"",description:""};
function App(){
 const [session,setSession]=useState(null),[loading,setLoading]=useState(true),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const [importRows,setImportRows]=useState(null),[importError,setImportError]=useState(""),[importBusy,setImportBusy]=useState(false),[search,setSearch]=useState("");
 const [page,setPage]=useState("Přehled"),[buildings,setBuildings]=useState([]),[listLoading,setListLoading]=useState(false),[listError,setListError]=useState(""),[role,setRole]=useState("technician"),[editing,setEditing]=useState(null),[form,setForm]=useState(empty),[saving,setSaving]=useState(false),[message,setMessage]=useState("");
 useEffect(()=>{supabase.auth.getSession().then(({data,error})=>{if(error)setError(error.message);setSession(data?.session??null);setLoading(false)});const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>setSession(s));return()=>subscription.unsubscribe()},[]);
 const load=useCallback(async()=>{if(!session)return;setListLoading(true);setListError("");const [{data,error:err},{data:profile}]=await Promise.all([supabase.from("buildings").select("id,name,address,description,created_at").order("name"),supabase.from("profiles").select("role").eq("id",session.user.id).maybeSingle()]);if(err)setListError("Nepodařilo se načíst objekty: "+err.message);else setBuildings(data??[]);setRole(profile?.role??"technician");setListLoading(false)},[session]);
 useEffect(()=>{load()},[load]);
 async function login(e){e.preventDefault();setError("");setBusy(true);const {error}=await supabase.auth.signInWithPassword({email,password});if(error)setError("Přihlášení se nezdařilo. Zkontroluj e-mail, heslo a potvrzení účtu.");setBusy(false)}
 function openForm(item=null){setEditing(item?.id??"new");setForm(item?{name:item.name,address:item.address,description:item.description??""}:empty);setMessage("")}
 async function save(e){e.preventDefault();if(role!=="admin")return;setSaving(true);setMessage("");const payload={name:form.name.trim(),address:form.address.trim(),description:form.description.trim()||null};if(!payload.name||!payload.address){setMessage("Vyplň název a adresu.");setSaving(false);return}const result=editing==="new"?await supabase.from("buildings").insert(payload):await supabase.from("buildings").update(payload).eq("id",editing);if(result.error)setMessage("Uložení selhalo: "+result.error.message);else{setEditing(null);await load()}setSaving(false)}

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
   const prepared=rows.map((r,i)=>({row:i+2,name:get(r,["nazev","nazevobjektu","objekt","name","dum"]),address:get(r,["adresa","adresaobjektu","address"]),description:get(r,["poznamka","popis","description","note"])}));
   if(!prepared.length){setImportError("Soubor neobsahuje žádné řádky.");return}
   if(prepared.length>500){setImportError("Import je omezen na 500 řádků v jednom souboru.");return}
   if(prepared.some(r=>!r.name||!r.address)){setImportError("Některé řádky nemají Název nebo Adresu. Zkontroluj hlavičky a prázdné buňky.");return}
   if(prepared.some(r=>r.name.length>200||r.address.length>300||r.description.length>3000)){setImportError("Některé hodnoty překračují povolenou délku.");return}
   const seen=new Set();const existing=new Set(buildings.map(b=>(b.name+"|"+b.address).toLocaleLowerCase("cs")));
   const duplicates=prepared.filter(r=>{const k=(r.name+"|"+r.address).toLocaleLowerCase("cs");if(seen.has(k)||existing.has(k))return true;seen.add(k);return false});
   if(duplicates.length){setImportError("Soubor obsahuje duplicitní objekty nebo objekty již existují v databázi. Oprav je před importem.");return}
   setImportRows(prepared);
  }catch(err){setImportError("Soubor nelze načíst. Použij .xlsx nebo .xls. "+err.message)}
 }
 async function importExcel(){
  if(role!=="admin"||!importRows?.length)return;
  setImportBusy(true);setImportError("");
  const payload=importRows.map(({name,address,description})=>({name,address,description:description||null}));
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
  const wb=XLSX.utils.book_new();const ws=XLSX.utils.aoa_to_sheet([["Název","Adresa","Poznámka"],["Dům A","Praha 2, Ukázková 123","Zkušební objekt"]]);
  XLSX.utils.book_append_sheet(wb,ws,"Objekty");XLSX.writeFile(wb,"isys_sablona_objekty.xlsx");
 }
 if(loading)return <main className="center">Načítání iSYS…</main>;
 if(!session)return <main className="center"><form className="login" onSubmit={login}><div className="mark">iSYS</div><h1>Přihlášení do systému</h1><p>Interní systém správy bytových domů</p><label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label><label>Heslo<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/></label>{error&&<div role="alert" className="error">{error}</div>}<button disabled={busy}>{busy?"Přihlašuji…":"Přihlásit se"}</button><small>Účty zakládá správce systému.</small></form></main>;
 const pages=["Přehled","Objekty","Kontroly","Evidence klíčů","Úkoly"];
 return <div className="layout"><aside><div className="brand"><span className="brandicon">⌂</span><div className="mark">iSYS<small>PROPERTY MANAGEMENT</small></div></div><div className="sideTitle">PRACOVNÍ PROSTOR</div>{pages.map(x=><button type="button" className={"nav "+(page===x?"selected":"")} key={x} onClick={()=>{setPage(x);setEditing(null)}}>{["▦","▤","☑","⚿","✓"][pages.indexOf(x)]} &nbsp; {x}</button>)}<div className="sidefooter">iSYS • Webová aplikace</div></aside><section className="content"><header><div className="breadcrumb">Pracovní prostor <span>/</span> <strong>{page}</strong></div><div className="userbar"><span className="avatar">{session.user.email?.slice(0,1).toUpperCase()}</span><button className="logout" onClick={()=>supabase.auth.signOut()}>Odhlásit se</button></div></header><div className="body">{page==="Přehled"?<><div className="hero"><div><div className="eyebrow">PŘEHLED SPRÁVY</div><h1>Vítej v iSYS</h1><p>Vše důležité o spravovaných objektech na jednom místě.</p></div><button className="heroaction" onClick={()=>setPage("Objekty")}>Přejít na objekty →</button></div><div className="tiles">{["Spravované objekty","Pravidelné kontroly","Evidence klíčů","Otevřené úkoly"].map((x,i)=><article key={x}><h3>{x}</h3><p>{i===0?(listLoading?"Načítání…":listError?"Nedostupné":buildings.length):"Modul připravujeme"}</p></article>)}</div><div className="notice">Evidence objektů je připravena. Další moduly budeme postupně připojovat.</div></>:page==="Objekty"?<><div className="pageheading"><div><h1>Evidence objektů</h1><p>Seznam spravovaných domů</p></div>{role==="admin"&&<div className="toolbar"><button className="secondarybutton" onClick={downloadTemplate}>↓ Šablona Excel</button><label className="secondarybutton filebutton">↑ Import Excel<input type="file" accept=".xlsx,.xls" onChange={readExcel}/></label><button className="primary" onClick={()=>openForm()}>+ Přidat objekt</button></div>}</div>{message&&<div className="notice" role="status">{message}</div>}{importError&&<div className="error" role="alert">{importError}</div>}{importRows&&role==="admin"&&<div className="importpanel"><h3>Náhled importu: {importRows.length} objektů</h3><p>První řádky: {importRows.slice(0,5).map(r=>r.name+" – "+r.address).join("; ")}</p><div className="actions"><button className="secondarybutton" onClick={()=>setImportRows(null)}>Zrušit</button><button className="primary" disabled={importBusy} onClick={importExcel}>{importBusy?"Importuji…":"Potvrdit import"}</button></div></div>}{listError&&<div className="error" role="alert">{listError}</div>}{<input className="searchbox" placeholder="⌕  Hledat objekt nebo adresu…" value={search} onChange={e=>setSearch(e.target.value)}/> }{listLoading?<p>Načítání objektů…</p>:<div className="buildinglist">{buildings.filter(b=>(b.name+" "+b.address).toLocaleLowerCase("cs").includes(search.toLocaleLowerCase("cs"))).length===0?<article><h3>Zatím nejsou evidované žádné objekty</h3><p>{role==="admin"?"Začni tlačítkem Přidat objekt.":"Kontaktuj administrátora pro založení objektů."}</p></article>:buildings.filter(b=>(b.name+" "+b.address).toLocaleLowerCase("cs").includes(search.toLocaleLowerCase("cs"))).map(b=><article key={b.id}><div><h3>{b.name}</h3><p>{b.address}</p>{b.description&&<p>{b.description}</p>}</div>{role==="admin"&&<button className="logout" onClick={()=>openForm(b)}>Upravit</button>}</article>)}</div>}{editing&&role==="admin"&&<div className="overlay"><form className="modal" onSubmit={save}><h2>{editing==="new"?"Nový objekt":"Upravit objekt"}</h2><label>Název objektu<input maxLength="200" required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Adresa<input maxLength="300" required value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label><label>Poznámka<textarea rows="4" maxLength="3000" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>{message&&<div className="error" role="alert">{message}</div>}<div className="actions"><button type="button" className="logout" onClick={()=>setEditing(null)}>Zrušit</button><button className="primary" disabled={saving}>{saving?"Ukládám…":"Uložit objekt"}</button></div></form></div>}</>:<><h1>{page}</h1><div className="notice">Tento modul připravujeme.</div></>}</div></section></div>
}
createRoot(document.getElementById("root")).render(<App/>);
