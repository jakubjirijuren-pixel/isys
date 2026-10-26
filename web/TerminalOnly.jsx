import React,{useEffect,useState} from "react";
import {AttendanceKiosk} from "./AttendanceNfc.jsx";
import KeyKiosk from "./KeyKiosk.jsx";
import "./terminal-only.css";
export default function TerminalOnly({supabase,onLogout}){
 const [mode,setMode]=useState("");
 const [profiles,setProfiles]=useState([]);
 const [error,setError]=useState("");
 useEffect(()=>{
  let active=true;
  supabase.from("profiles").select("id,display_name").order("display_name").then(({data,error})=>{
   if(!active)return;
   if(error)setError("Seznam zaměstnanců se nepodařilo načíst: "+error.message);
   else setProfiles(data||[]);
  });
  return()=>{active=false};
 },[supabase]);
 return <main className="foxa-terminal-only">
  <header><strong>FOXA · Terminál</strong><button type="button" onClick={onLogout}>Odhlásit</button></header>
  {!mode?<section className="foxa-terminal-only-menu"><h1>Pracovní terminály</h1><p>Vyberte požadovanou činnost.</p><button type="button" onClick={()=>setMode("attendance")}>◷ Docházkový terminál</button><button type="button" onClick={()=>setMode("keys")}>⚿ Klíčový terminál</button></section>:<section className="foxa-terminal-only-active"><button type="button" className="foxa-terminal-only-back" onClick={()=>setMode("")}>‹ Výběr terminálu</button>{error&&<p role="alert">{error}</p>}{mode==="attendance"?<AttendanceKiosk supabase={supabase} profiles={profiles} onClose={()=>setMode("")}/>:<KeyKiosk supabase={supabase} onExit={()=>setMode("")}/>}</section>}
 </main>;
}
