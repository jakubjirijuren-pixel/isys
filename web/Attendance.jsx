import React,{useEffect,useMemo,useState} from "react";
import "./attendance.css";
import {attendanceIntervals,sumIntervals} from "./attendance-calculation.js";
import {AttendanceKiosk,AttendanceCardWriter} from "./AttendanceNfc.jsx";
import AttendancePayroll from "./AttendancePayroll.jsx";
import AttendanceAdminEntry from "./AttendanceAdminEntry.jsx";
const labels={in:"Příchod",break_start:"Začátek přestávky",break_end:"Konec přestávky",out:"Odchod",trip_start:"Služební cesta – začátek",trip_end:"Služební cesta – konec",doctor_start:"Lékař – začátek",doctor_end:"Lékař – konec",homeoffice_start:"Home office – začátek",homeoffice_end:"Home office – konec"};
const actions={out:[["in","Zaznamenat příchod"],["trip_start","Služební cesta"],["doctor_start","Lékař"],["homeoffice_start","Home office"]],trip_end:[["in","Zaznamenat příchod"],["trip_start","Služební cesta"],["doctor_start","Lékař"],["homeoffice_start","Home office"]],doctor_end:[["in","Zaznamenat příchod"],["trip_start","Služební cesta"],["doctor_start","Lékař"],["homeoffice_start","Home office"]],homeoffice_end:[["in","Zaznamenat příchod"],["trip_start","Služební cesta"],["doctor_start","Lékař"],["homeoffice_start","Home office"]],trip_start:[["trip_end","Ukončit služební cestu"]],doctor_start:[["doctor_end","Ukončit návštěvu lékaře"]],homeoffice_start:[["homeoffice_end","Ukončit home office"]],in:[["break_start","Začít přestávku"],["out","Zaznamenat odchod"]],break_end:[["break_start","Začít přestávku"],["out","Zaznamenat odchod"]],break_start:[["break_end","Ukončit přestávku"]]};
const sourceLabels={web:"Web / aplikace iSYS",nfc:"NFC terminál",admin:"Administrátor",unknown:"Neznámý zdroj"};
const fmt=v=>new Date(v).toLocaleString("cs-CZ",{dateStyle:"medium",timeStyle:"short"});
const localDay=v=>new Date(v).toLocaleDateString("sv-SE");
function duration(rows){
 const {intervals}=attendanceIntervals(rows,{includeOpen:true});
 const total=sumIntervals(intervals).worked;
 return (total/3600000).toLocaleString("cs-CZ",{minimumFractionDigits:2,maximumFractionDigits:2})+" h";
}
export default function Attendance({supabase,userId,isAdmin=false}){
 const [leaveDays,setLeaveDays]=useState([]);const [kioskOpen,setKioskOpen]=useState(false);const [events,setEvents]=useState([]),[profiles,setProfiles]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[month,setMonth]=useState(()=>new Date().toISOString().slice(0,7)),[selected,setSelected]=useState("");
 const load=async()=>{
  const from=month+"-01",to=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),1)).toISOString().slice(0,10);
  const all=[];let failure=null;
  for(let offset=0;offset<100000;offset+=1000){
   let q=supabase.from("attendance_events").select("id,user_id,event_type,occurred_at,source,recorded_by,entry_note").gte("occurred_at",from+"T00:00:00").lt("occurred_at",to+"T00:00:00").order("occurred_at",{ascending:false}).order("id",{ascending:false}).range(offset,offset+999);
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
 query.then(({data,error:e})=>{if(active){setLeaveDays(e?[]:(data||[]));if(e)setError("Dovolenou v docházce nelze načíst: "+e.message)}});
 return()=>{active=false}},[supabase,month,isAdmin,userId]);
 useEffect(()=>{if(!isAdmin)return;let active=true;supabase.rpc("isys_list_users").then(({data,error})=>{if(!active)return;if(!error&&data){setProfiles(data);return}supabase.from("profiles").select("*").then(({data:backup})=>{if(active)setProfiles(backup||[])})});return()=>{active=false}},[isAdmin,supabase]);
 const [latest,setLatest]=useState(null);
 const loadLatest=async()=>{const {data}=await supabase.from("attendance_events").select("event_type").eq("user_id",userId).order("occurred_at",{ascending:false}).limit(1);setLatest(data?.[0]?.event_type||"out")};
 useEffect(()=>{loadLatest()},[userId]);
 useEffect(()=>{const refresh=()=>{load();loadLatest()};window.addEventListener("isys-attendance-updated",refresh);return()=>window.removeEventListener("isys-attendance-updated",refresh)},[month,userId,isAdmin]);
 const mark=async type=>{setBusy(true);setError("");setNotice("");const {error:e}=await supabase.rpc("isys_attendance_mark",{p_type:type});if(e)setError(e.message);else{setNotice("Zaznamenáno: "+labels[type]);window.dispatchEvent(new Event("isys-attendance-updated"));await Promise.all([load(),loadLatest()])}setBusy(false)};
 const mine=events.filter(e=>e.user_id===userId);
 const shown=events.filter(e=>!isAdmin||!selected||e.user_id===selected);
 const names=Object.fromEntries(profiles.map(p=>[p.id,p.display_name||p.full_name||p.name||p.email||"Neznámý zaměstnanec"]));
 const csv=()=>{
  const lines=[["Zaměstnanec","Událost","Datum a čas","Zdroj záznamu","Zapsal","Poznámka"],...shown.map(e=>[names[e.user_id]||e.user_id,labels[e.event_type],fmt(e.occurred_at),sourceLabels[e.source]||sourceLabels.unknown,names[e.recorded_by]||"",e.entry_note||""])];
  const data="\ufeff"+lines.map(line=>line.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(";")).join("\r\n");
  const url=URL.createObjectURL(new Blob([data],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="isys-dochazka-"+month+".csv";a.click();URL.revokeObjectURL(url);
 };
 return <div className="attendance-module"><div className="pageheading"><div><h1>Docházka</h1><p>Evidence příchodů, odchodů a přestávek</p></div></div>
 <div className="attendance-actions"><button className="primary" type="button" onClick={()=>setKioskOpen(true)}>Spustit NFC docházkový terminál</button></div>{kioskOpen&&<AttendanceKiosk supabase={supabase} profiles={profiles} onClose={()=>setKioskOpen(false)} onSaved={()=>{load();loadLatest()}}/>}{isAdmin&&<AttendanceCardWriter supabase={supabase} profiles={profiles}/>}<section className="attendance-card"><h2>Moje docházka</h2><p>Aktuální stav: <strong>{latest===null?"Načítám…":latest==="out"?"Mimo pracoviště":latest==="break_start"?"Přestávka":"V práci"}</strong></p><div className="attendance-actions">{(actions[latest]||[]).map(([type,label])=><button key={type} className="primary" disabled={busy} onClick={()=>mark(type)}>{busy?"Ukládám…":label}</button>)}</div><p>Odpracováno ve vybraném měsíci (orientačně): <strong>{duration(mine)}</strong></p></section>
 {error&&<div className="error" role="alert">{error}</div>}{notice&&<div className="notice" role="status">{notice}</div>}
 {isAdmin&&<AttendanceAdminEntry supabase={supabase} profiles={profiles} onSaved={()=>{load();loadLatest();window.dispatchEvent(new Event("isys-attendance-updated"))}}/>}
 {isAdmin&&<AttendancePayroll events={events} leaveDays={leaveDays} profiles={profiles} month={month} selected={selected}/>}
 <section className="attendance-card"><div className="attendance-toolbar"><h2>{isAdmin?"Přehled docházky":"Moje záznamy"}</h2><label>Měsíc <input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label>{isAdmin&&<><label>Zaměstnanec <select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Všichni</option>{profiles.map(p=><option key={p.id} value={p.id}>{names[p.id]}</option>)}</select></label><button className="secondarybutton" onClick={csv}>Export CSV</button></>}<button className="secondarybutton" onClick={()=>{load();loadLatest()}}>Obnovit</button></div>
 <div className="attendance-table-wrap"><table><thead><tr>{isAdmin&&<th>Zaměstnanec</th>}<th>Událost</th><th>Datum a čas</th><th>Zdroj záznamu</th><th>Zapsal</th></tr></thead><tbody>{shown.map(e=><tr key={e.id}>{isAdmin&&<td>{names[e.user_id]||e.user_id}</td>}<td>{labels[e.event_type]}</td><td>{fmt(e.occurred_at)}</td><td>{sourceLabels[e.source]||sourceLabels.unknown}</td><td>{e.source==="admin"?(names[e.recorded_by]||"Administrátor"):"—"}</td></tr>)}{!shown.length&&<tr><td colSpan={isAdmin?5:4}>Zatím žádné záznamy.</td></tr>}</tbody></table></div></section></div>;
}
