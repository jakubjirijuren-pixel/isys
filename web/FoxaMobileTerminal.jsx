import React,{useEffect,useRef,useState} from "react";
import "./foxa-terminal.css";

const TerminalIcon=({name,size=26})=>{const paths={
 building:<><path d="M4 21V5l8-3 8 3v16M4 9h16M9 5v16M15 5v16M2 21h20"/></>,
 clipboard:<><rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4V2h6v2M8 13l3 3 5-6"/></>,
 key:<><circle cx="8" cy="8" r="5"/><path d="m12 12 9 9m-4-4 3-3m-5 1 3-3"/></>,
 clock:<><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/></>,
 scan:<><path d="M8 3H4a1 1 0 0 0-1 1v4m13-5h4a1 1 0 0 1 1 1v4M3 16v4a1 1 0 0 0 1 1h4m13-5v4a1 1 0 0 1-1 1h-4M7 12h10M10 9v6m4-6v6"/></>,
 cloud:<><path d="M6 19h12a4 4 0 0 0 0-8h-1a6 6 0 0 0-11-1 4.5 4.5 0 0 0 0 9Z"/></>,
 chevron:<path d="m9 5 7 7-7 7"/>,
 settings:<><circle cx="12" cy="12" r="3"/><path d="M10 2h4l1 3 3 1 3-1 2 4-2 3 1 3-2 3-3-1-3 2-1 3h-4l-1-3-3-1-3 1-2-4 2-3-1-3 2-3 3 1 3-2Z"/></>
 };return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]||paths.building}</svg>};

