import React,{useEffect,useRef,useState} from "react";
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
 const controller=useRef(null);
 const stop=()=>{controller.current?.abort();controller.current=null};
 useEffect(()=>()=>stop(),[]);
 const start=async()=>{
  stop();setToken("");setPerson(null);setError("");setSuccess("");
  if(!("NDEFReader" in window)){setError("NFC čtení vyžaduje Chrome na Androidu a zapnuté NFC.");return}
  const c=new AbortController();controller.current=c;setState("scanning");
  try{
   const reader=new window.NDEFReader();
   reader.onreading=async event=>{
    if(c.signal.aborted)return;
    const serial=String(event.serialNumber||"").replace(/[^0-9a-f]/gi,"").toUpperCase();
    const value=serial.length>=8&&serial.length<=32&&serial.length%2===0?"UID:"+serial:extract(event.message);
    stop();setState("loading");
    if(!value){setError("Nelze přečíst sériové číslo čipu. Web NFC podporuje jen některé typy NFC čipů; zkuste jiný čip nebo Android s Chrome.");setState("idle");return}
    const {data,error:e}=await supabase.rpc("isys_attendance_card_status",{p_token:value});
    if(e||!data?.length){setError(e?.message||"Čip není přiřazen zaměstnanci.");setState("idle");return}
    setToken(value);setPerson(data[0].user_id);setLast(data[0].last_event||"out");setState("confirm");
   };
   reader.onreadingerror=()=>setError("NFC čip nelze přečíst. Zkuste to znovu.");
   await reader.scan({signal:c.signal});
  }catch(e){if(!c.signal.aborted){setError(e.message);setState("idle")}}
 };
 const mark=async type=>{
  setState("saving");setError("");
  const {error:e}=await supabase.rpc("isys_attendance_card_mark",{p_token:token,p_type:type});
  if(e){setError(e.message);setState("confirm");return}
  setSuccess("Zaznamenáno: "+names[type]);setState("done");setToken("");onSaved?.();
 };
 const label=profiles.find(p=>p.id===person);
 return <div className="attendance-kiosk-overlay"><section className="attendance-kiosk" role="dialog" aria-modal="true" aria-label="Docházkový terminál"><div className="attendance-kiosk-head"><h2>Docházkový terminál</h2><button onClick={()=>{stop();onClose()}} type="button">Zavřít ✕</button></div>
 {state==="scanning"&&<div className="attendance-kiosk-prompt"><strong>Přiložte osobní NFC čip</strong><p>Podržte čip u zadní strany zařízení.</p></div>}
 {state==="confirm"&&<><h3>{label?.display_name||label?.full_name||label?.email||"Zaměstnanec"}</h3><p>Vyberte akci pro zaznamenání docházky:</p><div className="attendance-actions">{(next[last]||["in"]).map(type=><button type="button" className="primary" key={type} onClick={()=>mark(type)}>{names[type]}</button>)}</div></>}
 {state==="done"&&<div className="attendance-kiosk-prompt"><strong>✓ {success}</strong></div>}
 {state==="loading"||state==="saving"?<p>Pracuji…</p>:null}
 {error&&<p className="error" role="alert">{error}</p>}
 <div className="attendance-actions">{state!=="scanning"&&state!=="saving"&&state!=="loading"&&<button className="secondarybutton" type="button" onClick={start}>{state==="idle"?"Načíst NFC čip":"Další čip"}</button>}{state==="scanning"&&<button className="secondarybutton" onClick={()=>{stop();setState("idle")}}>Zrušit</button>}</div>
 </section></div>;
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
 return <section className="attendance-card"><h2>Přiřazení existujícího NFC čipu</h2><p>Vyberte zaměstnance a přiložte jeho stávající NFC čip. iSYS si zapamatuje sériové číslo čipu, aniž by na něj cokoliv zapisoval. Nové přiřazení nahradí předchozí docházkový čip zaměstnance.</p>
 <label>Zaměstnanec <select value={user} disabled={busy} onChange={e=>{setUser(e.target.value);setMessage("");setError("")}}><option value="">Vyberte zaměstnance</option>{profiles.map(p=><option value={p.id} key={p.id}>{p.display_name||p.full_name||p.email||"Neznámý zaměstnanec"}</option>)}</select></label>
 <div className="attendance-actions"><button type="button" className="primary" disabled={!user||busy} onClick={assign}>{scanning?"Čekám na NFC čip…":"Přiřadit přiložený NFC čip"}</button>{scanning&&<button type="button" className="secondarybutton" onClick={cancel}>Zrušit</button>}</div>
 <p className="attendance-payroll-note">Podporováno v Chrome na Androidu s Web NFC. Některé čipy (např. nekompatibilní přístupové karty) nelze přes prohlížeč načíst. Sériové číslo lze u některých čipů napodobit, proto není vhodné jako samostatný bezpečnostní prvek.</p>
 {message&&<p role="status" className="notice">{message}</p>}{error&&<p role="alert" className="error">{error}</p>}
 </section>;
}
