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
 const [mode,setMode]=useState(()=>{try{const saved=window.localStorage.getItem("foxa:work-terminal:mode");return saved==="attendance"||saved==="keys"?saved:""}catch{return ""}});
 useEffect(()=>{try{if(mode)window.localStorage.setItem("foxa:work-terminal:mode",mode);else window.localStorage.removeItem("foxa:work-terminal:mode")}catch{}},[mode]);
 const [profiles,setProfiles]=useState([]);
 const [error,setError]=useState("");
 const [adminUnlocked,setAdminUnlocked]=useState(false);
 const [scanningAdmin,setScanningAdmin]=useState(false);
 const [clock,setClock]=useState(()=>new Date());
 const adminUnlockedRef=useRef(false);
 adminUnlockedRef.current=adminUnlocked;
 useEffect(()=>{const tick=()=>setClock(new Date());const interval=setInterval(tick,1000);const onFocus=()=>tick();document.addEventListener("visibilitychange",onFocus);return()=>{clearInterval(interval);document.removeEventListener("visibilitychange",onFocus)}},[]);
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
 useEffect(()=>{
  // Prevent accidental history navigation while the dedicated terminal account is active.
  // Browser/system navigation cannot be fully disabled from a website.
  const guard={foxaTerminalGuard:true};
  window.history.pushState(guard,"",window.location.href);
  const onPop=()=>{
   window.history.pushState(guard,"",window.location.href);
  };
  window.addEventListener("popstate",onPop);
  const onKeyDown=e=>{
   const key=e.key.toLowerCase();
   const editing=e.target?.closest?.("input,textarea,select,[contenteditable=true]");
   if(editing||adminUnlockedRef.current)return;
   if(key==="f5"||((e.ctrlKey||e.metaKey)&&key==="r")||((e.altKey||e.metaKey)&&key==="arrowleft")||key==="browserback"){
    e.preventDefault();
   }
  };
  document.addEventListener("keydown",onKeyDown,true);
  let startX=0,startY=0;
  const onTouchStart=e=>{if(e.touches.length!==1)return;startX=e.touches[0].clientX;startY=e.touches[0].clientY};
  const onTouchMove=e=>{
   if(e.touches.length!==1||!e.cancelable||adminUnlockedRef.current)return;
   const dx=e.touches[0].clientX-startX,dy=e.touches[0].clientY-startY;
   const target=e.target;
   const scrollArea=target?.closest?.(".attendance-terminal-main,.key-kiosk-main,.foxa-terminal-only-active");
   if((startX<32&&dx>45&&Math.abs(dx)>Math.abs(dy))||(startX>window.innerWidth-32&&dx< -45&&Math.abs(dx)>Math.abs(dy))){
    e.preventDefault();return;
   }
   if(dy>35&&Math.abs(dy)>Math.abs(dx)&&(!scrollArea||scrollArea.scrollTop<=0)&&window.scrollY<=0)e.preventDefault();
  };
  document.addEventListener("touchstart",onTouchStart,{passive:true});
  document.addEventListener("touchmove",onTouchMove,{passive:false});
  return()=>{
   window.removeEventListener("popstate",onPop);
   document.removeEventListener("keydown",onKeyDown,true);
   document.removeEventListener("touchstart",onTouchStart);
   document.removeEventListener("touchmove",onTouchMove);
  };
 },[]);
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
 return <main className={"foxa-terminal-only"+(adminUnlocked?" foxa-terminal-only-admin-unlocked":"")}>
  <header><div className="foxa-terminal-only-brand"><span className="foxa-terminal-only-mark" aria-hidden="true">F</span><span><strong>FOXA</strong><small>PRACOVNÍ TERMINÁL</small></span></div><div className="foxa-terminal-only-header-actions">{adminUnlocked&&<span className="foxa-terminal-admin-status">Správa odemčena · 60 s</span>}<button type="button" onClick={()=>{if(scanningAdmin){stopScan();setScanningAdmin(false)}else startAdminScan()}}>{scanningAdmin?"Zrušit ověření":"Správa čipem"}</button></div></header>
  {adminUnlocked&&<nav className="foxa-terminal-admin-panel" aria-label="Správa terminálu"><div className="foxa-terminal-admin-panel-title"><span className="foxa-terminal-admin-panel-icon" aria-hidden="true">✓</span><span><strong>Administrátorský režim</strong><small>Ověření čipem bylo úspěšné. Oprávnění se automaticky uzamkne po 60 sekundách.</small></span></div><div className="foxa-terminal-admin-panel-actions">{mode&&<button type="button" onClick={()=>{lock();setMode("")}}>Výběr terminálu</button>}<button type="button" onClick={()=>window.location.reload()}>Obnovit terminál</button><button type="button" onClick={onLogout}>Odhlásit se</button><button type="button" onClick={lock}>Zamknout správu</button></div></nav>}
  {error&&<p role="alert" className="foxa-terminal-only-error">{error}</p>}
  {scanningAdmin?<section className="foxa-terminal-only-menu"><h1>Přiložte čip administrátora</h1><p>Po ověření se na 60 sekund zpřístupní správa terminálu.</p><div className="foxa-terminal-clock"><strong>{clock.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})}</strong><span>{clock.toLocaleDateString("cs-CZ",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</span></div></section>:!mode?<section className="foxa-terminal-only-menu"><span className="foxa-terminal-only-eyebrow">PRACOVNÍ STANICE</span><h1>Vyberte terminál</h1><p>Pro pokračování zvolte požadovanou pracovní činnost.</p><button type="button" onClick={()=>{lock();setMode("attendance")}}><span className="foxa-terminal-only-choice-icon" aria-hidden="true">◷</span><span className="foxa-terminal-only-choice-copy"><b>Docházka</b><small>Příchod, odchod a pracovní doba</small></span><strong>Spustit <span aria-hidden="true">→</span></strong></button><button type="button" onClick={()=>{lock();setMode("keys")}}><span className="foxa-terminal-only-choice-icon" aria-hidden="true">⚿</span><span className="foxa-terminal-only-choice-copy"><b>Evidence klíčů</b><small>Výpůjčky a vracení svazků</small></span><strong>Spustit <span aria-hidden="true">→</span></strong></button></section>:<section className="foxa-terminal-only-active">{mode==="attendance"?<AttendanceKiosk supabase={supabase} profiles={profiles} onClose={()=>{lock();setMode("")}}/>:<KeyKiosk supabase={supabase} onExit={()=>{lock();setMode("")}}/>}</section>}
 </main>;
}