const STORE="foxa-terminal-draft-v1";
const quick=[["Objekty","building-2","Objekty"],["Evidence klíčů","key-round","Klíče"],["Docházka","clock","Docházka"],["Vozidla a kniha jízd","car","Vozidla"],["Tiskopisy","file","Tiskopisy"],["Wiki","book","Návody"]];
export default function FoxaMobileTerminal({pages=[],onNavigate=()=>{},onOpenInspections=()=>{},userLabel="",onOpenChangelog=()=>{}}){
 const [online,setOnline]=useState(()=>navigator.onLine);
 const [clock,setClock]=useState(()=>new Date());
 const [scanner,setScanner]=useState(false),[scanResult,setScanResult]=useState(""),[scanError,setScanError]=useState("");
 const [draft,setDraft]=useState(()=>{try{return JSON.parse(localStorage.getItem(STORE)||"null")||{object:"",note:"",savedAt:""}}catch{return {object:"",note:"",savedAt:""}}});
 const [saveState,setSaveState]=useState("");
 const videoRef=useRef(null),streamRef=useRef(null),scanRef=useRef(null),nfcRef=useRef(null);
 useEffect(()=>{const update=()=>setOnline(navigator.onLine);window.addEventListener("online",update);window.addEventListener("offline",update);const t=setInterval(()=>setClock(new Date()),30000);return()=>{window.removeEventListener("online",update);window.removeEventListener("offline",update);clearInterval(t)}},[]);
 useEffect(()=>{try{localStorage.setItem(STORE,JSON.stringify({...draft,savedAt:new Date().toISOString()}));setSaveState("Koncept uložen v tomto zařízení")}catch{setSaveState("Lokální uložení není dostupné")}},[draft.object,draft.note]);
 const stop=()=>{if(scanRef.current)cancelAnimationFrame(scanRef.current);scanRef.current=null;streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;if(nfcRef.current){try{nfcRef.current.abort()}catch{}}nfcRef.current=null};
 useEffect(()=>()=>stop(),[]);
 useEffect(()=>{if(!scanner){stop();return}let disposed=false;const start=async()=>{
  setScanError("");setScanResult("");
  if(!window.isSecureContext){setScanError("Skener vyžaduje HTTPS.");return}
  if("NDEFReader" in window){try{const controller=new AbortController();nfcRef.current=controller;const reader=new NDEFReader();await reader.scan({signal:controller.signal});reader.addEventListener("reading",event=>{const id=event.serialNumber||"";const values=[];for(const record of event.message.records){try{if(record.recordType==="text")values.push(new TextDecoder(record.encoding||"utf-8").decode(record.data))}catch{}}setScanResult(values.join(" ")||id||"NFC tag načten");});}catch(e){if(!disposed)setScanError("NFC není dostupné nebo nebylo povoleno. QR lze načíst fotoaparátem.")}}
  if(!("BarcodeDetector" in window)){setScanError(v=>v? v+" QR detekce není v tomto prohlížeči podporována.":"QR detekce není v tomto prohlížeči podporována. Použij ruční zadání.");return}
  try{const detector=new BarcodeDetector({formats:["qr_code","code_128","code_39","ean_13"]});const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});if(disposed){stream.getTracks().forEach(t=>t.stop());return}streamRef.current=stream;if(videoRef.current){videoRef.current.srcObject=stream;await videoRef.current.play()}const tick=async()=>{if(disposed||!videoRef.current)return;try{const codes=await detector.detect(videoRef.current);if(codes.length){setScanResult(codes[0].rawValue||"Kód načten");stop();return}}catch{}scanRef.current=requestAnimationFrame(tick)};tick()}catch(e){if(!disposed)setScanError("Fotoaparát není dostupný nebo nebyl povolen. Použij ruční zadání.")}
 };start();return()=>{disposed=true;stop()}},[scanner]);
 const navigate=target=>{setScanner(false);onNavigate(target)};
 const has=target=>pages.includes(target);
 return <section className="foxa-terminal-home" aria-label="Mobilní pracovní terminál">
  <div className="terminal-head"><span className="terminal-building-symbol"><TerminalIcon name="building" size={43}/></span><div className="terminal-head-copy"><span className="terminal-kicker">PRACOVNÍ TERMINÁL</span><h1>FOXA <span>FIELD</span></h1><p>{userLabel||"Pracovní prostředí"}</p></div><div className={"terminal-connection "+(online?"is-online":"is-offline")}><span aria-hidden="true">●</span> {online?"ONLINE":"OFFLINE"}</div></div>
  <div className="terminal-status"><div><span className="terminal-status-symbol"><TerminalIcon name="clock"/></span><small>AKTUÁLNÍ ČAS</small><strong>{clock.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})}</strong><span>{clock.toLocaleDateString("cs-CZ",{weekday:"long",day:"numeric",month:"long"})}</span></div><div className="terminal-status-side"><span className="terminal-status-symbol"><TerminalIcon name="cloud"/></span><small>PŘIPOJENÍ</small><strong>{online?"Připraveno":"Bez sítě"}</strong><span>{online?"Cloudové moduly dostupné":"Pouze místní koncepty"}</span></div></div>
  <div className="terminal-section-heading"><h2 className="terminal-section-title">Rychlé akce</h2><TerminalIcon name="settings" size={21}/></div>
  <div className="terminal-action-grid">
   {has("Objekty")&&<button type="button" className="action-objects" onClick={()=>navigate("Objekty")}><span className="terminal-action-icon"><TerminalIcon name="building" size={33}/></span><span className="terminal-action-arrow"><TerminalIcon name="chevron" size={20}/></span><strong>Najít objekt</strong><small>Evidence domů</small></button>}
   {(has("Objekty"))&&<button type="button" className="action-inspection" onClick={()=>{setScanner(false);onOpenInspections()}}><span className="terminal-action-icon"><TerminalIcon name="clipboard" size={33}/></span><span className="terminal-action-arrow"><TerminalIcon name="chevron" size={20}/></span><strong>Nová kontrola</strong><small>Kontrolní výkaz</small></button>}
   {has("Evidence klíčů")&&<button type="button" className="action-keys" onClick={()=>navigate("Evidence klíčů")}><span className="terminal-action-icon"><TerminalIcon name="key" size={33}/></span><span className="terminal-action-arrow"><TerminalIcon name="chevron" size={20}/></span><strong>Klíče</strong><small>Výpůjčky a vrácení</small></button>}
   {has("Docházka")&&<button type="button" className="action-attendance" onClick={()=>navigate("Docházka")}><span className="terminal-action-icon"><TerminalIcon name="clock" size={33}/></span><span className="terminal-action-arrow"><TerminalIcon name="chevron" size={20}/></span><strong>Docházka</strong><small>Pracovní doba</small></button>}
  </div>

  <section className="terminal-draft"><div className="terminal-draft-heading"><h2>Terénní koncept</h2><span>{online?"Lokální uložení":"Offline režim"}</span></div><p>Rychlá poznámka při výjezdu. Ukládá se pouze do tohoto zařízení, bez automatického odesílání do databáze.</p><label>Objekt / identifikátor<input value={draft.object} onChange={e=>setDraft(v=>({...v,object:e.target.value}))} placeholder="Objekt nebo naskenovaný kód"/></label><label>Pracovní poznámka<textarea rows={3} value={draft.note} onChange={e=>setDraft(v=>({...v,note:e.target.value}))} placeholder="Zapiš poznámku z terénu…"/></label><div className="terminal-draft-footer"><small role="status">{saveState}</small><button type="button" disabled={!draft.object&&!draft.note} onClick={()=>{const text=[draft.object,draft.note].filter(Boolean).join("\n");navigator.clipboard?.writeText(text).then(()=>setSaveState("Koncept zkopírován")).catch(()=>setSaveState("Kopírování se nezdařilo"))}}>Kopírovat</button><button type="button" disabled={!draft.object&&!draft.note} onClick={()=>{if(window.confirm("Smazat lokální koncept?"))setDraft({object:"",note:""})}}>Vymazat</button></div></section>
  <h2 className="terminal-section-title">Všechny pracovní moduly</h2><div className="terminal-modules">{quick.filter(([target])=>has(target)).map(([target,symbol,label])=><button type="button" key={target} onClick={()=>navigate(target)}><span>{symbol==="building-2"?"▤":symbol==="key-round"?"⚿":symbol==="clock"?"◷":symbol==="car"?"▣":symbol==="file"?"▤":"▧"}</span>{label}<b>›</b></button>)}</div>
  <button type="button" className="terminal-updates" onClick={onOpenChangelog}>Novinky a aktualizace FOXA ›</button>
 </section>
}
