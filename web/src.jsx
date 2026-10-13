import React,{useEffect,useState,useCallback,useRef} from "react";
import {createRoot} from "react-dom/client";
import {createClient} from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import "./style.css";
import Inspections from "./Inspections.jsx";
import Tasks from "./Tasks.jsx";
export const supabase=createClient("https://qcbyjxovnf fdruiznlnt.supabase.co".replace(" ",""),"sb_publishable_AFfvrodRnmBTOLjlFadYfQ_Foa4e_P1");
const extraFields=[["object_number","Číslo objektu"],["street","Ulice"],["city","Město"],["manager","Technik"],["referent","Referent"],["economist","Ekonom"],["accountant","Účetní"],["legal_entity","Hlavní účetní subjekt"],["company_id","IČO"],["external_id","Unikátní číslo"],["flats_count","Počet bytů"],["nonresidential_count","Počet nebytů"],["garages_count","Počet garáží"],["shared_spaces_count","Počet spol. prostor"],["invoice_approvers_count","Počet schvalovatelů faktur"],["manager_flag","P. Správce"],["economist_flag","P. Ekon"]];
const numericFields=["flats_count","nonresidential_count","garages_count","shared_spaces_count","invoice_approvers_count","manager_flag","economist_flag"];
const empty={name:"",address:"",description:"",...Object.fromEntries(extraFields.map(([k])=>[k,""]))};
const dashboardWidgetCatalog=[["buildings","Spravované objekty","Počet evidovaných objektů"],["flats","Bytové jednotky","Součet bytů ve všech objektech"],["nonresidential","Nebytové prostory","Celkový počet nebytových prostor"],["garages","Garáže","Součet evidovaných garáží"],["cities","Města / lokality","Počet různých lokalit"],["technicians","Technici","Počet přiřazených techniků"],["referents","Referenti","Počet přiřazených referentů"],["unassignedTech","Bez technika","Objekty bez přiřazeného technika"],["unassignedRef","Bez referenta","Objekty bez přiřazeného referenta"],["referentBuildings","Objekty referenta","Počet objektů přiřazených referentovi"],["referentFlats","Byty referenta","Počet bytů v objektech referenta"],["referentNonresidential","Nebytové prostory referenta","Nebytové prostory objektů referenta"],["referentGarages","Garáže referenta","Garáže v objektech referenta"]];
const widgetColors=[["default","Výchozí"],["blue","Modrá"],["green","Zelená"],["orange","Oranžová"],["purple","Fialová"],["red","Červená"],["teal","Tyrkysová"]];
const defaultDashboardWidgets=["buildings","flats","technicians","unassignedTech"];
const readView=()=>{try{return JSON.parse(sessionStorage.getItem("isys-view")||"{}")}catch{return {}}};
function FilterDropdown({label,value,options,onChange}){
 const [open,setOpen]=useState(false),root=useRef(null);
 useEffect(()=>{if(!open)return;const close=e=>{if(!root.current?.contains(e.target))setOpen(false)};const escape=e=>{if(e.key==="Escape"){setOpen(false);root.current?.querySelector("button")?.focus()}};document.addEventListener("pointerdown",close);document.addEventListener("keydown",escape);return()=>{document.removeEventListener("pointerdown",close);document.removeEventListener("keydown",escape)}},[open]);
 return <div className={"filterdropdown"+(open?" isopen":"")} ref={root}><button type="button" className="filtertrigger" aria-label={label} aria-expanded={open} aria-haspopup="listbox" onClick={()=>setOpen(o=>!o)}><span>{value||"Všichni – "+label.toLowerCase()}</span><span className="filterchevron" aria-hidden="true">⌄</span></button>{open&&<div className="filtermenu" role="listbox" aria-label={label}><button type="button" role="option" aria-selected={!value} className={!value?"chosen":""} onClick={()=>{onChange("");setOpen(false)}}>Všichni – {label.toLowerCase()}</button>{options.map(option=><button type="button" role="option" aria-selected={value===option} className={value===option?"chosen":""} key={option} onClick={()=>{onChange(option);setOpen(false)}}>{option}</button>)}</div>}</div>
}
function App(){
 const [initialView]=useState(()=>({...readView(),scrollY:(()=>{try{return sessionStorage.getItem("isys-scroll")}catch{return 0}})()}));
 const [theme,setTheme]=useState(()=>{try{return localStorage.getItem("isys-theme")||"light"}catch{return "light"}});
 useEffect(()=>{document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;try{localStorage.setItem("isys-theme",theme)}catch{}},[theme]);
 const accentThemes=[["blue","Modrá"],["green","Zelená"],["purple","Fialová"],["orange","Oranžová"],["red","Červená"],["teal","Tyrkysová"]];
 const [accentTheme,setAccentTheme]=useState(()=>{try{return localStorage.getItem("isys-accent-theme")||"blue"}catch{return "blue"}});
 useEffect(()=>{document.documentElement.dataset.accent=accentThemes.some(([id])=>id===accentTheme)?accentTheme:"blue";try{localStorage.setItem("isys-accent-theme",accentTheme)}catch{}},[accentTheme]);
 const [session,setSession]=useState(null),[loading,setLoading]=useState(true),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const [importRows,setImportRows]=useState(null),[importError,setImportError]=useState(""),[importBusy,setImportBusy]=useState(false),[search,setSearch]=useState(initialView.search||"");
 const [selectedBuilding,setSelectedBuilding]=useState(null);
 const [buildingView,setBuildingView]=useState(()=>{try{return localStorage.getItem("isys-building-view")==="list"?"list":"cards"}catch{return "cards"}});
 useEffect(()=>{try{localStorage.setItem("isys-building-view",buildingView)}catch{}},[buildingView]);
 const [dashboardWidgets,setDashboardWidgets]=useState(defaultDashboardWidgets);
 const [widgetPickerOpen,setWidgetPickerOpen]=useState(false);
 const [userMenuOpen,setUserMenuOpen]=useState(false);
 const [passwordFormOpen,setPasswordFormOpen]=useState(false);
 const [currentPassword,setCurrentPassword]=useState("");
 const [newPassword,setNewPassword]=useState("");
 const [confirmPassword,setConfirmPassword]=useState("");
 const [passwordSaving,setPasswordSaving]=useState(false);
 const [passwordNotice,setPasswordNotice]=useState("");
 const clearPasswordForm=()=>{setCurrentPassword("");setNewPassword("");setConfirmPassword("");setPasswordNotice("")};
 const changePassword=async e=>{
  e.preventDefault();
  if(passwordSaving)return;
  if(!currentPassword){setPasswordNotice("Zadej současné heslo.");return}
  if(newPassword.length<8){setPasswordNotice("Nové heslo musí mít alespoň 8 znaků.");return}
  if(newPassword!==confirmPassword){setPasswordNotice("Nová hesla se neshodují.");return}
  if(currentPassword===newPassword){setPasswordNotice("Nové heslo se musí lišit od současného.");return}
  setPasswordSaving(true);setPasswordNotice("");
  try{
   const {error:verifyError}=await supabase.auth.signInWithPassword({email:session.user.email,password:currentPassword});
   if(verifyError){setPasswordNotice("Současné heslo není správné nebo ověření selhalo.");return}
   const {error:updateError}=await supabase.auth.updateUser({password:newPassword});
   if(updateError){setPasswordNotice("Heslo se nepodařilo změnit: "+updateError.message);return}
   setCurrentPassword("");setNewPassword("");setConfirmPassword("");setPasswordNotice("Heslo bylo úspěšně změněno.");setPasswordFormOpen(false);
  }catch{setPasswordNotice("Změna hesla se nezdařila. Zkus to znovu.")}
  finally{setPasswordSaving(false)}
 };

 const userMenuRef=useRef(null);
 useEffect(()=>{if(!userMenuOpen)return;const close=e=>{if(!userMenuRef.current?.contains(e.target))setUserMenuOpen(false)};const escape=e=>{if(e.key==="Escape")setUserMenuOpen(false)};document.addEventListener("pointerdown",close);document.addEventListener("keydown",escape);return()=>{document.removeEventListener("pointerdown",close);document.removeEventListener("keydown",escape)}},[userMenuOpen]);
 const [myTechnician,setMyTechnician]=useState("");
 const [myReferent,setMyReferent]=useState("");
 const [reportSignature,setReportSignature]=useState({name:"",image:"",path:""});
 const [signatureNotice,setSignatureNotice]=useState("");
 const [signatureBusy,setSignatureBusy]=useState(false);
 useEffect(()=>{
  const uid=session?.user?.id;
  if(!uid){setReportSignature({name:"",image:"",path:""});return}
  let cancelled=false;
  setReportSignature({name:"",image:"",path:""});
  setSignatureNotice("");
  (async()=>{
   const {data,error}=await supabase.from("user_report_settings").select("signature_name,signature_path").eq("user_id",uid).maybeSingle();
   if(cancelled)return;
   if(error){setSignatureNotice("Nastavení podpisu se nepodařilo načíst. Spusť nejprve SQL skript v Supabase.");return}
   let image="";
   if(data?.signature_path){
    const {data:file,error:fileError}=await supabase.storage.from("report-signatures").download(data.signature_path);
    if(cancelled)return;
    if(fileError)setSignatureNotice("Obrázek podpisu se nepodařilo načíst: "+fileError.message);
    else image=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||""));reader.onerror=reject;reader.readAsDataURL(file)});
   }
   if(!cancelled)setReportSignature({name:data?.signature_name||"",image,path:data?.signature_path||""});
  })().catch(()=>{if(!cancelled)setSignatureNotice("Načtení podpisu se nezdařilo.")});
  return()=>{cancelled=true};
 },[session?.user?.id]);
 const saveReportSignature=async(value)=>{
  const uid=session?.user?.id;if(!uid)return;
  setSignatureBusy(true);setSignatureNotice("");
  const {error}=await supabase.from("user_report_settings").upsert({user_id:uid,signature_name:value.name.trim(),signature_path:value.path||null,updated_at:new Date().toISOString()},{onConflict:"user_id"});
  setSignatureBusy(false);
  setSignatureNotice(error?"Uložení podpisu se nezdařilo: "+error.message:"Podpis uložen k tvému účtu.");
 };
 const uploadReportSignature=async e=>{
  const file=e.target.files?.[0];e.target.value="";
  if(!file)return;
  if(!["image/png","image/jpeg","image/webp"].includes(file.type)){setSignatureNotice("Vyber obrázek PNG, JPG nebo WebP.");return}
  if(file.size>2000000){setSignatureNotice("Soubor je příliš velký (max. 2 MB).");return}
  const uid=session?.user?.id;if(!uid)return;
  setSignatureBusy(true);setSignatureNotice("");
  const extension={"image/png":"png","image/jpeg":"jpg","image/webp":"webp"}[file.type];
  const path=uid+"/signature."+extension;
  try{
   const {error:uploadError}=await supabase.storage.from("report-signatures").upload(path,file,{upsert:true,contentType:file.type,cacheControl:"0"});
   if(uploadError)throw uploadError;
   const {error:dbError}=await supabase.from("user_report_settings").upsert({user_id:uid,signature_name:reportSignature.name.trim(),signature_path:path,updated_at:new Date().toISOString()},{onConflict:"user_id"});
   if(dbError)throw dbError;
   const image=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||""));reader.onerror=reject;reader.readAsDataURL(file)});
   const oldPath=reportSignature.path;
   setReportSignature(prev=>({...prev,image,path}));
   if(oldPath&&oldPath!==path)await supabase.storage.from("report-signatures").remove([oldPath]);
   setSignatureNotice("Obrázek podpisu uložen k tvému účtu.");
  }catch(error){setSignatureNotice("Nahrání podpisu se nezdařilo: "+(error?.message||"Neznámá chyba"))}
  finally{setSignatureBusy(false)}
 };
 const removeReportSignature=async()=>{
  const uid=session?.user?.id;if(!uid||signatureBusy)return;
  setSignatureBusy(true);setSignatureNotice("");
  const oldPath=reportSignature.path;
  const {error}=await supabase.from("user_report_settings").upsert({user_id:uid,signature_name:reportSignature.name.trim(),signature_path:null,updated_at:new Date().toISOString()},{onConflict:"user_id"});
  if(error)setSignatureNotice("Odebrání podpisu se nezdařilo: "+error.message);
  else{setReportSignature(prev=>({...prev,image:"",path:""}));if(oldPath)await supabase.storage.from("report-signatures").remove([oldPath]);setSignatureNotice("Obrázek podpisu odebrán z účtu.")}
  setSignatureBusy(false);
 };

 const [widgetScopes,setWidgetScopes]=useState({});
 const [widgetSettingsOpen,setWidgetSettingsOpen]=useState(null);
 useEffect(()=>{if(!widgetSettingsOpen)return;const close=e=>{if(!e.target.closest(".widgetscope,.widgetconfig"))setWidgetSettingsOpen(null)};const esc=e=>{if(e.key==="Escape")setWidgetSettingsOpen(null)};document.addEventListener("pointerdown",close);document.addEventListener("keydown",esc);return()=>{document.removeEventListener("pointerdown",close);document.removeEventListener("keydown",esc)}},[widgetSettingsOpen]);
 const [widgetColorsById,setWidgetColorsById]=useState({});
 const [draggedWidget,setDraggedWidget]=useState(null);
 const changeWidgetColor=(id,color)=>{const next={...widgetColorsById,[id]:color};setWidgetColorsById(next);if(session?.user?.id)try{localStorage.setItem("isys-widget-colors-"+session.user.id,JSON.stringify(next))}catch{}};
 const moveWidget=(from,to)=>{if(from===to)return;const next=[...dashboardWidgets];const a=next.indexOf(from),b=next.indexOf(to);if(a<0||b<0)return;next.splice(a,1);next.splice(b,0,from);changeDashboardWidgets(next)};

 useEffect(()=>{if(!session?.user?.id)return;try{setMyTechnician(localStorage.getItem("isys-technician-"+session.user.id)||"");setMyReferent(localStorage.getItem("isys-referent-"+session.user.id)||"");setWidgetScopes(JSON.parse(localStorage.getItem("isys-widget-scopes-"+session.user.id)||"{}"));setWidgetColorsById(JSON.parse(localStorage.getItem("isys-widget-colors-"+session.user.id)||"{}"))}catch{setMyTechnician("");setMyReferent("");setWidgetScopes({});setWidgetColorsById({})}},[session?.user?.id]);
 const changeMyReferent=name=>{setMyReferent(name);if(session?.user?.id)try{localStorage.setItem("isys-referent-"+session.user.id,name)}catch{}};
 const changeMyTechnician=name=>{setMyTechnician(name);if(session?.user?.id)try{localStorage.setItem("isys-technician-"+session.user.id,name)}catch{}};
 const changeWidgetScope=(id,scope)=>{const next={...widgetScopes,[id]:scope};setWidgetScopes(next);if(session?.user?.id)try{localStorage.setItem("isys-widget-scopes-"+session.user.id,JSON.stringify(next))}catch{}};

 useEffect(()=>{if(!session?.user?.id)return;try{const saved=JSON.parse(localStorage.getItem("isys-widgets-"+session.user.id)||"null");setDashboardWidgets(Array.isArray(saved)?[...new Set(saved.filter(id=>dashboardWidgetCatalog.some(w=>w[0]===id)))]:defaultDashboardWidgets)}catch{setDashboardWidgets(defaultDashboardWidgets)}},[session?.user?.id]);
 const changeDashboardWidgets=next=>{setDashboardWidgets(next);if(session?.user?.id)try{localStorage.setItem("isys-widgets-"+session.user.id,JSON.stringify(next))}catch{}};
 const [filters,setFilters]=useState(initialView.filters||{city:"",manager:"",referent:""});
 const [widgetBuildingFilter,setWidgetBuildingFilter]=useState(null);
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


 const normHeader=x=>String(x??"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
 const importColumns={object_number:["objekt","cisloobjektu","objectnumber"],street:["ulice","street"],city:["mesto","city"],manager:["spravce","technik","manager"],referent:["referent"],economist:["ekonom"],accountant:["ucetni"],legal_entity:["hlavniucetnisubjekt"],company_id:["ico"],external_id:["unikatnicislo"],flats_count:["pocetbytu"],nonresidential_count:["pocetnebytu"],garages_count:["pocetgarazi"],shared_spaces_count:["pocetspolprostor"],invoice_approvers_count:["pocetschvalovatelufaktur"],manager_flag:["pspravce"],economist_flag:["pekon"],name:["nazev","nazevobjektu","name"],address:["adresa","adresaobjektu","address"],description:["poznamka","popis","description","note"]};
 async function readExcel(e){
  const file=e.target.files?.[0];e.target.value="";if(!file)return;
  setImportError("");setImportRows(null);setMessage("");
  if(file.size>5*1024*1024){setImportError("Soubor je příliš velký (max. 5 MB).");return}
  if(!buildings.length||listError){setImportError("Nejdřív musí být načtena evidence objektů.");return}
  try{
   const wb=XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:false});
   const sheet=wb.Sheets[wb.SheetNames[0]];
   const rows=XLSX.utils.sheet_to_json(sheet,{defval:"",raw:false,blankrows:false});
   if(!rows.length){setImportError("Soubor neobsahuje žádné datové řádky.");return}
   if(rows.length>500){setImportError("Maximálně 500 řádků v jednom souboru.");return}
   const headers=Object.keys(rows[0]);
   const colMap=Object.fromEntries(Object.entries(importColumns).map(([key,aliases])=>[key,headers.find(h=>aliases.includes(normHeader(h)))]).filter(([,h])=>h!==undefined));
   if(!colMap.object_number&&!colMap.external_id&&!(colMap.name&&colMap.address)&&!(colMap.street&&colMap.city)){setImportError("Chybí identifikátor objektu. CSV musí obsahovat sloupec Objekt nebo Unikátní číslo, případně Název + Adresa či Ulice + Město.");return}
   const byNumber=new Map(),byExternal=new Map(),byAddress=new Map();
   const add=(map,key,b)=>{if(!key)return;const items=map.get(key)||[];items.push(b);map.set(key,items)};
   const clean=x=>String(x??"").trim().toLocaleLowerCase("cs").replace(/\s+/g," ");
   for(const b of buildings){add(byNumber,clean(b.object_number),b);add(byExternal,clean(b.external_id),b);add(byAddress,clean(b.name)+"|"+clean(b.address),b);if(b.street&&b.city)add(byAddress,clean(b.street)+"|"+clean(b.city),b)}
   const planned=[],skipped=[],seen=new Set();
   for(let i=0;i<rows.length;i++){
    const r=rows[i],get=key=>colMap[key]===undefined?"":String(r[colMap[key]]??"").trim();
    let matches=[],matchedBy="";
    if(get("object_number")){matches=byNumber.get(clean(get("object_number")))||[];matchedBy="číslo objektu"}
    else if(get("external_id")){matches=byExternal.get(clean(get("external_id")))||[];matchedBy="unikátní číslo"}
    else if(get("name")&&get("address")){matches=byAddress.get(clean(get("name"))+"|"+clean(get("address")))||[];matchedBy="název a adresa"}
    else if(get("street")&&get("city")){matches=byAddress.get(clean(get("street"))+"|"+clean(get("city")))||[];matchedBy="ulice a město"}
    if(matches.length!==1){skipped.push({row:i+2,reason:matches.length?"Nejednoznačná shoda":"Objekt nenalezen"});continue}
    const target=matches[0];
    if(seen.has(target.id)){skipped.push({row:i+2,reason:"Opakovaný objekt v souboru"});continue}
    const patch={};
    for(const key of Object.keys(colMap)){
     if(key==="object_number"||key==="external_id")continue;
     const value=get(key);
     if(value==="")continue; // Empty cells must never erase existing values.
     if(numericFields.includes(key)){const n=Number(value.replace(/\s/g,"").replace(",","."));if(!Number.isInteger(n)||n<0){throw Error("Neplatné číslo na řádku "+(i+2)+", sloupec "+colMap[key]);}patch[key]=n}
     else patch[key]=value;
    }
    if(colMap.street||colMap.city){
     const street=get("street")||target.street||"",city=get("city")||target.city||"";
     if(!colMap.address&&street&&city)patch.address=[street,city].join(", ");
    }
    if(Object.keys(patch).length===0){skipped.push({row:i+2,reason:"Žádné hodnoty k aktualizaci"});continue}
    if((patch.name&&patch.name.length>200)||(patch.address&&patch.address.length>300)||(patch.description&&patch.description.length>3000))throw Error("Příliš dlouhá hodnota na řádku "+(i+2));
    seen.add(target.id);planned.push({row:i+2,id:target.id,name:target.name,patch,matchedBy});
   }
   setImportRows({planned,skipped,fileName:file.name});
  }catch(err){setImportError("Soubor se nepodařilo zpracovat: "+err.message)}
 }
 async function importExcel(){
  if(role!=="admin"||!importRows?.planned?.length)return;
  setImportBusy(true);setImportError("");
  let updated=0;
  for(const item of importRows.planned){
   const {error}=await supabase.from("buildings").update(item.patch).eq("id",item.id);
   if(error){setImportError("Aktualizace přerušena po "+updated+" objektech, řádek "+item.row+": "+error.message);setImportBusy(false);await load();return}
   updated++;
  }
  const skipped=importRows.skipped.length;
  setImportRows(null);setImportBusy(false);await load();
  setMessage("Aktualizováno "+updated+" objektů. Přeskočeno "+skipped+" řádků. Nebyl vytvořen žádný nový objekt.");
 }
 function downloadTemplate(){
  const wb=XLSX.utils.book_new();const ws=XLSX.utils.aoa_to_sheet([["Objekt","Ulice","Město","Správce","Ekonom","Účetní","Hlavní účetní subjekt","IČO","Unikátní číslo","Počet bytů","Počet nebytů","Počet garáží","Počet spol. prostor","Počet schvalovatelů faktur","Poznámka","P. Správce","P. Ekon"],["001","Ukázková 123","Praha 8","Jan Novák","","","SVJ Ukázková","12345678","abc123",24,0,4,2,1,"Ukázkový objekt",1,1]]);
  XLSX.utils.book_append_sheet(wb,ws,"Objekty");XLSX.writeFile(wb,"isys_sablona_objekty.xlsx");
 }
 const [mobileMenuOpen,setMobileMenuOpen]=useState(false);
 const mobileNavRef=useRef(null);
 useEffect(()=>{if(!mobileMenuOpen)return;const onKey=e=>{if(e.key==="Escape")setMobileMenuOpen(false)};const onPointer=e=>{if(mobileNavRef.current&&!mobileNavRef.current.contains(e.target))setMobileMenuOpen(false)};document.addEventListener("keydown",onKey);document.addEventListener("pointerdown",onPointer);return()=>{document.removeEventListener("keydown",onKey);document.removeEventListener("pointerdown",onPointer)}},[mobileMenuOpen]);
 if(loading)return <main className="center">Načítání iSYS…</main>;
 if(!session)return <main className="center"><form className="login" onSubmit={login}><div className="mark">iSYS</div><h1>Přihlášení do systému</h1><p>Interní systém správy bytových domů</p><label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label><label>Heslo<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/></label>{error&&<div role="alert" className="error">{error}</div>}<button disabled={busy}>{busy?"Přihlašuji…":"Přihlásit se"}</button><small>Účty zakládá správce systému.</small></form></main>;
 const filterOptions=Object.fromEntries(["city","manager","referent"].map(key=>[key,[...new Set(buildings.map(b=>String(b[key]??"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"cs"))]));
 const visibleBuildings=buildings.filter(b=>[b.name,b.address,b.object_number,b.manager,b.referent].join(" ").toLocaleLowerCase("cs").includes(search.toLocaleLowerCase("cs"))&&Object.entries(filters).every(([key,value])=>!value||String(b[key]??"")===value)&&(!widgetBuildingFilter||widgetBuildingFilter==="unassignedTech"&&!String(b.manager||"").trim()||widgetBuildingFilter==="unassignedRef"&&!String(b.referent||"").trim()||widgetBuildingFilter==="hasFlats"&&Number(b.flats_count)>0||widgetBuildingFilter==="hasNonresidential"&&Number(b.nonresidential_count)>0||widgetBuildingFilter==="hasGarages"&&Number(b.garages_count)>0));
 const filtersActive=Boolean(search.trim()||Object.values(filters).some(Boolean)||widgetBuildingFilter);
 const dashboardStats=rows=>({buildings:rows.length,flats:rows.reduce((sum,b)=>sum+(Number(b.flats_count)||0),0),nonresidential:rows.reduce((sum,b)=>sum+(Number(b.nonresidential_count)||0),0),garages:rows.reduce((sum,b)=>sum+(Number(b.garages_count)||0),0),cities:new Set(rows.map(b=>String(b.city||"").trim()).filter(Boolean)).size,technicians:new Set(rows.map(b=>String(b.manager||"").trim()).filter(Boolean)).size,referents:new Set(rows.map(b=>String(b.referent||"").trim()).filter(Boolean)).size,unassignedTech:rows.filter(b=>!String(b.manager||"").trim()).length,unassignedRef:rows.filter(b=>!String(b.referent||"").trim()).length});
 const dashboardValues=dashboardStats(buildings);
 const myDashboardValues=dashboardStats(myTechnician?buildings.filter(b=>String(b.manager||"").trim()===myTechnician):[]);
 const technicianOptions=[...new Set(buildings.map(b=>String(b.manager||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"cs"));
 const referentOptions=[...new Set(buildings.map(b=>String(b.referent||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"cs"));
 const referentRows=myReferent?buildings.filter(b=>String(b.referent||"").trim()===myReferent):[];
 const referentValues={referentBuildings:referentRows.length,referentFlats:referentRows.reduce((sum,b)=>sum+(Number(b.flats_count)||0),0),referentNonresidential:referentRows.reduce((sum,b)=>sum+(Number(b.nonresidential_count)||0),0),referentGarages:referentRows.reduce((sum,b)=>sum+(Number(b.garages_count)||0),0)};
 const openWidgetBuildings=id=>{
  const isReferent=id.startsWith("referent")&&id!=="referents";
  const scope=widgetScopes[id]||"all";
  setSearch("");setSelectedBuilding(null);
  setFilters({city:"",manager:isReferent?"":scope==="mine"?myTechnician:"",referent:isReferent?myReferent:""});
  const special={unassignedTech:"unassignedTech",unassignedRef:"unassignedRef",flats:"hasFlats",referentFlats:"hasFlats",nonresidential:"hasNonresidential",referentNonresidential:"hasNonresidential",garages:"hasGarages",referentGarages:"hasGarages"};
  setWidgetBuildingFilter(special[id]||null);
  setPage("Objekty");
  window.scrollTo({top:0,behavior:"smooth"});
 };
 const pages=["Přehled","Objekty","Kontroly","Evidence klíčů","Úkoly"];
 return <div className="layout"><aside ref={mobileNavRef} className={mobileMenuOpen?"mobile-nav-open":""}><div className="mobile-nav-top"><button type="button" className="mobile-hamburger" aria-label={mobileMenuOpen?"Zavřít navigaci":"Otevřít navigaci"} aria-expanded={mobileMenuOpen} aria-controls="isys-main-navigation" onClick={()=>setMobileMenuOpen(v=>!v)}><span/><span/><span/></button><span className="mobile-nav-title">iSYS</span></div><div className="brand"><img className="brandicon brandlogo" src="/isys/icon.svg" alt="Logo iSYS"/><div className="mark">iSYS<small>PROPERTY MANAGEMENT</small></div></div><div id="isys-main-navigation" className="side-navigation"><div className="sideTitle">PRACOVNÍ PROSTOR</div>{pages.map(x=><button type="button" className={"nav "+(page===x?"selected":"")} key={x} onClick={()=>{setPage(x);setEditing(null);setSelectedBuilding(null);setMobileMenuOpen(false)}}>{["▦","▤","☑","⚿","✓"][pages.indexOf(x)]} &nbsp; {x}</button>)}<div className="sidefooter">iSYS • Webová aplikace</div></div></aside><section className="content"><header><nav className="breadcrumb" aria-label="Drobečková navigace"><button type="button" className="breadcrumblink" onClick={()=>{setPage("Přehled");setSelectedBuilding(null);setEditing(null)}}>Pracovní prostor</button><span aria-hidden="true">/</span>{selectedBuilding&&page==="Objekty"?<><button type="button" className="breadcrumblink" onClick={()=>{setPage("Objekty");setSelectedBuilding(null);setEditing(null)}}>Objekty</button><span aria-hidden="true">/</span><strong aria-current="page">{selectedBuilding.name||selectedBuilding.object_number||"Detail objektu"}</strong></>:<button type="button" className="breadcrumblink breadcrumbcurrent" aria-current="page" onClick={()=>{setPage(page);setSelectedBuilding(null);setEditing(null)}}>{page}</button>}</nav><div className="userbar"><div className="userprofile" ref={userMenuRef}><button type="button" className="avatar avatarbutton" aria-label="Otevřít uživatelské nastavení" aria-expanded={userMenuOpen} onClick={()=>setUserMenuOpen(o=>!o)}>{session.user.email?.slice(0,1).toUpperCase()}</button>{userMenuOpen&&<div className="userdropdown"><strong>Uživatelské nastavení</strong><small className="useremail">{session.user.email}</small><div className="mytechnicianfield"><label>Technik</label><FilterDropdown label="Technik" value={myTechnician} options={technicianOptions} onChange={changeMyTechnician}/><small>Pro widgety s filtrem „Moje objekty“.</small></div><div className="mytechnicianfield userfieldspacing"><label>Referent</label><FilterDropdown label="Referent" value={myReferent} options={referentOptions} onChange={changeMyReferent}/><small>Pro widgety referenta.</small></div><div className="profiletheme"><strong>Vzhled aplikace</strong><div className="profilethemebuttons"><button type="button" className={theme==="light"?"active":""} onClick={()=>setTheme("light")}>☀ Světlý</button><button type="button" className={theme==="dark"?"active":""} onClick={()=>setTheme("dark")}>☾ Tmavý</button></div><div className="profileaccent"><strong>Barevný motiv systému</strong><div className="profileaccentgrid">{accentThemes.map(([id,label])=><button type="button" key={id} className={"accentchoice accent-"+id+(accentTheme===id?" selected":"")} aria-label={"Motiv "+label} aria-pressed={accentTheme===id} title={label} onClick={()=>setAccentTheme(id)}><span className="accentdot"/><span>{label}</span>{accentTheme===id&&<span aria-hidden="true">✓</span>}</button>)}</div></div></div><div className="profilesignature"><strong>Podpis do reportů</strong><small>Automaticky se vloží do výkazů kontrol. Nastavení se ukládá k tvému účtu a synchronizuje mezi zařízeními.</small><label htmlFor="report-signature-name">Jméno a funkce pod podpisem</label><input id="report-signature-name" value={reportSignature.name} maxLength={120} placeholder="Např. Jan Novák, technik" onChange={e=>setReportSignature(prev=>({...prev,name:e.target.value}))} onBlur={()=>saveReportSignature(reportSignature)}/><label htmlFor="report-signature-image">Obrázek vlastnoručního podpisu (PNG, JPG, WebP)</label><input id="report-signature-image" type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadReportSignature}/>{reportSignature.image&&<div className="signaturepreview"><img src={reportSignature.image} alt="Náhled podpisu"/><button type="button" onClick={removeReportSignature} disabled={signatureBusy}>Odstranit obrázek</button></div>}<small>{signatureBusy?"Ukládám do účtu…":""}</small><small>Razítko bude možné doplnit později. Podpis používej pouze se souhlasem jeho vlastníka.</small>{signatureNotice&&<small role="status">{signatureNotice}</small>}</div><div className="profilepassword"><button type="button" className="passwordtoggle" aria-expanded={passwordFormOpen} onClick={()=>{setPasswordFormOpen(o=>!o);clearPasswordForm()}}>Změnit heslo <span aria-hidden="true">{passwordFormOpen?"⌃":"⌄"}</span></button>{passwordFormOpen&&<form className="passwordform" onSubmit={changePassword}><label htmlFor="current-password">Současné heslo</label><input id="current-password" type="password" autoComplete="current-password" required value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/><label htmlFor="new-password">Nové heslo</label><input id="new-password" type="password" autoComplete="new-password" required minLength={8} value={newPassword} onChange={e=>setNewPassword(e.target.value)}/><label htmlFor="confirm-password">Potvrzení nového hesla</label><input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/><small>Minimálně 8 znaků. Heslo musí být odlišné od současného.</small><button type="submit" className="primary" disabled={passwordSaving}>{passwordSaving?"Ukládám…":"Uložit nové heslo"}</button></form>}{passwordNotice&&<p className="passwordnotice" role="status">{passwordNotice}</p>}</div></div>}</div><button className="logout" onClick={()=>{try{sessionStorage.removeItem("isys-view");sessionStorage.removeItem("isys-scroll")}catch{}supabase.auth.signOut()}}>Odhlásit se</button></div></header><div className="body">{page==="Přehled"?<><div className="hero"><div><div className="eyebrow">PŘEHLED SPRÁVY</div><h1>Vítej v iSYS</h1><p>Vše důležité o spravovaných objektech na jednom místě.</p></div></div><div className="dashboardwidgetheading"><div><h2>Moje widgety</h2><p>Přizpůsob si údaje na hlavním přehledu. Dlaždice můžeš přetáhnout a změnit jejich pořadí.</p></div><button type="button" className="secondarybutton" onClick={()=>setWidgetPickerOpen(o=>!o)} aria-expanded={widgetPickerOpen}>{widgetPickerOpen?"Zavřít výběr":"+ Přidat widget"}</button></div>{widgetPickerOpen&&<div className="widgetpicker widgetpickeranimated"><div className="widgetpickerhead"><strong>Vyber widgety</strong><button type="button" className="secondarybutton" onClick={()=>changeDashboardWidgets(defaultDashboardWidgets)}>Obnovit výchozí</button></div><div className="widgetchoices">{dashboardWidgetCatalog.map(([id,title,description])=><label key={id}><input type="checkbox" checked={dashboardWidgets.includes(id)} onChange={e=>changeDashboardWidgets(e.target.checked?[...dashboardWidgets,id]:dashboardWidgets.filter(w=>w!==id))}/><span><strong>{title}</strong><small>{description}</small></span></label>)}</div></div>}<div className="tiles dashboardtiles">{dashboardWidgets.length===0?<div className="emptywidgets">Zatím nemáš přidaný žádný widget. Klikni na „Přidat widget“.</div>:dashboardWidgets.map(id=>{const item=dashboardWidgetCatalog.find(w=>w[0]===id);if(!item)return null;const isReferentWidget=id.startsWith("referent")&&id!=="referents";return <article key={id} className={"widgetcard clickabletile "+"widgetcolor-"+(widgetColorsById[id]||"default")+(draggedWidget===id?" widgetdragging":"")} draggable={true} onDragStart={e=>{setDraggedWidget(id);e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",id)}} onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect="move"}} onDrop={e=>{e.preventDefault();const from=e.dataTransfer.getData("text/plain")||draggedWidget;moveWidget(from,id);setDraggedWidget(null)}} onDragEnd={()=>setDraggedWidget(null)} role="button" tabIndex={0} onClick={e=>{if(e.target.closest("button,select,input,.widgetscope"))return;openWidgetBuildings(id)}} onKeyDown={e=>{if((e.key==="Enter"||e.key===" ")&&e.target===e.currentTarget){e.preventDefault();openWidgetBuildings(id)}}}><div className="widgettitle"><h3>{item[1]}</h3><div className="widgetbuttons"><button type="button" className="widgetconfig" aria-label={"Nastavení widgetu "+item[1]} title="Nastavit rozsah widgetu" onClick={e=>{e.stopPropagation();setWidgetSettingsOpen(widgetSettingsOpen===id?null:id)}}>⚙</button><button type="button" className="widgetremove" aria-label={"Odebrat widget "+item[1]} title="Odebrat widget" onClick={e=>{e.stopPropagation();changeDashboardWidgets(dashboardWidgets.filter(w=>w!==id))}}>×</button></div></div>{widgetSettingsOpen===id&&<div className="widgetscope" onClick={e=>e.stopPropagation()}><label htmlFor={"scope-"+id}>Zobrazovat údaje</label><FilterDropdown label="Rozsah objektů" value={(widgetScopes[id]||"all")==="mine"?"Moje objekty":"Všechny objekty"} options={["Všechny objekty","Moje objekty"]} onChange={value=>changeWidgetScope(id,value==="Moje objekty"?"mine":"all")}/>{widgetScopes[id]==="mine"&&!myTechnician&&!isReferentWidget&&<div className="scopewarning">Nejdřív klikni na ikonu uživatele vpravo nahoře a vyber své jméno v evidenci.</div>}{isReferentWidget&&!myReferent&&<div className="scopewarning">Pro tento widget vyber referenta v uživatelském nastavení.</div>}<div className="widgetcoloroptions"><strong>Barva dlaždice</strong><div className="widgetswatches">{widgetColors.map(([color,label])=><button type="button" key={color} className={"widgetswatch swatch-"+color+((widgetColorsById[id]||"default")===color?" selected":"")} title={label} aria-label={"Barva "+label} aria-pressed={(widgetColorsById[id]||"default")===color} onClick={()=>changeWidgetColor(id,color)} />)}</div></div><div className="widgetreorder"><strong>Pořadí v mřížce</strong><div><button type="button" disabled={dashboardWidgets.indexOf(id)===0} onClick={()=>moveWidget(id,dashboardWidgets[dashboardWidgets.indexOf(id)-1])}>← Posunout vlevo</button><button type="button" disabled={dashboardWidgets.indexOf(id)===dashboardWidgets.length-1} onClick={()=>moveWidget(id,dashboardWidgets[dashboardWidgets.indexOf(id)+1])}>Posunout vpravo →</button></div></div></div>}<p className="widgetvalue">{listLoading?"…":listError?"Nedostupné":isReferentWidget?(!myReferent?"—":referentValues[id].toLocaleString("cs-CZ")):widgetScopes[id]==="mine"&&!myTechnician?"—":(widgetScopes[id]==="mine"?myDashboardValues[id]:dashboardValues[id]).toLocaleString("cs-CZ")}</p><small>{isReferentWidget?"Můj referent · ":widgetScopes[id]==="mine"?"Moje objekty · ":"Všechny objekty · "}{item[2]}</small></article>})}</div><div className="supportbanner" role="note"><div className="supporticon" aria-hidden="true">✉</div><div className="supportcopy"><strong>Technické problémy s iSYS?</strong><p>Technické problémy prosím hlaste na e-mail <a href="mailto:juren@sbd8.cz">juren@sbd8.cz</a>.</p></div><a className="supportaction" href="mailto:juren@sbd8.cz?subject=Technick%C3%BD%20probl%C3%A9m%20iSYS">Nahlásit problém ↗</a></div><div className="notice">Evidence objektů je připravena. Další moduly budeme postupně připojovat.</div></>:page==="Objekty"?<><div className="pageheading"><div><h1>Evidence objektů</h1><p>Seznam spravovaných domů</p></div>{role==="admin"&&<div className="toolbar"><button className="secondarybutton" onClick={downloadTemplate}>↓ Šablona Excel</button><label className="secondarybutton filebutton">↑ Import CSV / Excel<input type="file" accept=".csv,.xlsx,.xls,text/csv" onChange={readExcel}/></label><button className="primary" onClick={()=>openForm()}>+ Přidat objekt</button></div>}</div>{message&&<div className="notice" role="status">{message}</div>}{importError&&<div className="error" role="alert">{importError}</div>}{importRows&&role==="admin"&&<div className="importpanel"><h3>Aktualizace z {importRows.fileName}</h3><p><strong>Nalezeno: {importRows.planned.length}</strong> objektů k úpravě. Přeskočeno: {importRows.skipped.length}. Nové objekty se nikdy nevytvářejí.</p><p>První nalezené objekty: {importRows.planned.slice(0,5).map(r=>r.name).join("; ")||"Žádné"}</p>{importRows.skipped.length>0&&<details><summary>Zobrazit přeskočené řádky</summary><div className="importskipped">{importRows.skipped.map(r=><p key={r.row}>Řádek {r.row}: {r.reason}</p>)}</div></details>}<p>Prázdné buňky v CSV/Excelu nepřepisují stávající hodnoty. Identifikátory slouží pouze k nalezení objektu.</p><div className="actions"><button className="secondarybutton" onClick={()=>setImportRows(null)}>Zrušit</button><button className="primary" disabled={importBusy||!importRows.planned.length} onClick={importExcel}>{importBusy?"Aktualizuji…":"Potvrdit aktualizaci"}</button></div></div>}{listError&&<div className="error" role="alert">{listError}</div>}{!selectedBuilding&&<div className="filterpanel"><div className="filterheading"><strong>Filtrovat objekty</strong><span>{visibleBuildings.length} z {buildings.length} objektů</span></div>{widgetBuildingFilter&&<div className="widgetfilterhint">Filtr z widgetu: {({unassignedTech:"Bez technika",unassignedRef:"Bez referenta",hasFlats:"Objekty s byty",hasNonresidential:"Objekty s nebytovými prostory",hasGarages:"Objekty s garážemi"})[widgetBuildingFilter]} <button type="button" onClick={()=>setWidgetBuildingFilter(null)}>× Odebrat</button></div>}<div className="filtercontrols"><input className="searchbox" aria-label="Hledat objekty" placeholder="⌕ Hledat číslo, objekt nebo adresu…" value={search} onChange={e=>setSearch(e.target.value)}/>{[["city","Město"],["manager","Technik"],["referent","Referent"]].map(([key,label])=><FilterDropdown key={key} label={label} value={filters[key]} options={filterOptions[key]} onChange={value=>setFilters(prev=>({...prev,[key]:value}))}/>)}<button type="button" className="secondarybutton" disabled={!filtersActive} onClick={()=>{setSearch("");setFilters({city:"",manager:"",referent:""});setWidgetBuildingFilter(null)}}>Vymazat filtry</button></div></div>}{!selectedBuilding&&<div className="viewtoolbar"><span>Zobrazení objektů</span><div className="viewswitch" role="group" aria-label="Zobrazení objektů"><button type="button" className={buildingView==="cards"?"active":""} aria-pressed={buildingView==="cards"} onClick={()=>setBuildingView("cards")}>▦ Karty</button><button type="button" className={buildingView==="list"?"active":""} aria-pressed={buildingView==="list"} onClick={()=>setBuildingView("list")}>☷ Seznam</button></div></div>}{listLoading?<p>Načítání objektů…</p>:selectedBuilding?<section className="buildingdetail">
 <div className="detailtop"><button className="secondarybutton" onClick={()=>setSelectedBuilding(null)}>← Zpět na objekty</button>{role==="admin"&&<button className="primary" onClick={()=>openForm(selectedBuilding)}>Upravit objekt</button>}</div>
 <div className="detailhero"><span className="detailtag">KARTA OBJEKTU {selectedBuilding.object_number||""}</span><h2>{selectedBuilding.name}</h2><p>{selectedBuilding.address}</p></div>
 <div className="detailsection"><h3>Základní informace</h3><div className="detailgrid">{[["name","Název"],["address","Adresa"],["object_number","Číslo objektu"],["street","Ulice"],["city","Město"]].map(([key,label])=><div className="detailfield" key={key}><span>{label}</span><strong>{selectedBuilding[key]??"—"}</strong></div>)}</div></div>
 <div className="detailsection"><h3>Správa a kontaktní osoby</h3><div className="detailgrid">{extraFields.filter(([k])=>["manager","referent","economist","accountant","legal_entity","company_id","external_id"].includes(k)).map(([key,label])=><div className="detailfield" key={key}><span>{label}</span><strong>{selectedBuilding[key]??"—"}</strong></div>)}</div></div>
 <div className="detailsection"><h3>Počty a další údaje</h3><div className="detailgrid">{extraFields.filter(([k])=>["flats_count","nonresidential_count","garages_count","shared_spaces_count","invoice_approvers_count","manager_flag","economist_flag"].includes(k)).map(([key,label])=><div className="detailfield" key={key}><span>{label}</span><strong>{selectedBuilding[key]??"—"}</strong></div>)}</div></div>
 <div className="detailsection"><h3>Poznámka</h3><p className="detailnote">{selectedBuilding.description||"Bez poznámky"}</p></div>
 </section>:buildingView==="list"?<div className="buildingtablewrap"><table className="buildingtable"><thead><tr><th>Č. objektu</th><th>Objekt / adresa</th><th>Město</th><th>IČO</th><th>Technik</th><th>Referent</th><th></th></tr></thead><tbody>{visibleBuildings.length===0?<tr><td colSpan="7">Žádné odpovídající objekty</td></tr>:visibleBuildings.map(b=><tr key={b.id} tabIndex={0} role="button" onClick={()=>setSelectedBuilding(b)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setSelectedBuilding(b)}}}><td>{b.object_number||"—"}</td><td><strong>{b.street||b.name}</strong><small>{b.address}</small></td><td>{b.city||"—"}</td><td>{b.company_id||"—"}</td><td>{b.manager||"Nepřiřazen"}</td><td>{b.referent||"Nepřiřazen"}</td><td className="rowarrow">→</td></tr>)}</tbody></table></div>:<div className="buildinggrid">{visibleBuildings.length===0?<article className="emptybuilding"><h3>Žádné odpovídající objekty</h3><p>Uprav hledání nebo přidej nový objekt.</p></article>:visibleBuildings.map(b=><button type="button" className="buildingcard" key={b.id} onClick={()=>setSelectedBuilding(b)}><span className="buildingnumber">OBJEKT {b.object_number||"—"}</span><strong>{b.street||b.name}</strong><span className="buildingaddress">{b.city||b.address}</span><div className="buildingcompany"><span>IČO</span><strong>{b.company_id||"Neuvedeno"}</strong></div><div className="buildingstaff"><div><span>Technik</span><strong>{b.manager||"Nepřiřazen"}</strong></div><div><span>Referent</span><strong>{b.referent||"Nepřiřazen"}</strong></div></div><span className="buildinglink">Otevřít kartu →</span></button>)}</div>}{editing&&role==="admin"&&<div className="overlay"><form className="modal" onSubmit={save}><h2>{editing==="new"?"Nový objekt":"Upravit objekt"}</h2><label>Název objektu<input maxLength="200" required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Adresa<input maxLength="300" required value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label><div className="formgrid">{extraFields.map(([key,label])=><label key={key}>{label}<input type={numericFields.includes(key)?"number":"text"} min={numericFields.includes(key)?0:undefined} value={form[key]??""} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}</div><label>Poznámka<textarea rows="4" maxLength="3000" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>{message&&<div className="error" role="alert">{message}</div>}<div className="actions"><button type="button" className="logout" onClick={()=>setEditing(null)}>Zrušit</button><button className="primary" disabled={saving}>{saving?"Ukládám…":"Uložit objekt"}</button></div></form></div>}</>:page==="Kontroly"?<Inspections buildings={buildings} userEmail={session.user.email} myReferent={myReferent} myTechnician={myTechnician} reportSignature={reportSignature} supabase={supabase}/>:page==="Úkoly"?<Tasks supabase={supabase} buildings={buildings} myReferent={myReferent} myTechnician={myTechnician} userId={session.user.id}/>:<><h1>{page}</h1><div className="notice">Tento modul připravujeme.</div></>}</div></section></div>
}
createRoot(document.getElementById("root")).render(<App/>);
if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("/isys/sw.js",{scope:"/isys/"}).catch(error=>console.warn("PWA service worker:",error)));}

