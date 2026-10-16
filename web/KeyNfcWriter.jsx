import React,{useEffect,useRef,useState} from "react";
export default function KeyNfcWriter({barcode}){
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 const abortRef=useRef(null);
 useEffect(()=>()=>abortRef.current?.abort(),[]);
 async function writeTag(){
  if(!barcode)return setMessage("Svazek nemá kód.");
  if(!("NDEFReader" in window))return setMessage("Zápis NFC vyžaduje Chrome na Androidu s NFC.");
  const controller=new AbortController();
  abortRef.current=controller;
  setBusy(true);
  setMessage("Přiložte NFC čip k zařízení.");
  try{
   const reader=new window.NDEFReader();
   await reader.write({records:[{recordType:"text",data:barcode}]},{signal:controller.signal});
   if(!controller.signal.aborted)setMessage("Úspěšně zapsáno: "+barcode);
  }catch(err){
   if(!controller.signal.aborted)setMessage("Zápis se nezdařil: "+err.message);
  }finally{
   if(abortRef.current===controller)abortRef.current=null;
   setBusy(false);
  }
 }
 return <div className="keys-nfc-writer">
  <button type="button" className="secondarybutton" disabled={busy||!barcode} onClick={writeTag}>{busy?"Čekám na čip…":"Zapsat NFC čip"}</button>
  {busy&&<button type="button" className="secondarybutton" onClick={()=>abortRef.current?.abort()}>Zrušit</button>}
  {message&&<small role="status">{message}</small>}
 </div>;
}
