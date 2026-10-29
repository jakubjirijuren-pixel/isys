import {attendanceIntervals,sumIntervals} from "./attendance-calculation.js";
import BuildingActiveKeys from "./BuildingActiveKeys.jsx";
import DomusCommitteeImport from "./DomusCommitteeImport.jsx";
import React,{useEffect,useState,useCallback,useRef} from "react";
import {createRoot} from "react-dom/client";
import {createClient} from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import "./style.css";
import Inspections from "./Inspections.jsx";
import TechnicalInspections from "./TechnicalInspections.jsx";
import Keys from "./Keys.jsx";
import FoxaMobileTerminal from "./FoxaMobileTerminal.jsx";
import TerminalOnly from "./TerminalOnly.jsx";
import FoxaModuleTerminal from "./FoxaModuleTerminal.jsx";
import Attendance from "./Attendance.jsx";
import Fleet from "./Fleet.jsx";
import Vacation from "./Vacation.jsx";
import PrintForms from "./PrintForms.jsx";
import OutgoingMail from "./OutgoingMail.jsx";
import AttendanceHeader from "./AttendanceHeader.jsx";
import NotificationCenter from "./NotificationCenter.jsx";
import NotificationPreferences from "./NotificationPreferences.jsx";
import SignaturePad from "./SignaturePad.jsx";
import AdminUsers from "./AdminUsers.jsx";
import Wiki from "./Wiki.jsx";
import FeedbackAdmin,{FeedbackForm} from "./Feedback.jsx";
import Changelog from "./Changelog.jsx";
import "./controls.css";
import "./foxa-responsive.css";
import "./foxa-modern.css";
import "./foxa-themes.css";
import "./foxa-mobile.css";
import "./foxa-field-workspace.css";
export const supabase=createClient("https://qcbyjxovnf fdruiznlnt.supabase.co".replace(" ",""),"sb_publishable_AFfvrodRnmBTOLjlFadYfQ_Foa4e_P1");
const extraFields=[["object_number","Číslo objektu"],["street","Ulice"],["city","Město"],["manager","Technik"],["referent","Referent"],["economist","Ekonom"],["accountant","Účetní"],["legal_entity","Hlavní účetní subjekt"],["company_id","IČO"],["external_id","Unikátní číslo"],["flats_count","Počet bytů"],["nonresidential_count","Počet nebytů"],["garages_count","Počet garáží"],["shared_spaces_count","Počet spol. prostor"],["invoice_approvers_count","Počet schvalovatelů faktur"],["manager_flag","P. Správce"],["economist_flag","P. Ekon"]];
const BYTOSERVIS_STREDISKA=new Set(["320","327","335","337","355","366","373","397","398","431","442","443","445","446","449","450","452","453","454","528","530","536","538"]);
const emergencyServiceFor=building=>{const number=String(building?.object_number??"").trim();if(number==="333")return {name:"Cigdus",phone:"+420 733 642 111"};if(BYTOSERVIS_STREDISKA.has(number))return {name:"Bytoservis",phone:"+420 241 414 141"};return null;};
const BytoservisBadge=({building,detail=false})=>{const service=emergencyServiceFor(building);return service?<span className={"bytoservis-badge"+(detail?" bytoservis-badge-detail":"")} title={`Sjednaná havarijní služba ${service.name}, tel. ${service.phone}`}><span aria-hidden="true">✚</span> Havarijní služba: {service.name} <span className="bytoservis-phone">{service.phone}</span></span>:null;};
const numericFields=["flats_count","nonresidential_count","garages_count","shared_spaces_count","invoice_approvers_count","manager_flag","economist_flag"];
const empty={name:"",address:"",description:"",...Object.fromEntries(extraFields.map(([k])=>[k,""]))};
const dashboardWidgetCatalog=[["buildings","Spravované objekty","Počet evidovaných objektů"],["flats","Bytové jednotky","Součet bytů ve všech objektech"],["nonresidential","Nebytové prostory","Celkový počet nebytových prostor"],["garages","Garáže","Součet evidovaných garáží"],["cities","Města / lokality","Počet různých lokalit"],["technicians","Technici","Počet přiřazených techniků"],["referents","Referenti","Počet přiřazených referentů"],["unassignedTech","Bez technika","Objekty bez přiřazeného technika"],["unassignedRef","Bez referenta","Objekty bez přiřazeného referenta"],["allManagedBuildings","Všechny spravované objekty","Celkový počet objektů v evidenci FOXA"],["referentBuildings","Objekty referenta","Počet objektů přiřazených referentovi"],["referentFlats","Byty referenta","Počet bytů v objektech referenta"],["referentNonresidential","Nebytové prostory referenta","Nebytové prostory objektů referenta"],["referentGarages","Garáže referenta","Garáže v objektech referenta"],["activeKeyLoans","Vypůjčené klíče","Aktuálně nevrácené výpůjčky"],["returnedKeyLoans","Vrácené klíče","Počet vrácených výpůjček"],["allKeyLoans","Všechny výpůjčky","Celkový počet evidovaných výpůjček"],["myWorkedHours","Moje odpracované hodiny","Odpracovaný čas v aktuálním měsíci"]];
const widgetColors=[["default","Výchozí"],["blue","Modrá"],["green","Zelená"],["orange","Oranžová"],["purple","Fialová"],["red","Červená"],["teal","Tyrkysová"]];
const widgetAccessByRole={
 technician:["buildings","flats","nonresidential","garages","cities","activeKeyLoans","returnedKeyLoans","allKeyLoans","myWorkedHours"],
 referent:["allManagedBuildings","referentBuildings","referentFlats","referentNonresidential","referentGarages","activeKeyLoans","returnedKeyLoans","allKeyLoans","myWorkedHours"]
};
const canSeeWidget=(roles,id)=>roles.includes("admin")||roles.some(role=>widgetAccessByRole[role]?.includes(id));
const defaultDashboardWidgets=["buildings","flats","technicians","unassignedTech"];
const readView=()=>{try{return JSON.parse(sessionStorage.getItem("isys-view")||"{}")}catch{return {}}};
function FilterDropdown({label,value,options,onChange}){
 const [open,setOpen]=useState(false),root=useRef(null);
 useEffect(()=>{if(!open)return;const close=e=>{if(!root.current?.contains(e.target))setOpen(false)};const escape=e=>{if(e.key==="Escape"){setOpen(false);root.current?.querySelector("button")?.focus()}};document.addEventListener("pointerdown",close);document.addEventListener("keydown",escape);return()=>{document.removeEventListener("pointerdown",close);document.removeEventListener("keydown",escape)}},[open]);
 return <div className={"filterdropdown"+(open?" isopen":"")} ref={root}><button type="button" className="filtertrigger" aria-label={label} aria-expanded={open} aria-haspopup="listbox" onClick={()=>setOpen(o=>!o)}><span>{value||"Všichni – "+label.toLowerCase()}</span><span className="filterchevron" aria-hidden="true">⌄</span></button>{open&&<div className="filtermenu" role="listbox" aria-label={label}><button type="button" role="option" aria-selected={!value} className={!value?"chosen":""} onClick={()=>{onChange("");setOpen(false)}}>Všichni – {label.toLowerCase()}</button>{options.map(option=><button type="button" role="option" aria-selected={value===option} className={value===option?"chosen":""} key={option} onClick={()=>{onChange(option);setOpen(false)}}>{option}</button>)}</div>}</div>
}
function ReferentPicker({accounts,value=[],onChange}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState("");
 const root=useRef(null),searchRef=useRef(null);
 useEffect(()=>{if(!open)return;const close=e=>{if(!root.current?.contains(e.target))setOpen(false)};const escape=e=>{if(e.key==="Escape")setOpen(false)};document.addEventListener("pointerdown",close);document.addEventListener("keydown",escape);return()=>{document.removeEventListener("pointerdown",close);document.removeEventListener("keydown",escape)}},[open]);
 useEffect(()=>{if(open)searchRef.current?.focus();else setQuery("")},[open]);
 const selected=accounts.filter(a=>value.includes(a.id));
 const matches=accounts.filter(a=>String(a.display_name||"").toLocaleLowerCase("cs").includes(query.toLocaleLowerCase("cs"))).sort((a,b)=>String(a.display_name||"").localeCompare(String(b.display_name||""),"cs"));
 const toggle=id=>onChange(value.includes(id)?value.filter(v=>v!==id):[...value,id]);
 return <div className={"filterdropdown referentpicker"+(open?" isopen":"")} ref={root}>
  <button type="button" className="filtertrigger" aria-expanded={open} aria-haspopup="listbox" onClick={()=>setOpen(v=>!v)}><span>{selected.length?selected.map(a=>a.display_name).join(", "):"Vyber referenty…"}</span><span className="filterchevron" aria-hidden="true">⌄</span></button>
  {open&&<div className="filtermenu referentpickermenu"><input ref={searchRef} type="search" aria-label="Hledat referenta" placeholder="Začni psát jméno referenta…" value={query} onChange={e=>setQuery(e.target.value)}/><div className="referentpickeroptions" role="group" aria-label="Výběr referentů">{matches.length?matches.map(a=><label key={a.id} className={"referentpickeroption"+(value.includes(a.id)?" chosen":"")}><input type="checkbox" checked={value.includes(a.id)} onChange={()=>toggle(a.id)}/><span>{a.display_name}</span></label>):<p>Žádní odpovídající uživatelé.</p>}</div><button type="button" className="referentpickerdone" onClick={()=>setOpen(false)}>Hotovo ({value.length})</button></div>}
 </div>;
}
function App(){
 const [feedbackOpen,setFeedbackOpen]=useState(false);
 const [changelogOpen,setChangelogOpen]=useState(false);
 const [initialView]=useState(()=>({...readView(),scrollY:(()=>{try{return sessionStorage.getItem("isys-scroll")}catch{return 0}})()}));
 const [theme,setTheme]=useState(()=>{try{return localStorage.getItem("isys-theme")||"light"}catch{return "light"}});
 useEffect(()=>{document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;try{localStorage.setItem("isys-theme",theme)}catch{}},[theme]);
 const accentThemes=[["blue","Modrá"],["green","Zelená"],["purple","Fialová"],["orange","Oranžová"],["red","Červená"],["teal","Tyrkysová"]];
 const [accentTheme,setAccentTheme]=useState(()=>{try{return localStorage.getItem("isys-accent-theme")||"blue"}catch{return "blue"}});
 useEffect(()=>{document.documentElement.dataset.accent=accentThemes.some(([id])=>id===accentTheme)?accentTheme:"blue";try{localStorage.setItem("isys-accent-theme",accentTheme)}catch{}},[accentTheme]);
 const [session,setSession]=useState(null),[passwordRecovery,setPasswordRecovery]=useState(()=>{const p=new URLSearchParams(window.location.hash.slice(1));const q=new URLSearchParams(window.location.search);return p.get("type")==="recovery"||q.get("type")==="recovery"||q.has("token_hash")&&q.get("type")==="recovery"}),[passwordChange,setPasswordChange]=useState(""),[passwordRepeat,setPasswordRepeat]=useState(""),[passwordChangeError,setPasswordChangeError]=useState(""),[passwordChangeBusy,setPasswordChangeBusy]=useState(false),[loading,setLoading]=useState(true),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const [importRows,setImportRows]=useState(null),[importError,setImportError]=useState(""),[importBusy,setImportBusy]=useState(false),[search,setSearch]=useState(initialView.search||"");
 const [selectedBuilding,setSelectedBuilding]=useState(null);
 const [buildingView,setBuildingView]=useState(()=>{try{return localStorage.getItem("isys-building-view")==="list"?"list":"cards"}catch{return "cards"}});
 useEffect(()=>{try{localStorage.setItem("isys-building-view",buildingView)}catch{}},[buildingView]);
 const [dashboardWidgets,setDashboardWidgets]=useState([...defaultDashboardWidgets,"allManagedBuildings","referentBuildings"]);
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
 const uploadSignatureFile=async file=>{
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
 const uploadReportSignature=e=>{const file=e.target.files?.[0];e.target.value="";if(file)uploadSignatureFile(file)};
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
 const widgetPrefsRef=useRef({widget_ids:[],widget_colors:{},widget_scopes:{}});
 const widgetPrefsLoadedRef=useRef(false);
 const saveWidgetPreferences=async patch=>{
  if(!session?.user?.id||!widgetPrefsLoadedRef.current)return;
  const next={...widgetPrefsRef.current,...patch};
  widgetPrefsRef.current=next;
  const {error}=await supabase.from("foxa_widget_preferences").upsert({user_id:session.user.id,...next,updated_at:new Date().toISOString()},{onConflict:"user_id"});
  if(error)console.warn("Widget preferences save failed",error.message);
 };
 const changeWidgetColor=(id,color)=>{const next={...widgetColorsById,[id]:color};setWidgetColorsById(next);saveWidgetPreferences({widget_colors:next});if(session?.user?.id)try{localStorage.setItem("isys-widget-colors-"+session.user.id,JSON.stringify(next))}catch{}};
 const moveWidget=(from,to)=>{if(from===to)return;const next=[...dashboardWidgets];const a=next.indexOf(from),b=next.indexOf(to);if(a<0||b<0)return;next.splice(a,1);next.splice(b,0,from);changeDashboardWidgets(next)};

 useEffect(()=>{if(!session?.user?.id)return;try{setMyTechnician(localStorage.getItem("isys-technician-"+session.user.id)||"");setMyReferent(localStorage.getItem("isys-referent-"+session.user.id)||"");setWidgetScopes(JSON.parse(localStorage.getItem("isys-widget-scopes-"+session.user.id)||"{}"));setWidgetColorsById(JSON.parse(localStorage.getItem("isys-widget-colors-"+session.user.id)||"{}"))}catch{setMyTechnician("");setMyReferent("");setWidgetScopes({});setWidgetColorsById({})}},[session?.user?.id]);
 const changeMyReferent=name=>{setMyReferent(name);if(session?.user?.id)try{localStorage.setItem("isys-referent-"+session.user.id,name)}catch{}};
 const changeMyTechnician=name=>{setMyTechnician(name);if(session?.user?.id)try{localStorage.setItem("isys-technician-"+session.user.id,name)}catch{}};
 const changeWidgetScope=(id,scope)=>{const next={...widgetScopes,[id]:scope};setWidgetScopes(next);saveWidgetPreferences({widget_scopes:next});if(session?.user?.id)try{localStorage.setItem("isys-widget-scopes-"+session.user.id,JSON.stringify(next))}catch{}};

 useEffect(()=>{
  const userId=session?.user?.id;
  widgetPrefsLoadedRef.current=false;
  if(!userId)return;
  let active=true;
  const readLocal=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key+userId)||"null")??fallback}catch{return fallback}};
  const localIds=readLocal("isys-widgets-",defaultDashboardWidgets);
  const localColors=readLocal("isys-widget-colors-",{});
  const localScopes=readLocal("isys-widget-scopes-",{});
  const validIds=ids=>Array.isArray(ids)?[...new Set(ids.filter(id=>dashboardWidgetCatalog.some(w=>w[0]===id)))]:defaultDashboardWidgets;
  const load=async()=>{
   const {data,error}=await supabase.from("foxa_widget_preferences").select("widget_ids,widget_colors,widget_scopes").eq("user_id",userId).maybeSingle();
   if(!active)return;
   if(error)console.warn("Widget preferences load failed",error.message);
   const prefs=data?{widget_ids:validIds(data.widget_ids),widget_colors:data.widget_colors||{},widget_scopes:data.widget_scopes||{}}:{widget_ids:validIds(localIds),widget_colors:localColors,widget_scopes:localScopes};
   widgetPrefsRef.current=prefs;
   setDashboardWidgets(prefs.widget_ids);setWidgetColorsById(prefs.widget_colors);setWidgetScopes(prefs.widget_scopes);
   widgetPrefsLoadedRef.current=!error;
   if(!data&&!error){
    const {error:saveError}=await supabase.from("foxa_widget_preferences").upsert({user_id:userId,...prefs},{onConflict:"user_id"});
    if(saveError)console.warn("Widget preferences initial sync failed",saveError.message);
   }
  };
  load();
  return()=>{active=false;widgetPrefsLoadedRef.current=false};
 },[session?.user?.id]);
 const changeDashboardWidgets=next=>{setDashboardWidgets(next);saveWidgetPreferences({widget_ids:next});if(session?.user?.id)try{localStorage.setItem("isys-widgets-"+session.user.id,JSON.stringify(next))}catch{}};
 const [filters,setFilters]=useState(initialView.filters||{city:"",manager:"",referent:""});
 const [widgetBuildingFilter,setWidgetBuildingFilter]=useState(null);
 const [accountDirectory,setAccountDirectory]=useState([]);
 const [delegation,setDelegation]=useState(null);
 const [delegationTarget,setDelegationTarget]=useState("");
 const [delegationBusy,setDelegationBusy]=useState(false);
 const [delegationNotice,setDelegationNotice]=useState("");
 const [delegationAudit,setDelegationAudit]=useState([]);
 const [delegationAuditOpen,setDelegationAuditOpen]=useState(false);
 const loadDelegationAudit=async()=>{const {data,error}=await supabase.rpc("foxa_delegation_recent_audit");if(error)setDelegationNotice(error.message);else setDelegationAudit(data||[])};
 useEffect(()=>{let active=true;if(!session?.user?.id){setDelegation(null);return;}supabase.rpc("foxa_delegation_current").then(({data,error})=>{if(active&&!error)setDelegation(data?.[0]||null)});return()=>{active=false}},[session?.user?.id]);
 const startDelegation=async()=>{if(!userRoles.includes("admin")||!delegationTarget||delegationBusy)return;setDelegationBusy(true);setDelegationNotice("");const {error}=await supabase.rpc("foxa_delegation_start",{target_user:delegationTarget});if(error)setDelegationNotice("Zastupování nelze zahájit: "+error.message);else{const {data}=await supabase.rpc("foxa_delegation_current");setDelegation(data?.[0]||null);setDelegationNotice("Zastupování je evidováno. Zápisy do modulů zatím zůstávají pod účtem administrátora.")}setDelegationBusy(false)};
 const stopDelegation=async()=>{setDelegationBusy(true);const {error}=await supabase.rpc("foxa_delegation_stop");if(error)setDelegationNotice("Zastupování nelze ukončit: "+error.message);else{setDelegation(null);setDelegationNotice("")}setDelegationBusy(false)};
 const [committeeContacts,setCommitteeContacts]=useState([]);
 const [committeeDraft,setCommitteeDraft]=useState([]);
 useEffect(()=>{let active=true;if(!selectedBuilding?.id){setCommitteeContacts([]);return}supabase.from("foxa_building_committee_contacts").select("id,building_id,full_name,position,phone,email").eq("building_id",selectedBuilding.id).order("created_at").then(({data,error})=>{if(active&&!error)setCommitteeContacts(data||[])});return()=>{active=false}},[selectedBuilding?.id,supabase]);
 const contactBlank=()=>({full_name:"",position:"",phone:"",email:""});
 const [buildingReferents,setBuildingReferents]=useState([]);
 const referentIdsFor=id=>buildingReferents.filter(x=>String(x.building_id)===String(id)).map(x=>x.user_id);
 const referentNamesFor=b=>{const ids=referentIdsFor(b.id);return ids.length?ids.map(id=>accountDirectory.find(a=>a.id===id)?.display_name).filter(Boolean):(b.referent?[b.referent]:[])};
 const accountName=id=>accountDirectory.find(a=>a.id===id)?.display_name||"";
 const currentAccountName=accountName(session?.user?.id)||session?.user?.email?.split("@")[0]||"";
 useEffect(()=>{if(!session?.user?.id)return;let active=true;supabase.rpc("isys_task_assignees").then(({data,error})=>{if(active&&!error)setAccountDirectory(data||[])});return()=>{active=false}},[session?.user?.id]);
 const [roleReady,setRoleReady]=useState(false);
 const [page,setPage]=useState(initialView.page||"Přehled"),[buildings,setBuildings]=useState([]),[listLoading,setListLoading]=useState(false),[listError,setListError]=useState(""),[role,setRole]=useState("technician"),[userRoles,setUserRoles]=useState(["technician"]),[editing,setEditing]=useState(null),[form,setForm]=useState(empty),[saving,setSaving]=useState(false),[message,setMessage]=useState("");
 useEffect(()=>{supabase.auth.getSession().then(({data,error})=>{if(error)setError(error.message);setSession(data?.session??null);setLoading(false)});const {data:{subscription}}=supabase.auth.onAuthStateChange((event,s)=>{if(event==="PASSWORD_RECOVERY")setPasswordRecovery(true);setSession(s)});return()=>subscription.unsubscribe()},[]);
 const load=useCallback(async()=>{if(!session)return;setListLoading(true);setListError("");const [{data,error:err},{data:profile}]=await Promise.all([supabase.from("buildings").select("id,name,address,description,created_at,object_number,street,city,manager,referent,manager_user_id,referent_user_id,economist,accountant,legal_entity,company_id,external_id,flats_count,nonresidential_count,garages_count,shared_spaces_count,invoice_approvers_count,manager_flag,economist_flag").order("name"),supabase.rpc("isys_my_roles").then(async result=>result.error?supabase.from("profiles").select("role").eq("id",session.user.id).maybeSingle().then(({data})=>({data:data?.role?[data.role]:["technician"]})):result)]);if(err)setListError("Nepodařilo se načíst objekty: "+err.message);else {setBuildings(data??[]);supabase.from("building_referents").select("building_id,user_id").then(({data:links,error:linkError})=>{if(!linkError)setBuildingReferents(links||[])});setSelectedBuilding(prev=>(data??[]).find(b=>b.id===(prev?.id||initialView.selectedId))??null)}const activeRoles=Array.isArray(profile)&&profile.length?profile:["technician"];setUserRoles(activeRoles);setRoleReady(true);setRole(activeRoles.includes("admin")?"admin":activeRoles.includes("technician")?"technician":"referent");setListLoading(false)},[session]);
 useEffect(()=>{load()},[load]);
 useEffect(()=>{if(!session)return;try{sessionStorage.setItem("isys-view",JSON.stringify({page,search,filters,selectedId:selectedBuilding?.id||null}))}catch{}},[session,page,search,filters,selectedBuilding]);
 useEffect(()=>{if(!session||listLoading||listError)return;const y=Number(initialView.scrollY)||0;if(!y)return;const id=requestAnimationFrame(()=>window.scrollTo(0,y));return()=>cancelAnimationFrame(id)},[session,listLoading,listError]);
 useEffect(()=>{if(!session)return;let last=0;const remember=()=>{const now=Date.now();if(now-last<150)return;last=now;try{sessionStorage.setItem("isys-scroll",String(window.scrollY))}catch{}};window.addEventListener("scroll",remember,{passive:true});return()=>window.removeEventListener("scroll",remember)},[session]);
 async function finishFirstPasswordChange(e){
  e.preventDefault();setPasswordChangeError("");
  if(passwordChange.length<12){setPasswordChangeError("Nové heslo musí mít alespoň 12 znaků.");return}
  if(passwordChange!==passwordRepeat){setPasswordChangeError("Hesla se neshodují.");return}
  setPasswordChangeBusy(true);
  const {error}=await supabase.auth.updateUser({password:passwordChange,data:{isys_must_change_password:false}});
  if(error){setPasswordChangeError("Změna hesla selhala: "+error.message);setPasswordChangeBusy(false);return}
  setPasswordChange("");setPasswordRepeat("");setPasswordRecovery(false);
  const {data,error:refreshError}=await supabase.auth.refreshSession();
  if(refreshError||data?.user?.user_metadata?.isys_must_change_password){
   setPasswordChangeError("Heslo bylo změněno, ale stav účtu se nepodařilo obnovit. Obnov stránku a přihlas se novým heslem.");
  }else{setSession(data?.session??null)}
  setPasswordChangeBusy(false);
 }
 async function login(e){e.preventDefault();setError("");setBusy(true);const {error}=await supabase.auth.signInWithPassword({email,password});if(error)setError("Přihlášení se nezdařilo. Zkontroluj e-mail, heslo a potvrzení účtu.");setBusy(false)}
 function openForm(item=null){setCommitteeDraft(item?committeeContacts.map(x=>({...x})):[]);setEditing(item?.id??"new");setForm(item?{...empty,...item,referent_user_ids:referentIdsFor(item.id).length?referentIdsFor(item.id):item.referent_user_id?[item.referent_user_id]:[]}: {...empty,referent_user_ids:[]});setMessage("")}
 async function save(e){
  e.preventDefault();
  if(role!=="admin"||saving)return;
  setSaving(true);setMessage("");
  try{
   const payload={name:String(form.name??"").trim(),address:String(form.address??"").trim(),description:String(form.description??"").trim()||null,...Object.fromEntries(extraFields.map(([k])=>[k,numericFields.includes(k)?(form[k]===""||form[k]==null?null:Number(form[k])):(String(form[k]??"").trim()||null)])),manager_user_id:form.manager_user_id||null,referent_user_id:form.referent_user_id||null};
   if(!payload.name||!payload.address){setMessage("Vyplň název a adresu.");return}
   const ids=[...new Set((form.referent_user_ids||[]).filter(Boolean))];
   payload.referent_user_id=ids[0]||null;
   payload.referent=accountName(ids[0])||null;
   const isNew=editing==="new";
   const result=isNew?await supabase.from("buildings").insert(payload).select("id").single():await supabase.from("buildings").update(payload).eq("id",editing).select("id").single();
   if(result.error)throw Error("Uložení objektu selhalo: "+result.error.message);
   const savedId=result.data?.id||editing;
   const previousIds=isNew?[]:referentIdsFor(savedId);
   const toRemove=previousIds.filter(id=>!ids.includes(id));
   const toAdd=ids.filter(id=>!previousIds.includes(id));
   const changes=[];
   if(toRemove.length)changes.push(supabase.from("building_referents").delete().eq("building_id",savedId).in("user_id",toRemove));
   if(toAdd.length)changes.push(supabase.from("building_referents").upsert(toAdd.map(user_id=>({building_id:savedId,user_id})),{onConflict:"building_id,user_id"}));
   if(changes.length){
    const results=await Promise.all(changes);
    const failure=results.find(x=>x.error);
    if(failure)throw Error("Objekt byl uložen, ale přiřazení referentů selhalo: "+failure.error.message);
   }
   setBuildings(prev=>isNew?[...prev,{...payload,id:savedId}]:prev.map(b=>b.id===savedId?{...b,...payload}:b));
   setBuildingReferents(prev=>[...prev.filter(x=>String(x.building_id)!==String(savedId)),...ids.map(user_id=>({building_id:savedId,user_id}))]);
   setSelectedBuilding(prev=>prev?.id===savedId?{...prev,...payload}:prev);
   const existingContacts=isNew?[]:committeeContacts;
   const removed=existingContacts.filter(x=>!committeeDraft.some(d=>d.id===x.id));
   const valid=committeeDraft.filter(x=>String(x.full_name??"").trim());
   const contactResults=await Promise.all([
    ...removed.map(x=>supabase.from("foxa_building_committee_contacts").delete().eq("id",x.id).eq("building_id",savedId)),
    ...valid.map(x=>{const row={building_id:savedId,full_name:String(x.full_name??"").trim(),position:String(x.position??"").trim()||null,phone:String(x.phone??"").trim()||null,email:String(x.email??"").trim()||null};return x.id?supabase.from("foxa_building_committee_contacts").update(row).eq("id",x.id).eq("building_id",savedId):supabase.from("foxa_building_committee_contacts").insert(row)})]);
   const contactFailure=contactResults.find(x=>x.error);
   if(contactFailure)throw Error("Objekt byl uložen, ale kontakty výboru se nepodařilo uložit: "+contactFailure.error.message);
   const {data:updatedContacts}=await supabase.from("foxa_building_committee_contacts").select("id,building_id,full_name,position,phone,email").eq("building_id",savedId).order("created_at");
   if(updatedContacts)setCommitteeContacts(updatedContacts);
   setEditing(null);
   setMessage("Změny objektu byly uloženy.");
  }catch(err){setMessage(err?.message||"Uložení objektu se nezdařilo.")}
  finally{setSaving(false)}
 }

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
 async function exportBuildingsWithReferents(){
  const contactRows=[];
  for(let from=0;;from+=1000){
   const {data,error}=await supabase.from("foxa_building_committee_contacts").select("building_id,full_name,position,phone,email").range(from,from+999);
   if(error){setListError("Nepodařilo se načíst kontakty pro export: "+error.message);return}
   contactRows.push(...(data||[]));
   if(!data||data.length<1000)break;
  }
  const normalizePerson=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("cs").replace(/\b(mgr|ing|bc|mudr|judr|phdr|phd)\b\.?/g," ").replace(/[^a-z ]/g," ").split(/\s+/).filter(Boolean).sort().join(" ");
  const contactFor=(buildingId,name)=>{
   const wanted=normalizePerson(name);
   return contactRows.find(x=>String(x.building_id)===String(buildingId)&&/referent/i.test(x.position||"")&&normalizePerson(x.full_name)===wanted);
  };
  const rows=[
   ["Stavební bytové družstvo Praha 8"],
   ["PŘEHLED REFERENTŮ OBJEKTŮ"],
   ["SVJ","Příjmení, jméno","Mobil","e-mail","ulice"]
  ];
  const sorted=[...buildings].sort((a,b)=>String(a.object_number||"").localeCompare(String(b.object_number||""),"cs",{numeric:true}));
  for(const b of sorted){
   const ids=referentIdsFor(b.id);
   const people=ids.length?ids.map(id=>accountDirectory.find(a=>String(a.id)===String(id))).filter(Boolean):[];
   if(people.length){
    for(const person of people){
     const contact=contactFor(b.id,person.display_name);
     rows.push([b.object_number||"",person.display_name||"",contact?.phone||person.phone||person.phone_number||person.mobile||"",contact?.email||person.email||"",b.street||b.address||""]);
    }
   }else{
    const names=referentNamesFor(b);
    if(names.length){for(const name of names){const contact=contactFor(b.id,name);rows.push([b.object_number||"",name,contact?.phone||"",contact?.email||"",b.street||b.address||""])}}
    // Objekty bez přiřazeného referenta se do přehledu nezařazují.
   }
  }
  const ws=XLSX.utils.aoa_to_sheet(rows);
  ws["!merges"]=[{s:{r:0,c:0},e:{r:0,c:4}},{s:{r:1,c:0},e:{r:1,c:4}}];
  ws["!cols"]=[{wch:11},{wch:33},{wch:19},{wch:35},{wch:43}];
  ws["!rows"]=[{hpt:29},{hpt:27},{hpt:24}];
  ws["!autofilter"]={ref:"A3:E"+rows.length};
  ws["!printHeader"]="&CStavební bytové družstvo Praha 8";
  ws["!pageSetup"]={orientation:"landscape",paperSize:9,fitToWidth:1,fitToHeight:0};
  ws["!margins"]={left:0.3,right:0.3,top:0.45,bottom:0.45,header:0.2,footer:0.2};
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,"Referenti objektů");
  XLSX.writeFile(wb,"FOXA_prehled_referentu_objektu.xlsx");
 }
 function downloadTemplate(){
  const wb=XLSX.utils.book_new();const ws=XLSX.utils.aoa_to_sheet([["Objekt","Ulice","Město","Správce","Ekonom","Účetní","Hlavní účetní subjekt","IČO","Unikátní číslo","Počet bytů","Počet nebytů","Počet garáží","Počet spol. prostor","Počet schvalovatelů faktur","Poznámka","P. Správce","P. Ekon"],["001","Ukázková 123","Praha 8","Jan Novák","","","SVJ Ukázková","12345678","abc123",24,0,4,2,1,"Ukázkový objekt",1,1]]);
  XLSX.utils.book_append_sheet(wb,ws,"Objekty");XLSX.writeFile(wb,"isys_sablona_objekty.xlsx");
 }
 const [mobileMenuOpen,setMobileMenuOpen]=useState(false);
 const mobileNavRef=useRef(null);
 useEffect(()=>{if(!mobileMenuOpen)return;const onKey=e=>{if(e.key==="Escape")setMobileMenuOpen(false)};const onPointer=e=>{if(mobileNavRef.current&&!mobileNavRef.current.contains(e.target))setMobileMenuOpen(false)};document.addEventListener("keydown",onKey);document.addEventListener("pointerdown",onPointer);return()=>{document.removeEventListener("keydown",onKey);document.removeEventListener("pointerdown",onPointer)}},[mobileMenuOpen]);
 useEffect(()=>{if(!("serviceWorker" in navigator))return;const onMessage=e=>{if(e.data?.type!=="isys-push-open")return;const target=e.data.module;if(target==="Úkoly")return;if(["Přehled","Objekty","Kontroly","Technické kontroly","Evidence klíčů","Dovolené","Wiki","Zpětná vazba"].includes(target)){setPage(target);setSelectedBuilding(null)}};navigator.serviceWorker.addEventListener("message",onMessage);return()=>navigator.serviceWorker.removeEventListener("message",onMessage)},[]);
 const [workedHours,setWorkedHours]=useState({loading:false,error:"",hours:"0 h 00 min"});
 useEffect(()=>{
  if(!session?.user?.id||page!=="Přehled"||!dashboardWidgets.includes("myWorkedHours"))return;
  let active=true;
  const now=new Date(),start=new Date(now.getFullYear(),now.getMonth(),1);
  setWorkedHours(v=>({...v,loading:true,error:""}));
  supabase.from("attendance_events").select("id,event_type,occurred_at").eq("user_id",session.user.id).lte("occurred_at",now.toISOString()).order("occurred_at",{ascending:true}).then(({data,error})=>{
   if(!active)return;
   if(error){setWorkedHours({loading:false,error:error.message,hours:""});return}
   const {intervals}=attendanceIntervals(data||[],{until:Date.now(),includeOpen:true});
   const minutes=Math.floor(sumIntervals(intervals,start.getTime(),Date.now()).worked/60000);
   setWorkedHours({loading:false,error:"",hours:Math.round(minutes/60).toLocaleString("cs-CZ")+" h"});
  });
  return()=>{active=false};
 },[session?.user?.id,page,dashboardWidgets.includes("myWorkedHours")]);
 const [keyInitialFilter,setKeyInitialFilter]=useState("active");
 const [keyWidgetRows,setKeyWidgetRows]=useState([]),[keyWidgetLoading,setKeyWidgetLoading]=useState(false),[keyWidgetError,setKeyWidgetError]=useState("");
 useEffect(()=>{if(!session?.user?.id||page!=="Přehled")return;let active=true;setKeyWidgetLoading(true);supabase.from("key_loans").select("id,returned_at").then(({data,error})=>{if(!active)return;setKeyWidgetLoading(false);if(error)setKeyWidgetError(error.message);else{setKeyWidgetError("");setKeyWidgetRows(data||[])}});return()=>{active=false}},[session?.user?.id,page]);
 const [testBanners,setTestBanners]=useState({});
 const [testBannerSaving,setTestBannerSaving]=useState(false);
 const [testBannerError,setTestBannerError]=useState("");
 useEffect(()=>{
  if(!session?.user?.id){setTestBanners({});return}
  let active=true;
  const refresh=async()=>{
   const {data,error}=await supabase.from("foxa_module_test_banners").select("module,enabled");
   if(active&&!error)setTestBanners(Object.fromEntries((data||[]).map(row=>[row.module,row.enabled])));
  };
  refresh();
  const timer=setInterval(refresh,60000);
  return()=>{active=false;clearInterval(timer)};
 },[session?.user?.id]);
 const toggleTestBanner=async module=>{
  if(!userRoles.includes("admin")||testBannerSaving)return;
  setTestBannerSaving(true);setTestBannerError("");
  const enabled=!testBanners[module];
  const {error}=await supabase.from("foxa_module_test_banners").upsert({module,enabled,updated_by:session.user.id,updated_at:new Date().toISOString()},{onConflict:"module"});
  if(error)setTestBannerError("Nastavení testovacího provozu se nepodařilo uložit: "+error.message);
  else setTestBanners(current=>({...current,[module]:enabled}));
  setTestBannerSaving(false);
 };
 // Module maintenance: hooks must stay before every conditional return.
 const [moduleAvailability,setModuleAvailability]=useState({});
 const [moduleAvailabilityReady,setModuleAvailabilityReady]=useState(false);
 useEffect(()=>{
  if(!session?.user?.id){setModuleAvailability({});setModuleAvailabilityReady(false);return;}
  let active=true;
  const refresh=async()=>{
   try{
    const {data,error}=await supabase.from("isys_module_availability").select("module,enabled");
    if(!active)return;
    if(error){console.warn("Module availability unavailable",error.message);setModuleAvailabilityReady(false);return;}
    setModuleAvailability(Object.fromEntries((data||[]).map(item=>[item.module,item.enabled])));
    setModuleAvailabilityReady(true);
   }catch(error){if(active){console.warn("Module availability check failed",error);setModuleAvailabilityReady(false);}}
  };
  refresh();
  const interval=window.setInterval(refresh,15000);
  window.addEventListener("focus",refresh);
  return()=>{active=false;window.clearInterval(interval);window.removeEventListener("focus",refresh);};
 },[session?.user?.id]);
 const canSeeOldInspections=userRoles.includes("admin")||userRoles.includes("referent");
 const canSeeTechnicalInspections=userRoles.includes("admin")||userRoles.includes("technician");
 const allowedInspectionPages=[...(canSeeOldInspections?["Kontroly"]:[]),...(canSeeTechnicalInspections?["Technické kontroly"]:[])];
 useEffect(()=>{if(page==="Kontroly"&&!canSeeOldInspections)setPage(canSeeTechnicalInspections?"Technické kontroly":"Přehled");else if(page==="Technické kontroly"&&!canSeeTechnicalInspections)setPage(canSeeOldInspections?"Kontroly":"Přehled")},[page,canSeeOldInspections,canSeeTechnicalInspections]);
 if(loading)return <main className="center">Načítání FOXA…</main>;
 if(!session&&passwordRecovery)return <main className="center"><div className="login"><div className="mark">FOXA</div><h1>Ověření odkazu</h1><p>Ověřujeme odkaz pro nastavení hesla. Pokud se stránka nezmění, odkaz mohl vypršet nebo už byl použit.</p><button type="button" onClick={()=>{setPasswordRecovery(false);window.history.replaceState(null,"",window.location.pathname);}}>Zpět na přihlášení</button></div></main>;
 if(!session)return <main className="center"><form className="login" onSubmit={login}><div className="mark">FOXA</div><h1>Přihlášení do systému</h1><p>Interní systém správy bytových domů</p><label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label><label>Heslo<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/></label>{error&&<div role="alert" className="error">{error}</div>}<button disabled={busy}>{busy?"Přihlašuji…":"Přihlásit se"}</button><small>Účty zakládá správce systému.</small></form></main>;
 if(passwordRecovery||session.user?.user_metadata?.isys_must_change_password)return <main className="center"><form className="login password-change-form" onSubmit={finishFirstPasswordChange}><div className="mark">FOXA</div><h1>{passwordRecovery?"Obnovení hesla":"První přihlášení"}</h1><p>Nastav si nové heslo, abys mohl pokračovat do FOXA.</p><label>Nové heslo<input type="password" autoComplete="new-password" minLength={12} required value={passwordChange} onChange={e=>setPasswordChange(e.target.value)}/></label><label>Potvrzení nového hesla<input type="password" autoComplete="new-password" minLength={12} required value={passwordRepeat} onChange={e=>setPasswordRepeat(e.target.value)}/></label>{passwordChangeError&&<div className="error" role="alert">{passwordChangeError}</div>}<button disabled={passwordChangeBusy}>{passwordChangeBusy?"Ukládám…":"Změnit heslo a pokračovat"}</button></form></main>;
 const filterOptions=Object.fromEntries(["city","manager","referent"].map(key=>[key,[...new Set(buildings.map(b=>String(b[key]??"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"cs")).concat(key==="manager"||key==="referent"?["Nepřiřazen"]:[])]));
 const visibleBuildings=buildings.filter(b=>[b.name,b.address,b.object_number,b.manager,b.referent].join(" ").toLocaleLowerCase("cs").includes(search.toLocaleLowerCase("cs"))&&Object.entries(filters).every(([key,value])=>!value||(value==="Nepřiřazen"&&(key==="manager"||key==="referent")?(key==="manager"?!String(b.manager||"").trim():!referentIdsFor(b.id).length&&!String(b.referent||"").trim()):(key==="referent"?referentNamesFor(b).includes(value):String(b[key]??"")===value)))&&(!widgetBuildingFilter||widgetBuildingFilter==="myTechnician"&&b.manager_user_id===session?.user?.id||widgetBuildingFilter==="myReferent"&&(referentIdsFor(b.id).includes(session?.user?.id)||(!referentIdsFor(b.id).length&&b.referent_user_id===session?.user?.id))||widgetBuildingFilter==="unassignedTech"&&!String(b.manager||"").trim()||widgetBuildingFilter==="unassignedRef"&&!referentIdsFor(b.id).length&&!String(b.referent||"").trim()||widgetBuildingFilter==="hasFlats"&&Number(b.flats_count)>0||widgetBuildingFilter==="hasNonresidential"&&Number(b.nonresidential_count)>0||widgetBuildingFilter==="hasGarages"&&Number(b.garages_count)>0));
 const filtersActive=Boolean(search.trim()||Object.values(filters).some(Boolean)||widgetBuildingFilter);
 const dashboardStats=rows=>({buildings:rows.length,flats:rows.reduce((sum,b)=>sum+(Number(b.flats_count)||0),0),nonresidential:rows.reduce((sum,b)=>sum+(Number(b.nonresidential_count)||0),0),garages:rows.reduce((sum,b)=>sum+(Number(b.garages_count)||0),0),cities:new Set(rows.map(b=>String(b.city||"").trim()).filter(Boolean)).size,technicians:new Set(rows.map(b=>String(b.manager||"").trim()).filter(Boolean)).size,referents:new Set(rows.map(b=>String(b.referent||"").trim()).filter(Boolean)).size,unassignedTech:rows.filter(b=>!String(b.manager||"").trim()).length,unassignedRef:rows.filter(b=>!String(b.referent||"").trim()).length});
 const keyWidgetValues={activeKeyLoans:keyWidgetRows.filter(r=>!r.returned_at).length,returnedKeyLoans:keyWidgetRows.filter(r=>!!r.returned_at).length,allKeyLoans:keyWidgetRows.length};
 const openKeyWidget=id=>{setKeyInitialFilter(id==="activeKeyLoans"?"active":id==="returnedKeyLoans"?"returned":"all");setPage("Evidence klíčů");window.scrollTo({top:0,behavior:"smooth"})};
 const visibleDashboardWidgets=dashboardWidgets.filter(id=>canSeeWidget(userRoles,id));
 const visibleWidgetCatalog=dashboardWidgetCatalog.filter(([id])=>canSeeWidget(userRoles,id));
 const defaultVisibleWidgets=[...new Set([...defaultDashboardWidgets,...(userRoles.includes("referent")?["allManagedBuildings","referentBuildings"]:[])])].filter(id=>canSeeWidget(userRoles,id));
 const dashboardValues=dashboardStats(buildings);
 const myDashboardValues=dashboardStats(buildings.filter(b=>b.manager_user_id===session?.user?.id));
 const technicianOptions=[...new Set(buildings.map(b=>String(b.manager||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"cs"));
 const referentOptions=[...new Set(buildings.flatMap(b=>referentNamesFor(b)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"cs"));
 const referentRows=buildings.filter(b=>referentIdsFor(b.id).includes(session?.user?.id)||(!referentIdsFor(b.id).length&&b.referent_user_id===session?.user?.id));
 const referentValues={referentBuildings:referentRows.length,referentFlats:referentRows.reduce((sum,b)=>sum+(Number(b.flats_count)||0),0),referentNonresidential:referentRows.reduce((sum,b)=>sum+(Number(b.nonresidential_count)||0),0),referentGarages:referentRows.reduce((sum,b)=>sum+(Number(b.garages_count)||0),0)};
 const openWidgetBuildings=id=>{
  const isReferent=id.startsWith("referent")&&id!=="referents";
  const scope=widgetScopes[id]||"all";
  setSearch("");setSelectedBuilding(null);
  setFilters({city:"",manager:"",referent:""});
  const special={unassignedTech:"unassignedTech",unassignedRef:"unassignedRef",flats:"hasFlats",referentFlats:"hasFlats",nonresidential:"hasNonresidential",referentNonresidential:"hasNonresidential",garages:"hasGarages",referentGarages:"hasGarages"};
  setWidgetBuildingFilter(isReferent?"myReferent":scope==="mine"?"myTechnician":special[id]||null);
  setPage("Objekty");
  window.scrollTo({top:0,behavior:"smooth"});
 };
 if(!roleReady)return <main className="center">Načítání oprávnění…</main>;
 if(userRoles.includes("terminal"))return <TerminalOnly supabase={supabase} onLogout={()=>supabase.auth.signOut()}/>;
 const moduleBlocked=moduleAvailabilityReady&&!userRoles.includes("admin")&&moduleAvailability[page]===false;
 const moduleDisplayName=name=>name==="Evidence klíčů"?"Centrální registr klíčů":name;
 const pages=["Přehled","Objekty","Evidence klíčů","Docházka","Vozidla a kniha jízd","Dovolené","Tiskopisy","Kniha odchozí pošty","Wiki",...(userRoles.includes("admin")?["Správa uživatelů","Zpětná vazba"]:[])];
 const terminalItems=[["Přehled","⌂","Domů"],["Objekty","▤","Objekty"],["Evidence klíčů","⚿","Klíče"],["Docházka","◷","Docházka"]];
 const terminalNavigate=target=>{setPage(target);setEditing(null);setSelectedBuilding(null);setMobileMenuOpen(false);window.scrollTo({top:0,behavior:"instant"})};
 return <div className="layout"><Changelog roles={userRoles} supabase={supabase} userId={session.user.id} open={changelogOpen} onClose={()=>setChangelogOpen(false)}/>{feedbackOpen&&<FeedbackForm supabase={supabase} onClose={()=>setFeedbackOpen(false)}/>}<aside ref={mobileNavRef} className={mobileMenuOpen?"mobile-nav-open":""}><div className="mobile-nav-top"><button type="button" className="mobile-hamburger" aria-label={mobileMenuOpen?"Zavřít navigaci":"Otevřít navigaci"} aria-expanded={mobileMenuOpen} aria-controls="isys-main-navigation" onClick={()=>setMobileMenuOpen(v=>!v)}><span/><span/><span/></button><span className="mobile-nav-title">FOXA</span></div><div className="brand"><img className="brandicon brandlogo" src="/isys/icon.svg" alt="Logo FOXA"/><div className="mark">FOXA<small>SYSTÉM BUDOUCNOSTI</small></div></div><div id="isys-main-navigation" className="side-navigation"><div className="sideTitle">PRACOVNÍ PROSTOR</div>{pages.map(x=><button type="button" className={"nav "+(page===x?"selected":"")} key={x} onClick={()=>{setPage(x);setEditing(null);setSelectedBuilding(null);setMobileMenuOpen(false)}}>{({"Přehled":"▦","Objekty":"▤","Kontroly":"☑","Technické kontroly":"▣","Evidence klíčů":"⚿","Docházka":"◷","Vozidla a kniha jízd":"▣","Dovolené":"▣","Tiskopisy":"▤","Kniha odchozí pošty":"✉","Wiki":"▤","Správa uživatelů":"♙","Zpětná vazba":"✎"}[x]||"•")} &nbsp; {moduleDisplayName(x)}</button>)}<div className="sidefooter">FOXA • Webová aplikace</div></div></aside><nav className="foxa-terminal-dock" aria-label="Rychlá navigace terminálu">{terminalItems.filter(([target])=>pages.includes(target)).map(([target,icon,label])=><button key={target} type="button" className={page===target?"active":""} aria-current={page===target?"page":undefined} onClick={()=>terminalNavigate(target)}><span className="terminal-dock-icon" aria-hidden="true">{icon}</span><span>{label}</span></button>)}<button type="button" className={mobileMenuOpen?"active":""} aria-expanded={mobileMenuOpen} aria-controls="isys-main-navigation" onClick={()=>setMobileMenuOpen(v=>!v)}><span className="terminal-dock-icon" aria-hidden="true">☷</span><span>Moduly</span></button></nav><section className="content"><header><nav className="breadcrumb" aria-label="Drobečková navigace"><button type="button" className="breadcrumblink" onClick={()=>{setPage("Přehled");setSelectedBuilding(null);setEditing(null)}}>Pracovní prostor</button><span aria-hidden="true">/</span>{selectedBuilding&&page==="Objekty"?<><button type="button" className="breadcrumblink" onClick={()=>{setPage("Objekty");setSelectedBuilding(null);setEditing(null)}}>Objekty</button><span aria-hidden="true">/</span><strong aria-current="page">{selectedBuilding.name||selectedBuilding.object_number||"Detail objektu"}</strong></>:<button type="button" className="breadcrumblink breadcrumbcurrent" aria-current="page" onClick={()=>{setPage(page);setSelectedBuilding(null);setEditing(null)}}>{moduleDisplayName(page)}</button>}</nav><div className="userbar"><button type="button" className="header-support" onClick={()=>setFeedbackOpen(true)}>✎ Zpětná vazba</button><NotificationCenter roles={userRoles} supabase={supabase} userId={session.user.id} onOpenChangelog={()=>setChangelogOpen(true)} onNavigate={target=>{if(["Přehled","Objekty","Kontroly","Evidence klíčů","Wiki"].includes(target)){setPage(target);setSelectedBuilding(null)}}}/>{delegation&&<div role="status" style={{background:"#fff3cd",color:"#653c00",padding:"9px 14px",border:"2px solid #b45309",borderRadius:8,margin:"8px"}}><strong>Evidence zastupování:</strong> {accountDirectory.find(a=>a.id===delegation.represented_user_id)?.display_name||delegation.represented_user_id}. Akce v modulech se stále zapisují pod vaším účtem. <button type="button" disabled={delegationBusy} onClick={stopDelegation}>Ukončit</button></div>}<div className="userprofile" ref={userMenuRef}><button type="button" className="avatar avatarbutton" aria-label="Otevřít uživatelské nastavení" aria-expanded={userMenuOpen} onClick={()=>setUserMenuOpen(o=>!o)}>{session.user.email?.slice(0,1).toUpperCase()}</button>{userMenuOpen&&<div className="userdropdown"><div className="userdropdownheading"><strong>Uživatelské nastavení</strong><button type="button" className="userdropdownclose" aria-label="Zavřít uživatelské nastavení" title="Zavřít" onClick={()=>setUserMenuOpen(false)}>×</button></div><small className="useremail">{session.user.email}</small>{userRoles.includes("admin")&&<div className="foxa-delegation-control" style={{padding:"12px",border:"2px solid #b45309",borderRadius:10,margin:"10px 0"}}><strong>Zastupování zaměstnance</strong><p style={{fontSize:12}}>Bezpečná evidence zastupování. Dokud nejsou jednotlivé moduly napojeny na audit, veškeré zápisy se provádějí pod skutečným účtem administrátora.</p>{delegation?<><p role="status">Aktivní evidence: {accountDirectory.find(a=>a.id===delegation.represented_user_id)?.display_name||delegation.represented_user_id}</p><button type="button" disabled={delegationBusy} onClick={stopDelegation}>Ukončit zastupování</button></>:<><select aria-label="Vyber zaměstnance k zastupování" value={delegationTarget} onChange={e=>setDelegationTarget(e.target.value)}><option value="">Vyber zaměstnance</option>{accountDirectory.filter(a=>a.id!==session.user.id).map(a=><option key={a.id} value={a.id}>{a.display_name||a.email||a.id}</option>)}</select><button type="button" disabled={delegationBusy||!delegationTarget} onClick={startDelegation}>Zahájit evidenci zastupování</button></>}<button type="button" onClick={()=>{setDelegationAuditOpen(!delegationAuditOpen);loadDelegationAudit()}}>Historie zastupování</button>{delegationAuditOpen&&<div style={{maxHeight:220,overflowY:"auto"}}>{delegationAudit.map((a,i)=><div key={i}><strong>{a.action}</strong> {a.record_table||"Relace"} {a.record_id||""} · {new Date(a.recorded_at).toLocaleString("cs-CZ")} · {accountName(a.administrator_id)||"Administrátor"} / {accountName(a.represented_user_id)||"Zaměstnanec"}</div>)}</div>}{delegationNotice&&<small role="status">{delegationNotice}</small>}</div>}<div className="userrole" role="status"><strong>Role v systému:</strong> {userRoles.map(r=>({admin:"Administrátor",technician:"Technik",referent:"Referent"})[r]||r).join(", ")}</div><div className="profiletheme"><strong>Vzhled aplikace</strong><div className="profilethemebuttons"><button type="button" className={theme==="light"?"active":""} onClick={()=>setTheme("light")}>☀ Světlý</button><button type="button" className={theme==="dark"?"active":""} onClick={()=>setTheme("dark")}>☾ Tmavý</button></div><div className="profileaccent"><strong>Barevný motiv systému</strong><div className="profileaccentgrid">{accentThemes.map(([id,label])=><button type="button" key={id} className={"accentchoice accent-"+id+(accentTheme===id?" selected":"")} aria-label={"Motiv "+label} aria-pressed={accentTheme===id} title={label} onClick={()=>setAccentTheme(id)}><span className="accentdot"/><span>{label}</span>{accentTheme===id&&<span aria-hidden="true">✓</span>}</button>)}</div></div></div><div className="profilesignature"><strong>Podpis do reportů</strong><small>Automaticky se vloží do výkazů kontrol. Nastavení se ukládá k tvému účtu a synchronizuje mezi zařízeními.</small><label htmlFor="report-signature-name">Jméno a funkce pod podpisem</label><input id="report-signature-name" value={reportSignature.name} maxLength={120} placeholder="Např. Jan Novák, technik" onChange={e=>setReportSignature(prev=>({...prev,name:e.target.value}))} onBlur={()=>saveReportSignature(reportSignature)}/><label htmlFor="report-signature-image">Obrázek vlastnoručního podpisu (PNG, JPG, WebP)</label><input id="report-signature-image" type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadReportSignature}/><SignaturePad onSave={uploadSignatureFile} disabled={signatureBusy}/>{reportSignature.image&&<div className="signaturepreview"><img src={reportSignature.image} alt="Náhled podpisu"/><button type="button" onClick={removeReportSignature} disabled={signatureBusy}>Odstranit obrázek</button></div>}<small>{signatureBusy?"Ukládám do účtu…":""}</small>{signatureNotice&&<small role="status">{signatureNotice}</small>}</div><NotificationPreferences supabase={supabase} userId={session.user.id}/><div className="profilepassword"><button type="button" className="passwordtoggle" aria-expanded={passwordFormOpen} onClick={()=>{setPasswordFormOpen(o=>!o);clearPasswordForm()}}>Změnit heslo <span aria-hidden="true">{passwordFormOpen?"⌃":"⌄"}</span></button>{passwordFormOpen&&<form className="passwordform" onSubmit={changePassword}><label htmlFor="current-password">Současné heslo</label><input id="current-password" type="password" autoComplete="current-password" required value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/><label htmlFor="new-password">Nové heslo</label><input id="new-password" type="password" autoComplete="new-password" required minLength={8} value={newPassword} onChange={e=>setNewPassword(e.target.value)}/><label htmlFor="confirm-password">Potvrzení nového hesla</label><input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/><small>Minimálně 8 znaků. Heslo musí být odlišné od současného.</small><button type="submit" className="primary" disabled={passwordSaving}>{passwordSaving?"Ukládám…":"Uložit nové heslo"}</button></form>}{passwordNotice&&<p className="passwordnotice" role="status">{passwordNotice}</p>}</div></div>}</div><button className="logout" onClick={()=>{try{sessionStorage.removeItem("isys-view");sessionStorage.removeItem("isys-scroll")}catch{}supabase.auth.signOut()}}>Odhlásit se</button></div></header><div className={"body foxa-terminal-module foxa-terminal-page-"+String(page).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-")}><FoxaModuleTerminal page={page} availablePages={pages.filter(p=>userRoles.includes("admin")||moduleAvailability[p]!==false)} onNavigate={terminalNavigate}/>{page!=="Přehled"&&<div className="foxa-test-banner-wrap">{testBanners[page]&&<div className="foxa-test-banner" role="status"><strong>⚠ MODUL V TESTOVACÍM PROVOZU</strong><span>Tento modul je aktuálně v testovacím provozu. Některé funkce mohou být upravovány nebo nemusí fungovat správně.</span></div>}{userRoles.includes("admin")&&<button type="button" className="foxa-test-banner-toggle" disabled={testBannerSaving} onClick={()=>toggleTestBanner(page)}>{testBanners[page]?"Vypnout upozornění na testovací provoz":"Zapnout upozornění na testovací provoz"}</button>}{testBannerError&&<p role="alert">{testBannerError}</p>}</div>}{moduleBlocked?<div className="notice" role="status"><h1>Modul je dočasně nedostupný</h1><p>Modul {page} je momentálně v režimu údržby. Zkus to prosím později.</p></div>:page==="Přehled"?<><FoxaMobileTerminal pages={pages.filter(p=>userRoles.includes("admin")||moduleAvailability[p]!==false)} userLabel={currentAccountName} onNavigate={terminalNavigate} onOpenChangelog={()=>setChangelogOpen(true)} onOpenInspections={()=>terminalNavigate(canSeeTechnicalInspections?"Technické kontroly":canSeeOldInspections?"Kontroly":"Objekty")}/><div className="foxa-dashboard-desktop"><div className="hero foxa-dashboard-hero"><div><div className="eyebrow">PŘEHLED SPRÁVY</div><h1>Vítej v FOXA</h1><p>Vše důležité o spravovaných objektech na jednom místě.</p></div><button type="button" className="foxa-hero-changelog-button" onClick={()=>setChangelogOpen(true)}>◈ Novinky a aktualizace</button></div>{(userRoles.includes("admin")||moduleAvailability["Docházka"]!==false)&&<div className="foxa-dashboard-attendance"><AttendanceHeader supabase={supabase} userId={session.user.id} onOpen={()=>{setPage("Docházka");setSelectedBuilding(null);setMobileMenuOpen(false)}}/></div>}<div className="dashboardwidgetheading"><div><h2>Moje widgety</h2><p>Přizpůsob si údaje na hlavním přehledu. Dlaždice můžeš přetáhnout a změnit jejich pořadí.</p></div><button type="button" className="secondarybutton" onClick={()=>setWidgetPickerOpen(o=>!o)} aria-expanded={widgetPickerOpen}>{widgetPickerOpen?"Zavřít výběr":"+ Přidat widget"}</button></div>{widgetPickerOpen&&<div className="widgetpicker widgetpickeranimated"><div className="widgetpickerhead"><strong>Vyber widgety</strong><button type="button" className="secondarybutton" onClick={()=>changeDashboardWidgets([...dashboardWidgets.filter(id=>!canSeeWidget(userRoles,id)),...defaultVisibleWidgets])}>Obnovit výchozí</button></div><div className="widgetchoices">{visibleWidgetCatalog.map(([id,title,description])=><label key={id}><input type="checkbox" checked={dashboardWidgets.includes(id)} onChange={e=>changeDashboardWidgets(e.target.checked?[...dashboardWidgets,id]:dashboardWidgets.filter(w=>w!==id))}/><span><strong>{title}</strong><small>{description}</small></span></label>)}</div></div>}<div className="tiles dashboardtiles">{visibleDashboardWidgets.length===0?<div className="emptywidgets">Zatím nemáš přidaný žádný widget. Klikni na „Přidat widget“.</div>:visibleDashboardWidgets.map(id=>{const item=dashboardWidgetCatalog.find(w=>w[0]===id);if(!item)return null;const isReferentWidget=id.startsWith("referent")&&id!=="referents";const isHoursWidget=id==="myWorkedHours";const isKeyWidget=["activeKeyLoans","returnedKeyLoans","allKeyLoans"].includes(id);return <article key={id} className={"widgetcard clickabletile "+"widgetcolor-"+(widgetColorsById[id]||"default")+(draggedWidget===id?" widgetdragging":"")} draggable={true} onDragStart={e=>{setDraggedWidget(id);e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",id)}} onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect="move"}} onDrop={e=>{e.preventDefault();const from=e.dataTransfer.getData("text/plain")||draggedWidget;moveWidget(from,id);setDraggedWidget(null)}} onDragEnd={()=>setDraggedWidget(null)} role="button" tabIndex={0} onClick={e=>{if(e.target.closest("button,select,input,.widgetscope"))return;(isHoursWidget?setPage("Docházka"):isKeyWidget?openKeyWidget(id):openWidgetBuildings(id))}} onKeyDown={e=>{if((e.key==="Enter"||e.key===" ")&&e.target===e.currentTarget){e.preventDefault();(isHoursWidget?setPage("Docházka"):isKeyWidget?openKeyWidget(id):isTaskWidget?openTaskWidget(id):openWidgetBuildings(id))}}}><div className="widgettitle"><h3 style={isHoursWidget?{overflowWrap:"normal",wordBreak:"keep-all",hyphens:"none"}:undefined}>{isHoursWidget?<>Moje <span style={{whiteSpace:"nowrap"}}>odpracované</span> hodiny</>:item[1]}</h3><div className="widgetbuttons"><button type="button" className="widgetconfig" aria-label={"Nastavení widgetu "+item[1]} title="Nastavit rozsah widgetu" onClick={e=>{e.stopPropagation();setWidgetSettingsOpen(widgetSettingsOpen===id?null:id)}}>⚙</button><button type="button" className="widgetremove" aria-label={"Odebrat widget "+item[1]} title="Odebrat widget" onClick={e=>{e.stopPropagation();changeDashboardWidgets(dashboardWidgets.filter(w=>w!==id))}}>×</button></div></div>{widgetSettingsOpen===id&&<div className="widgetscope" onClick={e=>e.stopPropagation()}>{!isKeyWidget&&!isHoursWidget&&<><label htmlFor={"scope-"+id}>Zobrazovat údaje</label><FilterDropdown label="Rozsah objektů" value={(widgetScopes[id]||"all")==="mine"?"Moje objekty":"Všechny objekty"} options={["Všechny objekty","Moje objekty"]} onChange={value=>changeWidgetScope(id,value==="Moje objekty"?"mine":"all")}/></>}<div className="widgetcoloroptions"><strong>Barva dlaždice</strong><div className="widgetswatches">{widgetColors.map(([color,label])=><button type="button" key={color} className={"widgetswatch swatch-"+color+((widgetColorsById[id]||"default")===color?" selected":"")} title={label} aria-label={"Barva "+label} aria-pressed={(widgetColorsById[id]||"default")===color} onClick={()=>changeWidgetColor(id,color)} />)}</div></div><div className="widgetreorder"><strong>Pořadí v mřížce</strong><div><button type="button" disabled={dashboardWidgets.indexOf(id)===0} onClick={()=>moveWidget(id,dashboardWidgets[dashboardWidgets.indexOf(id)-1])}>← Posunout vlevo</button><button type="button" disabled={dashboardWidgets.indexOf(id)===dashboardWidgets.length-1} onClick={()=>moveWidget(id,dashboardWidgets[dashboardWidgets.indexOf(id)+1])}>Posunout vpravo →</button></div></div></div>}<p className="widgetvalue">{isHoursWidget?(workedHours.loading?"…":workedHours.error?"Nedostupné":workedHours.hours):isKeyWidget?(keyWidgetLoading?"…":keyWidgetError?"Nedostupné":keyWidgetValues[id].toLocaleString("cs-CZ")):listLoading?"…":listError?"Nedostupné":id==="allManagedBuildings"?dashboardValues.buildings.toLocaleString("cs-CZ"):isReferentWidget?referentValues[id].toLocaleString("cs-CZ"):(widgetScopes[id]==="mine"?myDashboardValues[id]:dashboardValues[id]).toLocaleString("cs-CZ")}</p><small>{isHoursWidget?"Docházka · ":isKeyWidget?"Centrální registr klíčů · ":id==="allManagedBuildings"?"Všechny objekty · ":isReferentWidget?"Můj účet · ":widgetScopes[id]==="mine"?"Moje objekty · ":"Všechny objekty · "}{item[2]}</small></article>})}</div></div></>:page==="Objekty"?<><div className="pageheading"><div><h1>Evidence objektů</h1><p>Seznam spravovaných domů</p><p className="building-update-note">Údaje o objektech se aktualizují jednou týdně, vždy v pondělí.</p></div><div className="building-heading-actions"><button type="button" className="secondarybutton" disabled={listLoading||!buildings.length} onClick={exportBuildingsWithReferents}>↓ Export objektů a referentů</button>{(canSeeOldInspections||canSeeTechnicalInspections)&&<button type="button" className="secondarybutton" onClick={()=>{setPage(canSeeTechnicalInspections?"Technické kontroly":"Kontroly");setSelectedBuilding(null);setEditing(null);window.scrollTo({top:0,behavior:"smooth"})}}>☑ Kontroly objektů</button>}{role==="admin"&&<div className="toolbar"><button className="secondarybutton" onClick={downloadTemplate}>↓ Šablona Excel</button><label className="secondarybutton filebutton">↑ Import CSV / Excel<input type="file" accept=".csv,.xlsx,.xls,text/csv" onChange={readExcel}/></label><DomusCommitteeImport supabase={supabase} buildings={buildings} onImported={()=>{if(selectedBuilding?.id)supabase.from("foxa_building_committee_contacts").select("id,building_id,full_name,position,phone,email").eq("building_id",selectedBuilding.id).order("created_at").then(({data})=>{if(data)setCommitteeContacts(data)})}}/><button className="primary" onClick={()=>openForm()}>+ Přidat objekt</button></div>}</div></div>{message&&<div className="notice" role="status">{message}</div>}{importError&&<div className="error" role="alert">{importError}</div>}{importRows&&role==="admin"&&<div className="importpanel"><h3>Aktualizace z {importRows.fileName}</h3><p><strong>Nalezeno: {importRows.planned.length}</strong> objektů k úpravě. Přeskočeno: {importRows.skipped.length}. Nové objekty se nikdy nevytvářejí.</p><p>První nalezené objekty: {importRows.planned.slice(0,5).map(r=>r.name).join("; ")||"Žádné"}</p>{importRows.skipped.length>0&&<details><summary>Zobrazit přeskočené řádky</summary><div className="importskipped">{importRows.skipped.map(r=><p key={r.row}>Řádek {r.row}: {r.reason}</p>)}</div></details>}<p>Prázdné buňky v CSV/Excelu nepřepisují stávající hodnoty. Identifikátory slouží pouze k nalezení objektu.</p><div className="actions"><button className="secondarybutton" onClick={()=>setImportRows(null)}>Zrušit</button><button className="primary" disabled={importBusy||!importRows.planned.length} onClick={importExcel}>{importBusy?"Aktualizuji…":"Potvrdit aktualizaci"}</button></div></div>}{listError&&<div className="error" role="alert">{listError}</div>}{!selectedBuilding&&<div className="filterpanel"><div className="filterheading"><strong>Filtrovat objekty</strong><span>{visibleBuildings.length} z {buildings.length} objektů</span></div>{widgetBuildingFilter&&<div className="widgetfilterhint">Filtr z widgetu: {({unassignedTech:"Bez technika",unassignedRef:"Bez referenta",hasFlats:"Objekty s byty",hasNonresidential:"Objekty s nebytovými prostory",hasGarages:"Objekty s garážemi"})[widgetBuildingFilter]} <button type="button" onClick={()=>setWidgetBuildingFilter(null)}>× Odebrat</button></div>}<div className="filtercontrols"><input className="searchbox" aria-label="Hledat objekty" placeholder="⌕ Hledat číslo, objekt nebo adresu…" value={search} onChange={e=>setSearch(e.target.value)}/>{[["city","Město"],["manager","Technik"],["referent","Referent"]].map(([key,label])=><FilterDropdown key={key} label={label} value={filters[key]} options={filterOptions[key]} onChange={value=>setFilters(prev=>({...prev,[key]:value}))}/>)}<button type="button" className="secondarybutton" disabled={!filtersActive} onClick={()=>{setSearch("");setFilters({city:"",manager:"",referent:""});setWidgetBuildingFilter(null)}}>Vymazat filtry</button></div></div>}{!selectedBuilding&&<div className="viewtoolbar"><span>Zobrazení objektů</span><div className="viewswitch" role="group" aria-label="Zobrazení objektů"><button type="button" className={buildingView==="cards"?"active":""} aria-pressed={buildingView==="cards"} onClick={()=>setBuildingView("cards")}>▦ Karty</button><button type="button" className={buildingView==="list"?"active":""} aria-pressed={buildingView==="list"} onClick={()=>setBuildingView("list")}>☷ Seznam</button></div></div>}{listLoading?<p>Načítání objektů…</p>:selectedBuilding?<section className="buildingdetail">
 <div className="detailtop"><button className="secondarybutton" onClick={()=>setSelectedBuilding(null)}>← Zpět na objekty</button>{role==="admin"&&<button className="primary" onClick={()=>openForm(selectedBuilding)}>Upravit objekt</button>}</div>
 <div className="detailhero"><BytoservisBadge building={selectedBuilding} detail/><span className="detailtag">KARTA OBJEKTU {selectedBuilding.object_number||""}</span><h2>{selectedBuilding.name}</h2><p>{selectedBuilding.address}</p></div>
 <div className="detailsection"><h3>Základní informace</h3><div className="detailgrid">{[["name","Název"],["address","Adresa"],["object_number","Číslo objektu"],["street","Ulice"],["city","Město"]].map(([key,label])=><div className="detailfield" key={key}><span>{label}</span><strong>{key==="referent"?(referentNamesFor(selectedBuilding).join(", ")||"—"):(selectedBuilding[key]??"—")}</strong></div>)}</div></div>
 <div className="detailsection"><h3>Správa a kontaktní osoby</h3><div className="detailgrid">{extraFields.filter(([k])=>["manager","referent","economist","accountant","legal_entity","company_id","external_id"].includes(k)).map(([key,label])=><div className="detailfield" key={key}><span>{label}</span><strong>{key==="referent"?(referentNamesFor(selectedBuilding).join(", ")||"—"):(selectedBuilding[key]??"—")}</strong></div>)}</div></div>
 <div className="detailsection"><h3>Počty a další údaje</h3><div className="detailgrid">{extraFields.filter(([k])=>["flats_count","nonresidential_count","garages_count","shared_spaces_count","invoice_approvers_count","manager_flag","economist_flag"].includes(k)).map(([key,label])=><div className="detailfield" key={key}><span>{label}</span><strong>{selectedBuilding[key]??"—"}</strong></div>)}</div></div>
 <div className="detailsection"><h3>Kontakty na výbor</h3>{committeeContacts.length?<div className="detailgrid">{committeeContacts.map(contact=><div className="detailfield" key={contact.id}><strong>{contact.full_name}</strong><span>{contact.position||"Člen výboru"}</span>{contact.phone&&<a href={"tel:"+String(contact.phone).replace(/[^+0-9]/g,"")}>{contact.phone}</a>}{contact.email&&<a href={"mailto:"+contact.email}>{contact.email}</a>}</div>)}</div>:<p>Kontakty zatím nejsou vyplněny.</p>}</div>
 <BuildingActiveKeys supabase={supabase} buildingId={selectedBuilding.id}/>
 <div className="detailsection"><h3>Poznámka</h3><p className="detailnote">{selectedBuilding.description||"Bez poznámky"}</p></div>
 </section>:<><div className="foxa-object-terminal-list" aria-label="Rychlý seznam objektů">{visibleBuildings.length===0?<p className="foxa-object-empty">Žádné objekty neodpovídají hledání.</p>:visibleBuildings.map(b=><button type="button" className="foxa-object-row" key={b.id} onClick={()=>setSelectedBuilding(b)}><span className="foxa-object-row-number">{b.object_number||"—"}</span><span className="foxa-object-row-info"><strong>{b.street||b.name}</strong><small>{[b.city,b.address!==b.street?b.address:null].filter(Boolean).join(" · ")}</small><small>Technik: {b.manager||"Nepřiřazen"}</small><small>Referenti: {referentNamesFor(b).join(", ")||"Nepřiřazeni"}</small><BytoservisBadge building={b}/></span><span className="foxa-object-row-arrow" aria-hidden="true">›</span></button>)}</div><div className="foxa-object-standard-list">{buildingView==="list"?<div className="buildingtablewrap"><table className="buildingtable"><thead><tr><th>Č. objektu</th><th>Objekt / adresa</th><th>Město</th><th>IČO</th><th>Technik</th><th>Referent</th><th></th></tr></thead><tbody>{visibleBuildings.length===0?<tr><td colSpan="7">Žádné odpovídající objekty</td></tr>:visibleBuildings.map(b=><tr key={b.id} tabIndex={0} role="button" onClick={()=>setSelectedBuilding(b)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setSelectedBuilding(b)}}}><td>{b.object_number||"—"}</td><td><strong>{b.street||b.name}</strong><small>{b.address}</small><BytoservisBadge building={b}/></td><td>{b.city||"—"}</td><td>{b.company_id||"—"}</td><td>{b.manager||"Nepřiřazen"}</td><td>{referentNamesFor(b).join(", ")||"Nepřiřazen"}</td><td className="rowarrow">→</td></tr>)}</tbody></table></div>:<div className="buildinggrid">{visibleBuildings.length===0?<article className="emptybuilding"><h3>Žádné odpovídající objekty</h3><p>Uprav hledání nebo přidej nový objekt.</p></article>:visibleBuildings.map(b=><button type="button" className="buildingcard" key={b.id} onClick={()=>setSelectedBuilding(b)}><span className="buildingnumber">OBJEKT {b.object_number||"—"}</span><strong>{b.street||b.name}</strong><span className="buildingaddress">{b.city||b.address}</span><BytoservisBadge building={b}/><div className="buildingcompany"><span>IČO</span><strong>{b.company_id||"Neuvedeno"}</strong></div><div className="buildingstaff"><div><span>Technik</span><strong>{b.manager||"Nepřiřazen"}</strong></div><div><span>Referent</span><strong>{referentNamesFor(b).join(", ")||"Nepřiřazen"}</strong></div></div><span className="buildinglink">Otevřít kartu →</span></button>)}</div>}</div></>}{editing&&role==="admin"&&<div className="overlay"><form className="modal" onSubmit={save}><h2>{editing==="new"?"Nový objekt":"Upravit objekt"}</h2><div className="detailsection"><h3>Kontakty na výbor</h3>{committeeDraft.map((contact,i)=><div key={contact.id||i} className="formgrid"><label>Jméno<input maxLength={150} value={contact.full_name} onChange={e=>setCommitteeDraft(prev=>prev.map((x,j)=>j===i?{...x,full_name:e.target.value}:x))}/></label><label>Funkce<input maxLength={100} placeholder="Předseda, místopředseda, člen…" value={contact.position||""} onChange={e=>setCommitteeDraft(prev=>prev.map((x,j)=>j===i?{...x,position:e.target.value}:x))}/></label><label>Telefon<input type="tel" maxLength={40} value={contact.phone||""} onChange={e=>setCommitteeDraft(prev=>prev.map((x,j)=>j===i?{...x,phone:e.target.value}:x))}/></label><label>E-mail<input type="email" maxLength={254} value={contact.email||""} onChange={e=>setCommitteeDraft(prev=>prev.map((x,j)=>j===i?{...x,email:e.target.value}:x))}/></label><button type="button" className="secondarybutton" onClick={()=>setCommitteeDraft(prev=>prev.filter((_,j)=>j!==i))}>Odebrat kontakt</button></div>)}<button type="button" className="secondarybutton" onClick={()=>setCommitteeDraft(prev=>[...prev,contactBlank()])}>+ Přidat kontakt výboru</button></div><label>Název objektu<input maxLength="200" required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Adresa<input maxLength="300" required value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label><div className="formgrid">{extraFields.map(([key,label])=><label key={key}>{label}{key==="referent"?<ReferentPicker accounts={accountDirectory} value={form.referent_user_ids||[]} onChange={ids=>setForm(prev=>({...prev,referent_user_ids:ids}))}/>:key==="manager"?<select value={form[key+"_user_id"]||""} onChange={e=>{const id=e.target.value;setForm({...form,[key+"_user_id"]:id||null,[key]:accountName(id)||""})}}><option value="">Nepřiřazeno{form[key]&&!form[key+"_user_id"]?" (původně: "+form[key]+")":""}</option>{accountDirectory.map(a=><option key={a.id} value={a.id}>{a.display_name}</option>)}</select>:<input type={numericFields.includes(key)?"number":"text"} min={numericFields.includes(key)?0:undefined} value={form[key]??""} onChange={e=>setForm({...form,[key]:e.target.value})}/>}</label>)}</div><label>Poznámka<textarea rows="4" maxLength="3000" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>{message&&<div className="error" role="alert">{message}</div>}<div className="actions"><button type="button" className="logout" onClick={()=>setEditing(null)}>Zrušit</button><button className="primary" disabled={saving}>{saving?"Ukládám…":"Uložit objekt"}</button></div></form></div>}</>:page==="Evidence klíčů"?<Keys delegation={delegation} terminalMode={true} supabase={supabase} buildings={buildings} userId={session.user.id} isAdmin={userRoles.includes("admin")} initialFilter={keyInitialFilter} currentAccountName={currentAccountName} reportSignature={reportSignature} accountDirectory={accountDirectory}/>:page==="Docházka"?<Attendance terminalMode={true} supabase={supabase} userId={session.user.id} isAdmin={userRoles.includes("admin")}/>:page==="Vozidla a kniha jízd"?<Fleet supabase={supabase} userId={session.user.id} isAdmin={userRoles.includes("admin")}/>:page==="Dovolené"?<Vacation supabase={supabase} userId={session.user.id} isAdmin={userRoles.includes("admin")}/>:page==="Tiskopisy"?<PrintForms buildings={buildings} currentAccountName={currentAccountName} reportSignature={reportSignature} userEmail={session.user.email||""} userPhone={session.user.phone||session.user.user_metadata?.phone||session.user.user_metadata?.phone_number||""} supabase={supabase} userId={session.user.id}/>:page==="Kniha odchozí pošty"?<OutgoingMail supabase={supabase} buildings={buildings} userId={session.user.id} isAdmin={userRoles.includes("admin")}/>:page==="Technické kontroly"&&canSeeTechnicalInspections?<TechnicalInspections showInspectionSwitch={canSeeOldInspections&&canSeeTechnicalInspections} inspectionKind={page==="Kontroly"?"referent":"technical"} onInspectionKindChange={kind=>{setPage(kind==="referent"?"Kontroly":"Technické kontroly");setSelectedBuilding(null)}} buildings={buildings} userEmail={session.user.email} currentAccountName={currentAccountName} reportSignature={reportSignature} supabase={supabase}/>:page==="Kontroly"&&canSeeOldInspections?<Inspections showInspectionSwitch={canSeeOldInspections&&canSeeTechnicalInspections} inspectionKind={page==="Kontroly"?"referent":"technical"} onInspectionKindChange={kind=>{setPage(kind==="referent"?"Kontroly":"Technické kontroly");setSelectedBuilding(null)}} buildings={buildings} userEmail={session.user.email} currentUserId={session.user.id} currentAccountName={currentAccountName} buildingReferents={buildingReferents} reportSignature={reportSignature} supabase={supabase}/>:page==="Zpětná vazba"&&userRoles.includes("admin")?<FeedbackAdmin supabase={supabase} accountDirectory={accountDirectory}/>:page==="Správa uživatelů"&&userRoles.includes("admin")?<AdminUsers supabase={supabase} currentUserId={session.user.id}/>:page==="Wiki"?<Wiki roles={userRoles}/>:<><h1>{page}</h1><div className="notice">Tento modul připravujeme.</div></>}</div></section></div>
}
createRoot(document.getElementById("root")).render(<App/>);
if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("/isys/sw.js",{scope:"/isys/"}).catch(error=>console.warn("PWA service worker:",error)));}

