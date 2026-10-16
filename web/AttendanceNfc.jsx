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
    const value=extract(event.message);
    stop();setState("loading");
    if(!value){setError("Na čipu není docházkový identifikátor iSYS. Použijte čip vydaný v modulu Docházka.");setState("idle");return}
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
 const [user,setUser]=useState(""),[token,setToken]=useState(""),[error,setError]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 const issue=async()=>{
  if(!user)return;setBusy(true);setError("");setMessage("");
  const {data,error:e}=await supabase.rpc("isys_attendance_issue_card",{p_user_id:user});
  if(e)setError(e.message);else{setToken(data);setMessage("Nový čipový identifikátor byl vydán. Předchozí čip tohoto zaměstnance už nebude platný.")}
  setBusy(false);
 };
 const write=async()=>{
  if(!("NDEFReader" in window)){setError("Zápis NFC vyžaduje Chrome na Androidu.");return}
  setBusy(true);setError("");setMessage("Přiložte zapisovatelný NFC čip.");
  try{await new window.NDEFReader().write({records:[{recordType:"text",data:token}]});setMessage("NFC čip byl zapsán. Vyzkoušejte jej v terminálu.");setToken("")}catch(e){setError(e.message)}finally{setBusy(false)}
 };
 return <section className="attendance-card"><h2>Správa docházkových NFC čipů</h2><p>Vydání nového identifikátoru zneplatní předchozí čip zaměstnance. Identifikátor je tajný přístupový údaj; nesdílejte jej.</p><label>Zaměstnanec <select value={user} onChange={e=>{setUser(e.target.value);setToken("");setMessage("");setError("")}}><option value="">Vyberte zaměstnance</option>{profiles.map(p=><option value={p.id} key={p.id}>{p.display_name||p.full_name||p.email||"Neznámý zaměstnanec"}</option>)}</select></label><div className="attendance-actions"><button type="button" className="primary" disabled={!user||busy} onClick={issue}>Vydat nový NFC čip</button>{token&&<button type="button" className="primary" disabled={busy} onClick={write}>Zapsat identifikátor na NFC</button>}</div>{token&&<p>Čeká na zápis do NFC. Pokud zápis selže, zkuste jej opakovat bez vydání nového identifikátoru.</p>}{message&&<p role="status">{message}</p>}{error&&<p role="alert" className="error">{error}</p>}</section>;
}
