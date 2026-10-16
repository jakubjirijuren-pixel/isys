import React,{useCallback,useEffect,useMemo,useState} from "react";
import "./attendance-header.css";
const choices={out:[["in","Příchod"]],in:[["break_start","Přestávka"],["out","Odchod"]],break_start:[["break_end","Konec přestávky"]],break_end:[["break_start","Přestávka"],["out","Odchod"]]};
const labels={in:"V práci",break_start:"Na přestávce",break_end:"V práci",out:"Mimo práci"};
const localDate=date=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
const minutes=ms=>{const total=Math.max(0,Math.floor(ms/60000));return Math.floor(total/60)+" h "+String(total%60).padStart(2,"0")+" min"};
function worked(events,now){
 let total=0,start=null;
 for(const item of [...events].sort((a,b)=>new Date(a.occurred_at)-new Date(b.occurred_at))){
  const time=new Date(item.occurred_at).getTime();
  if(item.event_type==="in"||item.event_type==="break_end")start=time;
  if((item.event_type==="break_start"||item.event_type==="out")&&start!==null){total+=Math.max(0,time-start);start=null}
 }
 if(start!==null)total+=Math.max(0,now-start);
 return total;
}
export default function AttendanceHeader({supabase,userId,onOpen}){
 const [events,setEvents]=useState([]),[latest,setLatest]=useState("out"),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[now,setNow]=useState(Date.now());
 const load=useCallback(async()=>{
  const today=localDate(new Date());
  const [day,mostRecent]=await Promise.all([
   supabase.from("attendance_events").select("event_type,occurred_at").eq("user_id",userId).gte("occurred_at",today+"T00:00:00").order("occurred_at",{ascending:true}),
   supabase.from("attendance_events").select("event_type").eq("user_id",userId).order("occurred_at",{ascending:false}).limit(1)
  ]);
  if(day.error||mostRecent.error){setError("Docházka není dostupná.");setReady(false);return}
  setEvents(day.data||[]);setLatest(mostRecent.data?.[0]?.event_type||"out");setReady(true);setError("");
 },[supabase,userId]);
 useEffect(()=>{load();const refresh=()=>load();window.addEventListener("focus",refresh);const interval=window.setInterval(()=>{setNow(Date.now());if(new Date().getHours()===0&&new Date().getMinutes()===0)load()},30000);return()=>{window.clearInterval(interval);window.removeEventListener("focus",refresh)}},[load]);
 const total=useMemo(()=>worked(events,now),[events,now]);
 const mark=async type=>{
  if(busy)return;setBusy(true);setError("");
  const {error:e}=await supabase.rpc("isys_attendance_mark",{p_type:type});
  if(e)setError(e.message);
  await load();setNow(Date.now());setBusy(false);
 };
 return <div className="attendance-header" aria-label="Rychlá docházka">
  <button type="button" className="attendance-header-time" onClick={onOpen} title="Otevřít docházku">
   <span className="attendance-header-clock">◷</span><span><strong>{ready?minutes(total):"—"}</strong><small>{ready?(labels[latest]||"Docházka")+" · dnes":"Docházka"}</small></span>
  </button>
  {ready&&(choices[latest]||choices.out).map(([type,label])=><button type="button" className={"attendance-header-action "+(type==="in"?"attendance-header-start":"")} key={type} disabled={busy} onClick={()=>mark(type)}>{busy?"Ukládám…":label}</button>)}
  {error&&<span className="attendance-header-error" role="alert" title={error}>{error}</span>}
 </div>;
}
