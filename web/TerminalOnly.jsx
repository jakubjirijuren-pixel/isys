import React,{useEffect,useRef,useState} from "react";
import {AttendanceKiosk} from "./AttendanceNfc.jsx";
import KeyKiosk from "./KeyKiosk.jsx";
import "./terminal-only.css";
const extractCard=event=>{
 const uid=String(event.serialNumber||"").replace(/[^0-9a-f]/gi,"").toUpperCase();
 if(uid.length>=8&&uid.length<=32&&uid.length%2===0)return "UID:"+uid;
 for(const r of event.message?.records||[]){
  if(r.recordType!=="text")continue;
  try{const value=new TextDecoder(r.encoding||"utf-8").decode(r.data).trim();if(/^ISYSATT-[a-f0-9]{64}$/.test(value))return value}catch{}
 }
 return "";
};
export default function TerminalOnly({supabase,onLogout}){
 const [mode,setMode]=useState("");
 const [profiles,setProfiles]=useState([]);
 const [error,setError]=useState("");
 const [adminUnlocked,setAdminUnlocked]=useState(false);
 const [scanningAdmin,setScanningAdmin]=useState(false);
 const controller=useRef(null);
 const unlockTimer=useRef(null);
 const stopScan=()=>{controller.current?.abort();controller.current=null};
 const lock=()=>{setAdminUnlocked(false);if(unlockTimer.current)clearTimeout(unlockTimer.current)};
 useEffect(()=>()=>{stopScan();if(unlockTimer.current)clearTimeout(unlockTimer.current)},[]);
 useEffect(()=>{
  let active=true;
  supabase.from("profiles").select("id,display_name").order("display_name").then(({data,error})=>{
   if(!active)return;
   if(error)setError("Seznam zaměstnanců se nepodařilo načíst: "+error.message);
   else setProfiles(data||[]);
  });
  return()=>{active=false};
 },[supabase]);
 const startAdminScan=async()=>{
  setError("");
  if(!("NDEFReader" in window)){setError("Ověření administrátorského čipu vyžaduje Android s Chrome a Web NFC.");return}
  stopScan();const c=new AbortController();controller.current=c;setScanningAdmin(true);
  try{
   const reader=new window.NDEFReader();
   reader.onreading=async event=>{
    if(c.signal.aborted)return;
    const token=extractCard(event);
    stopScan();setScanningAdmin(false);
    if(!token){setError("Čip se nepodařilo přečíst.");return}
    const {data,error:e}=await supabase.rpc("foxa_terminal_admin_card",{p_token:token});
    if(e||data!==true){setError(e?.message||"Tento čip nemá administrátorské oprávnění.");return}
    setAdminUnlocked(true);
    if(unlockTimer.current)clearTimeout(unlockTimer.current);
    unlockTimer.current=setTimeout(()=>setAdminUnlocked(false),60000);
   };
   reader.onreadingerror=()=>setError("NFC čip nelze přečíst.");
   await reader.scan({signal:c.signal});
  }catch(e){if(!c.signal.aborted)setError(e.message);setScanningAdmin(false)}
 };
 return <main className="foxa-terminal-only">
  <header><strong>FOXA · Terminál</strong><div className="foxa-terminal-only-header-actions">{adminUnlocked&&<><button type="button" onClick={lock}>Zamknout správu</button><button type="button" onClick={onLogout}>Odhlásit</button></>}<button type="button" onClick={()=>{if(scanningAdmin){stopScan();setScanningAdmin(false)}else startAdminScan()}}>{scanningAdmin?"Zrušit ověření":"Správa čipem"}</button></div></header>
  {error&&<p role="alert" className="foxa-terminal-only-error">{error}</p>}
  {scanningAdmin?<section className="foxa-terminal-only-menu"><h1>Přiložte čip administrátora</h1><p>Po ověření se na 60 sekund zpřístupní správa terminálu.</p></section>:!mode?<section className="foxa-terminal-only-menu"><h1>Pracovní terminály</h1><p>Vyberte požadovanou činnost.</p><button type="button" onClick={()=>{lock();setMode("attendance")}}><span>◷ Docházkový terminál</span><strong>Spustit terminál →</strong></button><button type="button" onClick={()=>{lock();setMode("keys")}}><span>⚿ Klíčový terminál</span><strong>Spustit terminál →</strong></button></section>:<section className="foxa-terminal-only-active">{adminUnlocked&&<button type="button" className="foxa-terminal-only-back" onClick={()=>{lock();setMode("")}}>‹ Výběr terminálu</button>}{mode==="attendance"?<AttendanceKiosk supabase={supabase} profiles={profiles} onClose={()=>{lock();setMode("")}}/>:<KeyKiosk supabase={supabase} onExit={()=>{lock();setMode("")}}/>}</section>}
 </main>;
}
