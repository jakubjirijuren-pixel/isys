import React,{useEffect,useRef,useState} from "react";
import "./foxa-terminal.css";

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
  }
  if(!("BarcodeDetector" in window)){setScanError(v=>v? v+" QR detekce není v tomto prohlížeči podporována.":"QR detekce není v tomto prohlížeči podporována. Použij ruční zadání.");return}
  try{const detector=new BarcodeDetector({formats:["qr_code","code_128","code_39","ean_13"]});const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});if(disposed){stream.getTracks().forEach(t=>t.stop());return}streamRef.current=stream;if(videoRef.current){videoRef.current.srcObject=stream;await videoRef.current.play()}const tick=async()=>{if(disposed||!videoRef.current)return;try{const codes=await detector.detect(videoRef.current);if(codes.length){setScanResult(codes[0].rawValue||"Kód načten");stop();return}}catch{}scanRef.current=requestAnimationFrame(tick)};tick()}catch(e){if(!disposed)setScanError("Fotoaparát není dostupný nebo nebyl povolen. Použij ruční zadání.")}
 };start();return()=>{disposed=true;stop()}},[scanner]);
 const navigate=target=>{setScanner(false);onNavigate(target)};
 const has=target=>pages.includes(target);
 return <section className="foxa-terminal-home" aria-label="Mobilní pracovní terminál">
  <div className="terminal-head"><div><span className="terminal-kicker">PRACOVNÍ TERMINÁL</span><h1>FOXA <span>FIELD</span></h1><p>{userLabel||"Pracovní prostředí"}</p></div><div className={"terminal-connection "+(online?"is-online":"is-offline")}><span aria-hidden="true">●</span> {online?"ONLINE":"OFFLINE"}</div></div>
  <div className="terminal-status"><div><small>AKTUÁLNÍ ČAS</small><strong>{clock.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})}</strong><span>{clock.toLocaleDateString("cs-CZ",{weekday:"long",day:"numeric",month:"long"})}</span></div><div className="terminal-status-side"><small>PŘIPOJENÍ</small><strong>{online?"Připraveno":"Bez sítě"}</strong><span>{online?"Cloudové moduly dostupné":"Pouze místní koncepty"}</span></div></div>
  <h2 className="terminal-section-title">Rychlé akce</h2>
  <div className="terminal-action-grid">
   {has("Objekty")&&<button type="button" onClick={()=>navigate("Objekty")}><span className="terminal-action-icon">▤</span><strong>Najít objekt</strong><small>Evidence domů</small></button>}
   {(has("Objekty"))&&<button type="button" onClick={()=>{setScanner(false);onOpenInspections()}}><span className="terminal-action-icon">☑</span><strong>Nová kontrola</strong><small>Kontrolní výkaz</small></button>}
   {has("Evidence klíčů")&&<button type="button" onClick={()=>navigate("Evidence klíčů")}><span className="terminal-action-icon">⚿</span><strong>Klíče</strong><small>Výpůjčky a vrácení</small></button>}
   {has("Docházka")&&<button type="button" onClick={()=>navigate("Docházka")}><span className="terminal-action-icon">◷</span><strong>Docházka</strong><small>Pracovní doba</small></button>}
  </div>
  <button className="terminal-scan-launch" type="button" onClick={()=>setScanner(v=>!v)}><span aria-hidden="true">▥</span><span><strong>NFC / QR SKENER</strong><small>Načíst identifikátor klíče nebo objektu</small></span><span aria-hidden="true">›</span></button>
  {scanner&&<section className="terminal-scan-panel"><h2>Načtení identifikátoru</h2><p>QR kód namiř do fotoaparátu nebo přilož NFC štítek. Podpora závisí na zařízení a prohlížeči.</p><video ref={videoRef} muted playsInline autoPlay aria-label="Náhled skeneru"/>{scanError&&<p role="status">{scanError}</p>}<label>Načtený nebo ručně zadaný kód<input value={scanResult} onChange={e=>setScanResult(e.target.value)} placeholder="Identifikátor" autoComplete="off"/></label>{scanResult&&<button type="button" onClick={()=>{setDraft(v=>({...v,object:scanResult}));setScanner(false)}}>Použít v terénním konceptu</button>}<button type="button" className="terminal-scan-close" onClick={()=>setScanner(false)}>Zavřít skener</button></section>}
  <section className="terminal-draft"><div className="terminal-draft-heading"><h2>Terénní koncept</h2><span>{online?"Lokální uložení":"Offline režim"}</span></div><p>Rychlá poznámka při výjezdu. Ukládá se pouze do tohoto zařízení, bez automatického odesílání do databáze.</p><label>Objekt / identifikátor<input value={draft.object} onChange={e=>setDraft(v=>({...v,object:e.target.value}))} placeholder="Objekt nebo naskenovaný kód"/></label><label>Pracovní poznámka<textarea rows={3} value={draft.note} onChange={e=>setDraft(v=>({...v,note:e.target.value}))} placeholder="Zapiš poznámku z terénu…"/></label><div className="terminal-draft-footer"><small role="status">{saveState}</small><button type="button" disabled={!draft.object&&!draft.note} onClick={()=>{const text=[draft.object,draft.note].filter(Boolean).join("\n");navigator.clipboard?.writeText(text).then(()=>setSaveState("Koncept zkopírován")).catch(()=>setSaveState("Kopírování se nezdařilo"))}}>Kopírovat</button><button type="button" disabled={!draft.object&&!draft.note} onClick={()=>{if(window.confirm("Smazat lokální koncept?"))setDraft({object:"",note:""})}}>Vymazat</button></div></section>
  <h2 className="terminal-section-title">Všechny pracovní moduly</h2><div className="terminal-modules">{quick.filter(([target])=>has(target)).map(([target,symbol,label])=><button type="button" key={target} onClick={()=>navigate(target)}><span>{symbol==="building-2"?"▤":symbol==="key-round"?"⚿":symbol==="clock"?"◷":symbol==="car"?"▣":symbol==="file"?"▤":"▧"}</span>{label}<b>›</b></button>)}</div>
  <button type="button" className="terminal-updates" onClick={onOpenChangelog}>Novinky a aktualizace FOXA ›</button>
 </section>
}
