import React,{useEffect,useMemo,useState} from "react";
import "./attendance.css";
import {attendanceIntervals,sumIntervals} from "./attendance-calculation.js";
import {AttendanceKiosk,AttendanceCardWriter} from "./AttendanceNfc.jsx";
import AttendancePayroll from "./AttendancePayroll.jsx";
import AttendanceAdminEntry from "./AttendanceAdminEntry.jsx";
const labels={in:"Příchod",break_start:"Začátek přestávky",break_end:"Konec přestávky",out:"Odchod",trip_start:"Služební cesta – začátek",trip_end:"Služební cesta – konec",doctor_start:"Lékař – začátek",doctor_end:"Lékař – konec",homeoffice_start:"Home office – začátek",homeoffice_end:"Home office – konec"};
const actions={out:[["in","Zaznamenat příchod"],["trip_start","Služební cesta"],["doctor_start","Lékař"],["homeoffice_start","Home office"]],trip_end:[["in","Zaznamenat příchod"],["trip_start","Služební cesta"],["doctor_start","Lékař"],["homeoffice_start","Home office"]],doctor_end:[["in","Zaznamenat příchod"],["trip_start","Služební cesta"],["doctor_start","Lékař"],["homeoffice_start","Home office"]],homeoffice_end:[["in","Zaznamenat příchod"],["trip_start","Služební cesta"],["doctor_start","Lékař"],["homeoffice_start","Home office"]],trip_start:[["trip_end","Ukončit služební cestu"]],doctor_start:[["doctor_end","Ukončit návštěvu lékaře"]],homeoffice_start:[["homeoffice_end","Ukončit home office"]],in:[["break_start","Začít přestávku"],["out","Zaznamenat odchod"]],break_end:[["break_start","Začít přestávku"],["out","Zaznamenat odchod"]],break_start:[["break_end","Ukončit přestávku"]]};
const sourceLabels={web:"Web / aplikace FOXA",nfc:"NFC terminál",admin:"Administrátor",unknown:"Neznámý zdroj"};
const fmt=v=>new Date(v).toLocaleString("cs-CZ",{dateStyle:"medium",timeStyle:"short"});
const localDay=v=>new Date(v).toLocaleDateString("sv-SE");
function duration(rows){
 const {intervals}=attendanceIntervals(rows,{includeOpen:true});
 const total=sumIntervals(intervals).worked;
 return (total/3600000).toLocaleString("cs-CZ",{minimumFractionDigits:2,maximumFractionDigits:2})+" h";
}
export default function Attendance({supabase,userId,isAdmin=false,terminalMode=false}){
 const [pinEmployee,setPinEmployee]=useState(""),[employeePin,setEmployeePin]=useState(""),[pinBusy,setPinBusy]=useState(false),[pinNotice,setPinNotice]=useState("");
 const [deletionLog,setDeletionLog]=useState([]),[deletingId,setDeletingId]=useState(null),[deleteReason,setDeleteReason]=useState(""),[deletionBusy,setDeletionBusy]=useState(false),[showDeletionLog,setShowDeletionLog]=useState(false);
 const [leaveDays,setLeaveDays]=useState([]),[sickDays,setSickDays]=useState([]);const [kioskOpen,setKioskOpen]=useState(false);const [events,setEvents]=useState([]),[profiles,setProfiles]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[month,setMonth]=useState(()=>new Date().toISOString().slice(0,7)),[selected,setSelected]=useState("");
 const load=async()=>{
  const from=month+"-01",to=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),1)).toISOString().slice(0,10);
  const all=[];let failure=null;
  for(let offset=0;offset<100000;offset+=1000){
   let q=supabase.from("attendance_events").select("id,user_id,event_type,occurred_at,source,recorded_by,entry_note,gps_latitude,gps_longitude,gps_accuracy_m,gps_captured_at").gte("occurred_at",from+"T00:00:00").lt("occurred_at",to+"T00:00:00").order("occurred_at",{ascending:false}).order("id",{ascending:false}).range(offset,offset+999);
   if(!isAdmin)q=q.eq("user_id",userId);
   const {data,error:e}=await q;
   if(e){failure=e;break}
   all.push(...(data||[]));
   if((data||[]).length<1000)break;
  }
  if(failure)setError("Docházku se nepodařilo načíst: "+failure.message);
  else{setEvents(all);setError("")}
 };
 useEffect(()=>{load()},[month,isAdmin,userId]);
 useEffect(()=>{let active=true;const [year,mon]=month.split("-").map(Number);
 const start=month+"-01",end=new Date(Date.UTC(year,mon,0)).toISOString().slice(0,10);
 let query=supabase.from("isys_vacation_attendance").select("user_id,day").gte("day",start).lte("day",end);
 if(!isAdmin)query=query.eq("user_id",userId);
 Promise.all([query,supabase.from("isys_sick_attendance").select("user_id,day").gte("day",start).lte("day",end)]).then(([leave,sick])=>{if(active){setLeaveDays(leave.error?[]:(leave.data||[]));setSickDays(sick.error?[]:(sick.data||[]));if(leave.error||sick.error)setError("Nepřítomnosti nelze načíst: "+(leave.error||sick.error).message)}});
 return()=>{active=false}},[supabase,month,isAdmin,userId]);
 useEffect(()=>{if(!isAdmin)return;let active=true;supabase.rpc("isys_list_users").then(({data,error})=>{if(!active)return;if(!error&&data){setProfiles(data);return}supabase.from("profiles").select("*").then(({data:backup})=>{if(active)setProfiles(backup||[])})});return()=>{active=false}},[isAdmin,supabase]);
 const [latest,setLatest]=useState(null);
 const loadLatest=async()=>{const {data}=await supabase.from("attendance_events").select("event_type").eq("user_id",userId).order("occurred_at",{ascending:false}).limit(1);setLatest(data?.[0]?.event_type||"out")};
 useEffect(()=>{loadLatest()},[userId]);
 useEffect(()=>{const refresh=()=>{load();loadLatest()};window.addEventListener("isys-attendance-updated",refresh);return()=>window.removeEventListener("isys-attendance-updated",refresh)},[month,userId,isAdmin]);
 const getGps=()=>new Promise((resolve,reject)=>{
  if(!window.isSecureContext){reject(new Error("GPS vyžaduje zabezpečené připojení HTTPS."));return}
  if(!navigator.geolocation){reject(new Error("Toto zařízení nepodporuje zjištění polohy."));return}
  navigator.geolocation.getCurrentPosition(
   pos=>resolve({p_latitude:pos.coords.latitude,p_longitude:pos.coords.longitude,p_accuracy_m:pos.coords.accuracy,p_captured_at:new Date(pos.timestamp).toISOString()}),
   err=>reject(new Error(err.code===1?"Přístup k poloze byl zamítnut. Povolte FOXA přístup k poloze v nastavení prohlížeče.":err.code===3?"Nepodařilo se včas zjistit polohu. Zkuste to znovu.":"Polohu se nepodařilo zjistit. Zkontrolujte zapnuté polohové služby.")),
   {enableHighAccuracy:true,maximumAge:0,timeout:15000}
  );
 });
 const mark=async type=>{
  setBusy(true);setError("");setNotice("");
  try{
   const gps=(type==="in"||type==="out")?await getGps():{};
   const {error:e}=await supabase.rpc("isys_attendance_mark_geo",{p_type:type,...gps});
   if(e)throw e;
   setNotice("Zaznamenáno: "+labels[type]+((type==="in"||type==="out")?" (včetně polohy)":""));
   window.dispatchEvent(new Event("isys-attendance-updated"));await Promise.all([load(),loadLatest()]);
  }catch(e){setError(e.message||"Docházku se nepodařilo zaznamenat.")}
  finally{setBusy(false)}
 };
 const loadDeletionLog=async()=>{
  if(!isAdmin)return;
  const {data,error:e}=await supabase.from("attendance_deletion_log").select("id,event_id,employee_id,event_type,occurred_at,original_source,deleted_by,deleted_at,reason").order("deleted_at",{ascending:false}).limit(200);
  if(e)setError("Historii odstranění nelze načíst: "+e.message);
  else setDeletionLog(data||[]);
 };
 useEffect(()=>{if(isAdmin)loadDeletionLog()},[isAdmin]);
 const deleteAttendance=async()=>{
  if(!deletingId||deletionBusy)return;
  if(deleteReason.trim().length<5){setError("Uveďte důvod odstranění alespoň 5 znaků.");return}
  setDeletionBusy(true);setError("");setNotice("");
  const {error:e}=await supabase.rpc("foxa_admin_delete_attendance",{p_event_id:deletingId,p_reason:deleteReason.trim()});
  if(e)setError("Odstranění se nezdařilo: "+e.message);
  else{setNotice("Docházkový záznam byl odstraněn a uložen do administrátorského logu.");setDeletingId(null);setDeleteReason("");await Promise.all([load(),loadLatest(),loadDeletionLog()]);window.dispatchEvent(new Event("isys-attendance-updated"))}
  setDeletionBusy(false);
 };
 const saveEmployeePin=async(remove=false)=>{
  if(!pinEmployee||pinBusy)return;
  if(!remove&&!/^\\d{4}$/.test(employeePin)){setError("PIN musí obsahovat přesně 4 číslice.");return}
  setPinBusy(true);setError("");setPinNotice("");
  const {error:e}=await supabase.rpc("foxa_admin_set_attendance_pin",{p_user_id:pinEmployee,p_pin:remove?"":employeePin});
  if(e)setError("PIN se nepodařilo uložit: "+e.message);
  else{setPinNotice(remove?"PIN zaměstnance byl zrušen.":"PIN zaměstnance byl nastaven.");setEmployeePin("")}
  setPinBusy(false);
 };
 const mine=events.filter(e=>e.user_id===userId);
 const shown=events.filter(e=>!isAdmin||!selected||e.user_id===selected);
 const names=Object.fromEntries(profiles.map(p=>[p.id,p.display_name||p.full_name||p.name||p.email||"Neznámý zaměstnanec"]));
 const csv=()=>{
  const lines=[["Zaměstnanec","Událost","Datum a čas","Zdroj záznamu","Zapsal","Poznámka","GPS souřadnice","Přesnost GPS (m)"],...shown.map(e=>[names[e.user_id]||e.user_id,labels[e.event_type],fmt(e.occurred_at),sourceLabels[e.source]||sourceLabels.unknown,names[e.recorded_by]||"",e.entry_note||"",e.gps_latitude!=null&&e.gps_longitude!=null?e.gps_latitude+", "+e.gps_longitude:"",e.gps_accuracy_m??""])];
  const data="\ufeff"+lines.map(line=>line.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(";")).join("\r\n");
  const url=URL.createObjectURL(new Blob([data],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="isys-dochazka-"+month+".csv";a.click();URL.revokeObjectURL(url);
 };
 return <div className={"attendance-module"+(terminalMode?" attendance-terminal-mode":"")} >{!terminalMode&&<div className="pageheading"><div><h1>Docházka</h1><p>Evidence příchodů, odchodů a přestávek</p></div></div>}
 {isAdmin&&<div className="attendance-actions"><button className="primary" type="button" onClick={()=>setKioskOpen(true)}>Spustit NFC docházkový terminál</button></div>}{isAdmin&&kioskOpen&&<AttendanceKiosk supabase={supabase} profiles={profiles} onClose={()=>setKioskOpen(false)} onSaved={()=>{load();loadLatest()}}/>}{isAdmin&&<AttendanceCardWriter supabase={supabase} profiles={profiles}/>}{isAdmin&&<section className="attendance-card attendance-pin-admin"><h2>Osobní PIN zaměstnance</h2><p>Nastavte zaměstnanci čtyřmístný PIN pro přihlášení do docházkového terminálu bez NFC čipu. PIN se neukládá v čitelné podobě. Každý zaměstnanec musí mít vlastní PIN.</p><div className="attendance-pin-admin-fields"><label>Zaměstnanec<select value={pinEmployee} onChange={e=>{setPinEmployee(e.target.value);setEmployeePin("");setPinNotice("")}}><option value="">Vyberte zaměstnance</option>{profiles.map(p=><option key={p.id} value={p.id}>{p.display_name||p.full_name||p.email||p.id}</option>)}</select></label><label>Nový čtyřmístný PIN<input type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="new-password" value={employeePin} onChange={e=>setEmployeePin(e.target.value.replace(/\\D/g,"").slice(0,4))} placeholder="••••"/></label></div><div className="attendance-actions"><button type="button" className="primary" disabled={!pinEmployee||employeePin.length!==4||pinBusy} onClick={()=>saveEmployeePin(false)}>Uložit PIN</button><button type="button" className="secondarybutton" disabled={!pinEmployee||pinBusy} onClick={()=>{if(window.confirm("Opravdu zrušit PIN vybraného zaměstnance?"))saveEmployeePin(true)}}>Zrušit PIN zaměstnance</button></div>{pinNotice&&<p role="status">{pinNotice}</p>}</section>}<section className="attendance-card attendance-self-card"><h2>Moje docházka</h2><p className="attendance-current-status">Aktuální stav: <strong>{latest===null?"Načítám…":latest==="out"?"Mimo pracoviště":latest==="break_start"?"Přestávka":"V práci"}</strong></p><div className="attendance-actions attendance-mark-actions">{(actions[latest]||[]).map(([type,label])=><button key={type} className="primary" disabled={busy} onClick={()=>mark(type)}>{busy?"Ukládám…":label}</button>)}</div><p className="attendance-gps-info">Při příchodu a odchodu přes web se jednorázově načte aktuální poloha zařízení a uloží k docházkovému záznamu. Polohu vidí zaměstnanec u vlastních záznamů a administrátor. Nejde o průběžné sledování. Bez povolení polohy nelze příchod ani odchod přes web uložit.</p><p className="attendance-worked">Odpracováno ve vybraném měsíci (orientačně): <strong>{duration(mine)}</strong></p></section>
 {error&&<div className="error" role="alert">{error}</div>}{notice&&<div className="notice" role="status">{notice}</div>}
 {isAdmin&&<AttendanceAdminEntry supabase={supabase} profiles={profiles} onSaved={()=>{load();loadLatest();window.dispatchEvent(new Event("isys-attendance-updated"))}}/>}
 {isAdmin&&<AttendancePayroll events={events} leaveDays={leaveDays} sickDays={sickDays} profiles={profiles} month={month} selected={selected}/>}
 <section className="attendance-card attendance-records-card"><div className="attendance-toolbar"><h2>{isAdmin?"Přehled docházky":"Moje záznamy"}</h2><label>Měsíc <input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label>{isAdmin&&<><label>Zaměstnanec <select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Všichni</option>{profiles.map(p=><option key={p.id} value={p.id}>{names[p.id]}</option>)}</select></label><button className="secondarybutton" onClick={csv}>Export CSV</button></>}<button className="secondarybutton" onClick={()=>{load();loadLatest()}}>Obnovit</button></div>
 <div className="attendance-table-wrap"><table className="attendance-records-table"><thead><tr>{isAdmin&&<th>Zaměstnanec</th>}<th>Událost</th><th>Datum a čas</th><th>Zdroj záznamu</th><th>Zapsal</th><th>GPS / místo</th>{isAdmin&&<th>Správa</th>}</tr></thead><tbody>{shown.map(e=><tr key={e.id}>{isAdmin&&<td data-label="Zaměstnanec">{names[e.user_id]||e.user_id}</td>}<td data-label="Událost">{labels[e.event_type]}</td><td data-label="Datum a čas">{fmt(e.occurred_at)}</td><td data-label="Zdroj záznamu">{sourceLabels[e.source]||sourceLabels.unknown}</td><td data-label="Zapsal">{e.source==="admin"?(names[e.recorded_by]||"Administrátor"):"—"}</td><td data-label="GPS / místo">{e.gps_latitude!=null&&e.gps_longitude!=null?<div className="attendance-gps-cell"><a href={"https://www.openstreetmap.org/?mlat="+e.gps_latitude+"&mlon="+e.gps_longitude+"#map=18/"+e.gps_latitude+"/"+e.gps_longitude} target="_blank" rel="noopener noreferrer">Zobrazit polohu na mapě</a><small>Přesnost ±{Math.round(e.gps_accuracy_m||0)} m</small></div>:<span title={e.source==="nfc"?"NFC terminál – poloha zaměstnance se nesnímá":e.source==="admin"?"Záznam zadaný administrátorem":"Poloha není k dispozici"}>—</span>}</td>{isAdmin&&<td data-label="Správa"><button type="button" className="attendance-delete-button" disabled={deletionBusy} onClick={()=>{setDeletingId(e.id);setDeleteReason("");setError("")}}>Odstranit</button></td>}</tr>)}{!shown.length&&<tr className="attendance-empty-row"><td colSpan={isAdmin?7:5}>Zatím žádné záznamy.</td></tr>}</tbody></table></div></section>
 {isAdmin&&<section className="attendance-card attendance-audit-card"><div className="attendance-toolbar"><div><h2>Historie odstraněných záznamů</h2><p>Administrátorský auditní log. Obsahuje původní údaje, čas odstranění, důvod a odpovědného administrátora.</p></div><button type="button" className="secondarybutton" onClick={()=>{setShowDeletionLog(!showDeletionLog);if(!showDeletionLog)loadDeletionLog()}}>{showDeletionLog?"Skrýt historii":"Zobrazit historii"}</button></div>{showDeletionLog&&<div className="attendance-table-wrap"><table className="attendance-records-table"><thead><tr><th>Zaměstnanec</th><th>Původní událost</th><th>Původní datum</th><th>Odstranil</th><th>Odstraněno</th><th>Důvod</th></tr></thead><tbody>{deletionLog.map(e=><tr key={e.id}><td>{names[e.employee_id]||e.employee_id}</td><td>{labels[e.event_type]||e.event_type}</td><td>{fmt(e.occurred_at)}</td><td>{names[e.deleted_by]||e.deleted_by}</td><td>{fmt(e.deleted_at)}</td><td>{e.reason}</td></tr>)}{!deletionLog.length&&<tr><td colSpan={6}>Zatím žádné odstraněné záznamy.</td></tr>}</tbody></table></div>}</section>}
 {isAdmin&&deletingId&&<div className="attendance-delete-overlay" role="presentation"><div className="attendance-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="attendance-delete-title"><h2 id="attendance-delete-title">Odstranit docházkový záznam?</h2><p>Odstranění ovlivní výpočet odpracované doby. Původní údaje budou zachovány v administrátorském auditním logu.</p><label>Důvod odstranění<textarea rows={3} maxLength={1000} value={deleteReason} onChange={e=>setDeleteReason(e.target.value)} placeholder="Např. chybně zadaný příchod" /></label><div className="attendance-delete-actions"><button type="button" className="secondarybutton" disabled={deletionBusy} onClick={()=>{setDeletingId(null);setDeleteReason("")}}>Zrušit</button><button type="button" className="attendance-delete-confirm" disabled={deletionBusy||deleteReason.trim().length<5} onClick={deleteAttendance}>{deletionBusy?"Odstraňuji…":"Potvrdit odstranění"}</button></div></div></div>}</div>;
}
