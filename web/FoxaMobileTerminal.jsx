import React,{useEffect,useState} from "react";
import "./foxa-terminal.css";

const TerminalIcon=({name,size=26})=>{const paths={
 building:<><path d="M4 21V5l8-3 8 3v16M4 9h16M9 5v16M15 5v16M2 21h20"/></>,
 clipboard:<><rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4V2h6v2M8 13l3 3 5-6"/></>,
 key:<><circle cx="8" cy="8" r="5"/><path d="m12 12 9 9m-4-4 3-3m-5 1 3-3"/></>,
 clock:<><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/></>,
 cloud:<><path d="M6 19h12a4 4 0 0 0 0-8h-1a6 6 0 0 0-11-1 4.5 4.5 0 0 0 0 9Z"/></>,
 chevron:<path d="m9 5 7 7-7 7"/>,
 settings:<><circle cx="12" cy="12" r="3"/><path d="M10 2h4l1 3 3 1 3-1 2 4-2 3 1 3-2 3-3-1-3 2-1 3h-4l-1-3-3-1-3 1-2-4 2-3-1-3 2-3 3 1 3-2Z"/></>
 };return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]||paths.building}</svg>};

export default function FoxaMobileTerminal({pages=[],onNavigate=()=>{},onOpenInspections=()=>{},userLabel="",onOpenChangelog=()=>{}}){
 const [online,setOnline]=useState(()=>navigator.onLine);
 const [clock,setClock]=useState(()=>new Date());
 useEffect(()=>{const update=()=>setOnline(navigator.onLine);window.addEventListener("online",update);window.addEventListener("offline",update);const t=setInterval(()=>setClock(new Date()),30000);return()=>{window.removeEventListener("online",update);window.removeEventListener("offline",update);clearInterval(t)}},[]);
 const navigate=target=>onNavigate(target);
 const has=target=>pages.includes(target);
 return <section className="foxa-terminal-home" aria-label="Mobilní pracovní terminál">
  <div className="terminal-head"><span className="terminal-building-symbol"><TerminalIcon name="building" size={43}/></span><div className="terminal-head-copy"><span className="terminal-kicker">PRACOVNÍ TERMINÁL</span><h1>FOXA <span>FIELD</span></h1><p>{userLabel||"Pracovní prostředí"}</p></div><div className={"terminal-connection "+(online?"is-online":"is-offline")}><span aria-hidden="true">●</span> {online?"ONLINE":"OFFLINE"}</div></div>
  <div className="terminal-status"><div><span className="terminal-status-symbol"><TerminalIcon name="clock"/></span><small>AKTUÁLNÍ ČAS</small><strong>{clock.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})}</strong><span>{clock.toLocaleDateString("cs-CZ",{weekday:"long",day:"numeric",month:"long"})}</span></div><div className="terminal-status-side"><span className="terminal-status-symbol"><TerminalIcon name="cloud"/></span><small>PŘIPOJENÍ</small><strong>{online?"Připraveno":"Bez sítě"}</strong><span>{online?"Cloudové moduly dostupné":"Pouze místní koncepty"}</span></div></div>
  <div className="terminal-section-heading"><h2 className="terminal-section-title">Rychlé akce</h2><TerminalIcon name="settings" size={21}/></div>
  <div className="terminal-action-grid">
   {has("Objekty")&&<button type="button" className="action-objects" onClick={()=>navigate("Objekty")}><span className="terminal-action-icon"><TerminalIcon name="building" size={33}/></span><span className="terminal-action-arrow"><TerminalIcon name="chevron" size={20}/></span><strong>Najít objekt</strong><small>Evidence domů</small></button>}
   {(has("Objekty"))&&<button type="button" className="action-inspection" onClick={onOpenInspections}><span className="terminal-action-icon"><TerminalIcon name="clipboard" size={33}/></span><span className="terminal-action-arrow"><TerminalIcon name="chevron" size={20}/></span><strong>Nová kontrola</strong><small>Kontrolní výkaz</small></button>}
   {has("Evidence klíčů")&&<button type="button" className="action-keys" onClick={()=>navigate("Evidence klíčů")}><span className="terminal-action-icon"><TerminalIcon name="key" size={33}/></span><span className="terminal-action-arrow"><TerminalIcon name="chevron" size={20}/></span><strong>Centrální registr klíčů</strong><small>Výpůjčky a vrácení</small></button>}
   {has("Docházka")&&<button type="button" className="action-attendance" onClick={()=>navigate("Docházka")}><span className="terminal-action-icon"><TerminalIcon name="clock" size={33}/></span><span className="terminal-action-arrow"><TerminalIcon name="chevron" size={20}/></span><strong>Docházka</strong><small>Pracovní doba</small></button>}
  </div>
  <button type="button" className="terminal-updates" onClick={onOpenChangelog}>Novinky a aktualizace FOXA ›</button>
 </section>
}
