import React,{useEffect,useRef,useState} from "react";
import "./AttendanceKiosk.css";
const names={trip_start:"Služební cesta",trip_end:"Konec služební cesty",doctor_start:"Lékař",doctor_end:"Konec lékaře",homeoffice_start:"Home office",homeoffice_end:"Konec home office",in:"Příchod",break_start:"Začátek přestávky",break_end:"Konec přestávky",out:"Odchod"};
const next={out:["in","trip_start","doctor_start","homeoffice_start"],trip_end:["in","trip_start","doctor_start","homeoffice_start"],doctor_end:["in","trip_start","doctor_start","homeoffice_start"],homeoffice_end:["in","trip_start","doctor_start","homeoffice_start"],trip_start:["trip_end"],doctor_start:["doctor_end"],homeoffice_start:["homeoffice_end"],in:["break_start","out"],break_end:["break_start","out"],break_start:["break_end"]};
const extract=message=>{
 for(const r of message.records){
  if(r.recordType!=="text")continue;
  try{const text=new TextDecoder(r.encoding||"utf-8").decode(r.data).trim();if(/^ISYSATT-[a-f0-9]{64}$/.test(text))return text}catch{}
 }
 return null;
};
export function AttendanceKiosk({supabase,profiles,onClose,onSaved}){
 const [token,setToken]=useState(""),[person,setPerson]=useState(null),[last,setLast]=useState("out"),[error,setError]=useState(""),[state,setState]=useState("idle"),[success,setSuccess]=useState("");
 const [remaining,setRemaining]=useState(15);
 const [clock,setClock]=useState(()=>new Date());
 useEffect(()=>{const refresh=()=>setClock(new Date());const timer=setInterval(refresh,1000);document.addEventListener("visibilitychange",refresh);return()=>{clearInterval(timer);document.removeEventListener("visibilitychange",refresh)}},[]);
 const clockDisplay=<div className="attendance-terminal-clock"><strong>{clock.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})}</strong><span>{clock.toLocaleDateString("cs-CZ",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</span></div>;
 const [scannedName,setScannedName]=useState("");
 const controller=useRef(null);
 const resetTimer=useRef(null);
 const startRef=useRef(null);
 const [autoScanEnabled,setAutoScanEnabled]=useState(true);
 const clearReset=()=>{if(resetTimer.current)clearTimeout(resetTimer.current);resetTimer.current=null};
 const stop=()=>{controller.current?.abort();controller.current=null};
 useEffect(()=>()=>{stop();clearReset()},[]);
 useEffect(()=>{if(state!=="confirm"&&state!=="done")return;clearReset();setRemaining(15);const deadline=Date.now()+15000;const interval=setInterval(()=>setRemaining(Math.max(0,Math.ceil((deadline-Date.now())/1000))),200);resetTimer.current=setTimeout(()=>{setToken("");setPerson(null);setScannedName("");setError("");setSuccess("");setState("idle")},15000);return()=>{clearInterval(interval);clearReset()}},[state]);
 useEffect(()=>{if(state!=="idle"||!autoScanEnabled)return;const t=setTimeout(()=>startRef.current?.(),350);return()=>clearTimeout(t)},[state,autoScanEnabled]);
 const start=async()=>{
  clearReset();stop();setToken("");setPerson(null);setScannedName("");setError("");setSuccess("");
  if(!("NDEFReader" in window)){setAutoScanEnabled(false);setError("NFC čtení vyžaduje Chrome na Androidu a zapnuté NFC.");return}
  const c=new AbortController();controller.current=c;setState("scanning");
  try{
   const reader=new window.NDEFReader();
   reader.onreading=async event=>{
    if(c.signal.aborted)return;
    const serial=String(event.serialNumber||"").replace(/[^0-9a-f]/gi,"").toUpperCase();
    const value=serial.length>=8&&serial.length<=32&&serial.length%2===0?"UID:"+serial:extract(event.message);
    stop();setState("loading");
    if(!value){setAutoScanEnabled(false);setError("Nelze přečíst sériové číslo čipu. Web NFC podporuje jen některé typy NFC čipů; zkuste jiný čip nebo Android s Chrome.");setState("idle");return}
    const {data,error:e}=await supabase.rpc("isys_attendance_card_status",{p_token:value});
    if(e||!data?.length){setAutoScanEnabled(false);setError(e?.message||"Čip není přiřazen zaměstnanci.");setState("idle");return}
    const {data:cardName}=await supabase.rpc("foxa_terminal_employee_name",{p_token:value});
    setScannedName(typeof cardName==="string"?cardName:"");setToken(value);setPerson(data[0].user_id);setLast(data[0].last_event||"out");setState("confirm");
   };
   reader.onreadingerror=()=>{setAutoScanEnabled(false);setError("NFC čip nelze přečíst. Zkuste to znovu.")};
   await reader.scan({signal:c.signal});
  }catch(e){if(!c.signal.aborted){setAutoScanEnabled(false);setError(e.message);setState("idle")}}
 };
 startRef.current=start;
 const mark=async type=>{
  setState("saving");setError("");
  const {error:e}=await supabase.rpc("isys_attendance_card_mark",{p_token:token,p_type:type});
  if(e){setError(e.message);setState("confirm");return}
  setAutoScanEnabled(true);setSuccess("Zaznamenáno: "+names[type]);setState("done");setToken("");onSaved?.();
 };
 const label=profiles.find(p=>p.id===person);
 const employeeName=scannedName||label?.display_name||label?.full_name||label?.email||"Jméno se nepodařilo načíst";
 const countdown=<div className="attendance-terminal-countdown" role="timer" aria-label={"Automatické odhlášení za "+remaining+" sekund"}><span>Automatický návrat za</span><strong>{remaining} s</strong><div className="attendance-terminal-countdown-track"><span style={{width:(remaining/15*100)+"%"}}/></div></div>;
 return <div className="attendance-terminal" role="dialog" aria-modal="true" aria-label="Docházkový terminál">
 <header className="attendance-terminal-head"><strong><span className="attendance-terminal-brand">FOXA</span> Docházkový terminál</strong><button type="button" className="attendance-terminal-exit" onClick={()=>{stop();onClose()}} aria-label="Zavřít terminál">✕</button></header>
 <main className="attendance-terminal-main">
 {state==="idle"&&<section className="attendance-terminal-panel attendance-terminal-intro"><span className="attendance-terminal-icon" aria-hidden="true">◷</span><h1>Evidence docházky</h1>{clockDisplay}<p>Přiložte svůj NFC čip. Čtečka se spouští automaticky, pokud to zařízení dovolí.</p><button type="button" className="attendance-terminal-primary" onClick={()=>{setAutoScanEnabled(true);start()}}>Spustit čtení NFC</button></section>}
 {state==="scanning"&&<section className="attendance-terminal-panel"><div className="attendance-terminal-scan" role="status"><span aria-hidden="true">◈</span><strong>Přiložte osobní NFC čip</strong>{clockDisplay}<small>Podržte čip u NFC čtečky zařízení.</small></div></section>}
 {(state==="loading"||state==="saving")&&<section className="attendance-terminal-panel attendance-terminal-progress" role="status"><span className="attendance-terminal-icon" aria-hidden="true">◷</span><h1>{state==="loading"?"Načítám zaměstnance…":"Ukládám docházku…"}</h1><p>Počkejte prosím.</p></section>}
 {state==="confirm"&&<section className="attendance-terminal-panel attendance-terminal-confirm"><button type="button" className="attendance-terminal-back" onClick={()=>{setAutoScanEnabled(true);start()}}>← Jiný čip</button><div className="attendance-terminal-identity"><span aria-hidden="true">✓</span><small>Rozpoznaný zaměstnanec</small><h1>{employeeName}</h1></div>{countdown}<h2>Vyberte docházkovou akci</h2><div className="attendance-terminal-actions">{(next[last]||["in"]).map(type=><button type="button" className={"attendance-terminal-action "+(type==="in"?"attendance-terminal-action-in":"")} key={type} onClick={()=>mark(type)}>{names[type]}<span aria-hidden="true">→</span></button>)}</div></section>}
 {state==="done"&&<section className="attendance-terminal-panel attendance-terminal-done"><span aria-hidden="true" className="attendance-terminal-check">✓</span><h1>{employeeName}</h1><p>{success}. Docházka byla úspěšně zaznamenána.</p>{countdown}<button type="button" className="attendance-terminal-primary" onClick={()=>{setAutoScanEnabled(true);start()}}>Další zaměstnanec</button></section>}
 {error&&<p className="attendance-terminal-error" role="alert">{error}</p>}
 </main></div>;
}
export function AttendanceCardWriter({supabase,profiles}){
 const [user,setUser]=useState(""),[error,setError]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false),[scanning,setScanning]=useState(false);
 const controller=useRef(null);
 useEffect(()=>()=>controller.current?.abort(),[]);
 const assign=async()=>{
  if(!user)return;
  if(!("NDEFReader" in window)){setError("Pro načtení čipu použijte Chrome na Androidu se zapnutým NFC. Čip musí podporovat čtení přes Web NFC.");return}
  controller.current?.abort();
  const c=new AbortController();controller.current=c;
  setError("");setMessage("Přiložte stávající NFC čip. Nic se na něj nezapisuje.");setBusy(true);setScanning(true);
  try{
   const reader=new window.NDEFReader();
   reader.onreading=async event=>{
    if(c.signal.aborted)return;
    c.abort();setScanning(false);
    const uid=String(event.serialNumber||"").replace(/[^0-9a-f]/gi,"").toUpperCase();
    if(uid.length<8||uid.length>32||uid.length%2!==0){setError("Tento čip neposkytuje čitelné sériové číslo. Zkuste kompatibilní NFC čip.");setBusy(false);return}
    const {error:e}=await supabase.rpc("isys_attendance_assign_uid",{p_user_id:user,p_uid:uid});
    if(e)setError(e.message);
    else setMessage("Čip byl přiřazen zaměstnanci. Obsah čipu se nezměnil. Můžete jej hned použít v docházkovém terminálu.");
    setBusy(false);
   };
   reader.onreadingerror=()=>{setError("Čip se nepodařilo načíst.");setScanning(false);setBusy(false)};
   await reader.scan({signal:c.signal});
  }catch(e){if(!c.signal.aborted)setError(e.message);setBusy(false);setScanning(false)}
 };
 const cancel=()=>{controller.current?.abort();controller.current=null;setBusy(false);setScanning(false);setMessage("");};
 return <section className="attendance-card"><h2>Přiřazení existujícího NFC čipu</h2><p>Vyberte zaměstnance a přiložte jeho stávající NFC čip. FOXA si zapamatuje sériové číslo čipu, aniž by na něj cokoliv zapisoval. Nové přiřazení nahradí předchozí docházkový čip zaměstnance.</p>
 <label>Zaměstnanec <select value={user} disabled={busy} onChange={e=>{setUser(e.target.value);setMessage("");setError("")}}><option value="">Vyberte zaměstnance</option>{profiles.map(p=><option value={p.id} key={p.id}>{p.display_name||p.full_name||p.email||"Neznámý zaměstnanec"}</option>)}</select></label>
 <div className="attendance-actions"><button type="button" className="primary" disabled={!user||busy} onClick={assign}>{scanning?"Čekám na NFC čip…":"Přiřadit přiložený NFC čip"}</button>{scanning&&<button type="button" className="secondarybutton" onClick={cancel}>Zrušit</button>}</div>
 <p className="attendance-payroll-note">Podporováno v Chrome na Androidu s Web NFC. Některé čipy (např. nekompatibilní přístupové karty) nelze přes prohlížeč načíst. Sériové číslo lze u některých čipů napodobit, proto není vhodné jako samostatný bezpečnostní prvek.</p>
 {message&&<p role="status" className="notice">{message}</p>}{error&&<p role="alert" className="error">{error}</p>}
 </section>;
}
