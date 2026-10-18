import React,{useCallback,useEffect,useMemo,useState} from "react";
import "./attendance-header.css";
import {attendanceIntervals,sumIntervals} from "./attendance-calculation.js";
const choices={out:[["in","Příchod"],["trip_start","Služební cesta"],["doctor_start","Lékař"],["homeoffice_start","Home office"]],trip_end:[["in","Příchod"],["trip_start","Služební cesta"],["doctor_start","Lékař"],["homeoffice_start","Home office"]],doctor_end:[["in","Příchod"],["trip_start","Služební cesta"],["doctor_start","Lékař"],["homeoffice_start","Home office"]],homeoffice_end:[["in","Příchod"],["trip_start","Služební cesta"],["doctor_start","Lékař"],["homeoffice_start","Home office"]],trip_start:[["trip_end","Konec cesty"]],doctor_start:[["doctor_end","Konec lékaře"]],homeoffice_start:[["homeoffice_end","Konec home office"]],in:[["break_start","Přestávka"],["out","Odchod"]],break_start:[["break_end","Konec přestávky"]],break_end:[["break_start","Přestávka"],["out","Odchod"]]};
const labels={trip_start:"Služební cesta",trip_end:"Mimo práci",doctor_start:"U lékaře",doctor_end:"Mimo práci",homeoffice_start:"Home office",homeoffice_end:"Mimo práci",in:"V práci",break_start:"Na přestávce",break_end:"V práci",out:"Mimo práci"};
const localDate=date=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
const minutes=ms=>{const total=Math.max(0,Math.floor(ms/60000));return Math.floor(total/60)+" h "+String(total%60).padStart(2,"0")+" min"};
function worked(events,now){
 return sumIntervals(attendanceIntervals(events,{until:now,includeOpen:true}).intervals).worked;
}
export default function AttendanceHeader({supabase,userId,onOpen}){
 const [events,setEvents]=useState([]),[latest,setLatest]=useState("out"),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[now,setNow]=useState(Date.now());
 const load=useCallback(async()=>{
  const midnight=new Date();midnight.setHours(0,0,0,0);
  const [day,mostRecent]=await Promise.all([
   supabase.from("attendance_events").select("event_type,occurred_at").eq("user_id",userId).gte("occurred_at",midnight.toISOString()).order("occurred_at",{ascending:true}),
   supabase.from("attendance_events").select("event_type").eq("user_id",userId).order("occurred_at",{ascending:false}).limit(1)
  ]);
  if(day.error||mostRecent.error){setError("Docházka není dostupná.");setReady(false);return}
  setEvents(day.data||[]);setLatest(mostRecent.data?.[0]?.event_type||"out");setReady(true);setError("");
 },[supabase,userId]);
 useEffect(()=>{load();const refresh=()=>load();window.addEventListener("focus",refresh);window.addEventListener("isys-attendance-updated",refresh);const interval=window.setInterval(()=>{setNow(Date.now());if(new Date().getHours()===0&&new Date().getMinutes()===0)load()},30000);return()=>{window.clearInterval(interval);window.removeEventListener("focus",refresh);window.removeEventListener("isys-attendance-updated",refresh)}},[load]);
 const total=useMemo(()=>worked(events,now),[events,now]);
 const getGps=()=>new Promise((resolve,reject)=>{
  if(!window.isSecureContext){reject(new Error("GPS vyžaduje zabezpečené připojení HTTPS."));return}
  if(!navigator.geolocation){reject(new Error("Zařízení nepodporuje zjištění polohy."));return}
  navigator.geolocation.getCurrentPosition(
   pos=>resolve({p_latitude:pos.coords.latitude,p_longitude:pos.coords.longitude,p_accuracy_m:pos.coords.accuracy,p_captured_at:new Date(pos.timestamp).toISOString()}),
   err=>reject(new Error(err.code===1?"Přístup k poloze byl zamítnut. Povolte FOXA přístup k poloze.":err.code===3?"Nepodařilo se včas zjistit polohu. Zkuste to znovu.":"Polohu se nepodařilo zjistit. Zkontrolujte polohové služby.")),
   {enableHighAccuracy:true,maximumAge:0,timeout:15000}
  );
 });
 const mark=async type=>{
  if(busy)return;
  setBusy(true);setError("");
  try{
   const gps=(type==="in"||type==="out")?await getGps():{};
   const {error:e}=await supabase.rpc("isys_attendance_mark_geo",{p_type:type,...gps});
   if(e)throw e;
   window.dispatchEvent(new Event("isys-attendance-updated"));
   await load();setNow(Date.now());
  }catch(e){setError(e?.message||"Docházku se nepodařilo zaznamenat.")}
  finally{setBusy(false)}
 };
 return <div className="attendance-header" aria-label="Rychlá docházka" aria-busy={busy}>
  <button type="button" className="attendance-header-time" onClick={onOpen} title="Otevřít docházku">
   <span className="attendance-header-clock">◷</span><span><strong>{ready?minutes(total):"—"}</strong><small>{ready?(labels[latest]||"Docházka")+" · dnes":"Docházka"}</small></span>
  </button>
  {ready&&(choices[latest]||choices.out).map(([type,label])=><button type="button" className={"attendance-header-action "+(type==="in"?"attendance-header-start":"")} key={type} data-action={type} aria-label={label} title={label} disabled={busy} onClick={()=>mark(type)}>{busy?"Ukládám…":label}</button>)}
  {error&&<span className="attendance-header-error" role="alert" title={error}>{error}</span>}
 </div>;
}
