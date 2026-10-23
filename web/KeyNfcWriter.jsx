import React,{useEffect,useRef,useState} from "react";
export default function KeyNfcWriter({barcode}){
 const [open,setOpen]=useState(false),[phase,setPhase]=useState("ready"),[error,setError]=useState("");
 const abortRef=useRef(null);
 const stop=()=>{abortRef.current?.abort();abortRef.current=null};
 useEffect(()=>()=>stop(),[]);
 const close=()=>{stop();setOpen(false);setPhase("ready");setError("")};
 const startWrite=async()=>{
  if(!barcode){setError("Svazek nemá přidělený kód.");return}
  if(!("NDEFReader" in window)){setError("Zápis NFC je podporovaný v Chromu na Androidu. Zapněte NFC a otevřete FOXA v Chromu.");return}
  stop();setError("");setPhase("writing");
  const abort=new AbortController();abortRef.current=abort;
  try{
   const reader=new window.NDEFReader();
   await reader.write({records:[{recordType:"text",data:barcode}]},{signal:abort.signal});
   if(!abort.signal.aborted)setPhase("written");
  }catch(e){
   if(!abort.signal.aborted){setError(e?.name==="NotAllowedError"?"Přístup k NFC byl zamítnut. Povolte NFC a zkuste to znovu.":e?.name==="NotSupportedError"?"Čip není podporovaný nebo není zapisovatelný.":e?.message||"Zápis se nezdařil.");setPhase("ready")}
  }finally{if(abortRef.current===abort)abortRef.current=null}
 };
 const verify=async()=>{
  if(!("NDEFReader" in window))return;
  stop();setError("");setPhase("verifying");
  const abort=new AbortController();abortRef.current=abort;
  try{
   const reader=new window.NDEFReader();
   reader.onreading=event=>{
    if(abort.signal.aborted)return;
    let matched=false;
    for(const record of event.message.records){
     if(record.recordType!=="text")continue;
     try{if(new TextDecoder(record.encoding||"utf-8").decode(record.data).trim().toUpperCase()===String(barcode).toUpperCase())matched=true}catch{}
    }
    stop();setPhase(matched?"verified":"written");
    if(!matched)setError("Čip byl načten, ale jeho kód neodpovídá tomuto svazku. Zkuste zápis opakovat.");
   };
   reader.onreadingerror=()=>{setError("Čip se nepodařilo přečíst. Přiložte jej znovu.")};
   await reader.scan({signal:abort.signal});
  }catch(e){if(!abort.signal.aborted){setError(e?.message||"Kontrolní čtení se nezdařilo.");setPhase("written")}}
 };
 return <>
  <button type="button" className="secondarybutton" disabled={!barcode} onClick={()=>{setOpen(true);setPhase("ready");setError("")}}>Zapsat NFC čip</button>
  {open&&<div className="keys-nfc-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}>
   <section className="keys-nfc-dialog" role="dialog" aria-modal="true" aria-label="Programování NFC čipu">
    <div className="keys-nfc-dialog-head"><h2>Programování NFC čipu</h2><button type="button" onClick={close} aria-label="Zavřít">✕</button></div>
    <p>Na čip se zapíše kód svazku:</p><div className="keys-nfc-code">{barcode}</div>
    {phase==="ready"&&<><p>1. Zapněte NFC v telefonu. 2. Klepněte na <strong>Spustit zápis</strong>. 3. Přiložte čip k NFC anténě telefonu a podržte jej na místě.</p><p className="keys-nfc-hint">U většiny telefonů je anténa na zadní straně, často poblíž fotoaparátu. Čip přikládejte jednotlivě, mimo kovové předměty.</p></>}
    {phase==="writing"&&<div className="keys-nfc-progress" role="status"><span className="keys-nfc-pulse">◉</span><strong>Čekám na NFC čip…</strong><p>Podržte čip u zadní strany telefonu, dokud se neobjeví potvrzení.</p></div>}
    {phase==="written"&&<div className="keys-nfc-success" role="status"><strong>Čip byl zapsán.</strong><p>Pro jistotu ověřte jeho obsah kontrolním načtením.</p></div>}
    {phase==="verifying"&&<div className="keys-nfc-progress" role="status"><span className="keys-nfc-pulse">◉</span><strong>Kontrolní načtení</strong><p>Oddalte čip a znovu jej přiložte k telefonu.</p></div>}
    {phase==="verified"&&<div className="keys-nfc-success" role="status"><strong>✓ Čip je správně naprogramovaný a ověřený.</strong></div>}
    {error&&<p className="keys-nfc-error" role="alert">{error}</p>}
    <div className="keys-nfc-actions">
     {phase==="ready"&&<button type="button" className="primary" onClick={startWrite}>Spustit zápis</button>}
     {phase==="written"&&<><button type="button" className="primary" onClick={verify}>Ověřit čip</button><button type="button" className="secondarybutton" onClick={startWrite}>Zapsat znovu</button></>}
     {phase==="verified"&&<button type="button" className="primary" onClick={close}>Hotovo</button>}
     {(phase==="writing"||phase==="verifying")&&<button type="button" className="secondarybutton" onClick={()=>{stop();setPhase("ready")}}>Zrušit načítání</button>}
     <button type="button" className="secondarybutton" onClick={close}>Zavřít</button>
    </div>
   </section>
  </div>}
 </>;
}
