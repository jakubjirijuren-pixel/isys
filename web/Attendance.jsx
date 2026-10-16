import React,{useEffect,useMemo,useState} from "react";
import "./attendance.css";
import {AttendanceKiosk,AttendanceCardWriter} from "./AttendanceNfc.jsx";
import AttendancePayroll from "./AttendancePayroll.jsx";
const labels={in:"Příchod",break_start:"Začátek přestávky",break_end:"Konec přestávky",out:"Odchod"};
const actions={out:[["in","Zaznamenat příchod"]],in:[["break_start","Začít přestávku"],["out","Zaznamenat odchod"]],break_end:[["break_start","Začít přestávku"],["out","Zaznamenat odchod"]],break_start:[["break_end","Ukončit přestávku"]]};
const fmt=v=>new Date(v).toLocaleString("cs-CZ",{dateStyle:"medium",timeStyle:"short"});
const localDay=v=>new Date(v).toLocaleDateString("sv-SE");
function duration(rows){
 let total=0,start=null;
 for(const row of [...rows].sort((a,b)=>new Date(a.occurred_at)-new Date(b.occurred_at))){
  const t=new Date(row.occurred_at).getTime();
  if(row.event_type==="in"||row.event_type==="break_end")start=t;
  if((row.event_type==="break_start"||row.event_type==="out")&&start!==null){total+=Math.max(0,t-start);start=null}
 }
 if(start!==null)total+=Math.max(0,Date.now()-start);
 return (total/3600000).toLocaleString("cs-CZ",{minimumFractionDigits:2,maximumFractionDigits:2})+" h";
}
export default function Attendance({supabase,userId,isAdmin=false}){
 const [kioskOpen,setKioskOpen]=useState(false);const [events,setEvents]=useState([]),[profiles,setProfiles]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[month,setMonth]=useState(()=>new Date().toISOString().slice(0,7)),[selected,setSelected]=useState("");
 const load=async()=>{
  const from=month+"-01",to=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),1)).toISOString().slice(0,10);
  const all=[];let failure=null;
  for(let offset=0;offset<100000;offset+=1000){
   let q=supabase.from("attendance_events").select("id,user_id,event_type,occurred_at").gte("occurred_at",from+"T00:00:00").lt("occurred_at",to+"T00:00:00").order("occurred_at",{ascending:false}).order("id",{ascending:false}).range(offset,offset+999);
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
  const lines=[["Zaměstnanec","Událost","Datum a čas"],...shown.map(e=>[names[e.user_id]||e.user_id,labels[e.event_type],fmt(e.occurred_at)])];
  const data="\ufeff"+lines.map(line=>line.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(";")).join("\r\n");
  const url=URL.createObjectURL(new Blob([data],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="isys-dochazka-"+month+".csv";a.click();URL.revokeObjectURL(url);
 };
 return <div className="attendance-module"><div className="pageheading"><div><h1>Docházka</h1><p>Evidence příchodů, odchodů a přestávek</p></div></div>
 <div className="attendance-actions"><button className="primary" type="button" onClick={()=>setKioskOpen(true)}>Spustit NFC docházkový terminál</button></div>{kioskOpen&&<AttendanceKiosk supabase={supabase} profiles={profiles} onClose={()=>setKioskOpen(false)} onSaved={()=>{load();loadLatest()}}/>}{isAdmin&&<AttendanceCardWriter supabase={supabase} profiles={profiles}/>}<section className="attendance-card"><h2>Moje docházka</h2><p>Aktuální stav: <strong>{latest===null?"Načítám…":latest==="out"?"Mimo pracoviště":latest==="break_start"?"Přestávka":"V práci"}</strong></p><div className="attendance-actions">{(actions[latest]||[]).map(([type,label])=><button key={type} className="primary" disabled={busy} onClick={()=>mark(type)}>{busy?"Ukládám…":label}</button>)}</div><p>Odpracováno ve vybraném měsíci (orientačně): <strong>{duration(mine)}</strong></p></section>
 {error&&<div className="error" role="alert">{error}</div>}{notice&&<div className="notice" role="status">{notice}</div>}
 {isAdmin&&<AttendancePayroll events={events} profiles={profiles} month={month} selected={selected}/>}
 <section className="attendance-card"><div className="attendance-toolbar"><h2>{isAdmin?"Přehled docházky":"Moje záznamy"}</h2><label>Měsíc <input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label>{isAdmin&&<><label>Zaměstnanec <select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Všichni</option>{profiles.map(p=><option key={p.id} value={p.id}>{names[p.id]}</option>)}</select></label><button className="secondarybutton" onClick={csv}>Export CSV</button></>}<button className="secondarybutton" onClick={()=>{load();loadLatest()}}>Obnovit</button></div>
 <div className="attendance-table-wrap"><table><thead><tr>{isAdmin&&<th>Zaměstnanec</th>}<th>Událost</th><th>Datum a čas</th></tr></thead><tbody>{shown.map(e=><tr key={e.id}>{isAdmin&&<td>{names[e.user_id]||e.user_id}</td>}<td>{labels[e.event_type]}</td><td>{fmt(e.occurred_at)}</td></tr>)}{!shown.length&&<tr><td colSpan={isAdmin?3:2}>Zatím žádné záznamy.</td></tr>}</tbody></table></div></section></div>;
}
