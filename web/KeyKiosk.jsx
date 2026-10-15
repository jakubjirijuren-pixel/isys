import React,{useEffect,useRef,useState} from "react";
import "./KeyKiosk.css";
const translations={
 cs:{borrow:"Výpůjčka",return:"Vrácení",back:"Zpět",scan:"Naskenujte čárový kód svazku",name:"Jméno a příjmení vypůjčitele",confirm:"Potvrdit výpůjčku",finish:"Potvrdit vrácení",successBorrow:"Svazek byl úspěšně vypůjčen.",successReturn:"Svazek byl úspěšně vrácen.",again:"Další operace",welcome:"Klíčárna iSYS",login:"Terminál používá přihlášený účet iSYS",missing:"Svazek nebyl nalezen.",busy:"Zpracovávám…",camera:"Skenovat kamerou",stopCamera:"Vypnout kameru",cameraHint:"Namiřte kameru na čárový kód svazku.",cameraError:"Kameru nelze spustit. Povolte přístup ke kameře nebo použijte čtečku."},
 en:{borrow:"Borrow",return:"Return",back:"Back",scan:"Scan the key bundle barcode",name:"Borrower's full name",confirm:"Confirm checkout",finish:"Confirm return",successBorrow:"Key bundle checked out.",successReturn:"Key bundle returned.",again:"New transaction",welcome:"iSYS Key Room",login:"Terminal uses the signed-in iSYS account",missing:"Bundle not found.",busy:"Processing…",camera:"Scan with camera",stopCamera:"Stop camera",cameraHint:"Point the camera at the key bundle barcode.",cameraError:"Camera unavailable. Allow camera access or use a scanner."},
 uk:{borrow:"Видача",return:"Повернення",back:"Назад",scan:"Скануйте штрихкод зв’язки ключів",name:"Ім’я та прізвище отримувача",confirm:"Підтвердити видачу",finish:"Підтвердити повернення",successBorrow:"Ключі видано.",successReturn:"Ключі повернуто.",again:"Нова операція",welcome:"Ключова кімната iSYS",login:"Термінал використовує поточний обліковий запис",missing:"Зв’язку не знайдено.",busy:"Обробка…",camera:"Сканувати камерою",stopCamera:"Вимкнути камеру",cameraHint:"Наведіть камеру на штрихкод зв’язки ключів.",cameraError:"Не вдалося запустити камеру. Дозвольте доступ або використайте сканер."}
};
export default function KeyKiosk({supabase,onExit}){
 const [lang,setLang]=useState("cs"),[mode,setMode]=useState(null),[barcode,setBarcode]=useState(""),[borrower,setBorrower]=useState(""),[bundle,setBundle]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[done,setDone]=useState(false);
 const scanBuffer=useRef(""),scanTimer=useRef(null),videoRef=useRef(null),cameraControls=useRef(null),scanLocked=useRef(false),[cameraOn,setCameraOn]=useState(false),t=translations[lang];
 const stopCamera=()=>{cameraControls.current?.stop?.();cameraControls.current=null;setCameraOn(false);if(videoRef.current?.srcObject){videoRef.current.srcObject.getTracks().forEach(track=>track.stop());videoRef.current.srcObject=null}};
 const startCamera=()=>{setError("");scanLocked.current=false;setCameraOn(true)};
 useEffect(()=>{
  if(!cameraOn||!mode||done||bundle)return;
  let cancelled=false;
  const start=async()=>{
   try{
    const {BrowserMultiFormatReader}=await import("@zxing/browser");
    if(cancelled)return;
    if(!navigator.mediaDevices?.getUserMedia)throw new Error("Camera API unavailable");
    const reader=new BrowserMultiFormatReader();
    const controls=await reader.decodeFromConstraints({audio:false,video:{facingMode:{ideal:"environment"}}},videoRef.current,(result)=>{
     if(!result||cancelled||scanLocked.current)return;
     scanLocked.current=true;
     const value=result.getText();
     controls?.stop();
     cameraControls.current=null;
     setCameraOn(false);
     lookup(value);
    });
    if(cancelled){controls.stop();return}
    cameraControls.current=controls;
   }catch(e){if(!cancelled){setError(t.cameraError+" "+(e?.message||""));setCameraOn(false)}}
  };
  start();
  return()=>{cancelled=true;cameraControls.current?.stop?.();cameraControls.current=null;if(videoRef.current?.srcObject){videoRef.current.srcObject.getTracks().forEach(track=>track.stop());videoRef.current.srcObject=null}};
 },[cameraOn,mode,done,bundle]);

 // USB/Bluetooth barcode readers act as hardware keyboards. Capture their input
 // globally without focusing a text field or opening the virtual keyboard.
 useEffect(()=>{
  if(!mode||done||busy||bundle||cameraOn)return;
  const handleScan=e=>{
   if(e.ctrlKey||e.altKey||e.metaKey||e.isComposing)return;
   const tag=e.target?.tagName?.toLowerCase();
   if(tag==="input"||tag==="textarea"||tag==="select"||e.target?.isContentEditable)return;
   if(e.key==="Enter"){
    const code=scanBuffer.current.trim();
    scanBuffer.current="";
    if(scanTimer.current)clearTimeout(scanTimer.current);
    if(code){e.preventDefault();lookup(code)}
   }else if(e.key.length===1){
    if(!/[a-z0-9-]/i.test(e.key))return;
    scanBuffer.current+=e.key;
    if(scanTimer.current)clearTimeout(scanTimer.current);
    scanTimer.current=setTimeout(()=>{scanBuffer.current=""},600);
   }
  };
  window.addEventListener("keydown",handleScan);
  return()=>{window.removeEventListener("keydown",handleScan);if(scanTimer.current)clearTimeout(scanTimer.current)};
 },[mode,done,busy,bundle,cameraOn,supabase,lang]);

 const reset=()=>{stopCamera();scanBuffer.current="";setMode(null);setBarcode("");setBorrower("");setBundle(null);setError("");setDone(false)};
 const lookup=async value=>{
  const code=value.trim().toUpperCase();stopCamera();setBarcode(code);setError("");setBundle(null);
  if(!code)return;
  const {data,error:e}=await supabase.from("keys").select("id,label,identifier,barcode,building_id").eq("barcode",code).maybeSingle();
  if(e){setError(e.message);return}
  if(!data){setError(t.missing);return}
  setBundle(data);
 };
 const submit=async e=>{
  e.preventDefault();if(!bundle||busy)return;
  setBusy(true);setError("");
  const fn=mode==="borrow"?"isys_kiosk_checkout":"isys_kiosk_return";
  const params=mode==="borrow"?{p_barcode:bundle.barcode,p_borrower:borrower.trim()}:{p_barcode:bundle.barcode};
  const {error:rpcError}=await supabase.rpc(fn,params);
  if(rpcError)setError(rpcError.message);else setDone(true);
  setBusy(false);
 };
 return <div className="key-kiosk" role="region" aria-label="Terminál klíčárny"><header className="key-kiosk-head"><strong>{t.welcome}</strong><div><label className="key-kiosk-lang"><span aria-label="Language">🌐</span><select aria-label="Jazyk terminálu" value={lang} onChange={e=>setLang(e.target.value)}><option value="cs">Čeština</option><option value="en">English</option><option value="uk">Українська</option></select></label><button type="button" className="key-kiosk-exit" onClick={onExit}>✕</button></div></header><main className="key-kiosk-main">
 {!mode?<div className="key-kiosk-choices"><button onClick={()=>setMode("borrow")}><span aria-hidden="true">↗</span>{t.borrow}</button><button onClick={()=>setMode("return")}><span aria-hidden="true">↙</span>{t.return}</button></div>:done?<div className="key-kiosk-panel key-kiosk-done"><span aria-hidden="true">✓</span><h1>{mode==="borrow"?t.successBorrow:t.successReturn}</h1><p>{bundle?.label} · {bundle?.barcode}</p><button onClick={reset}>{t.again}</button></div>:<form className="key-kiosk-panel" onSubmit={submit}><button type="button" className="key-kiosk-back" onClick={reset}>← {t.back}</button><h1>{mode==="borrow"?t.borrow:t.return}</h1><div className="key-kiosk-scan-prompt" role="status"><span aria-hidden="true">▥</span><strong>{t.scan}</strong><small>{barcode||"ISYS-…"}</small></div>{!bundle&&<><button type="button" className="key-kiosk-camera-toggle" onClick={()=>cameraOn?stopCamera():startCamera()}>{cameraOn?t.stopCamera:t.camera}</button>{cameraOn&&<div className="key-kiosk-camera"><video ref={videoRef} autoPlay muted playsInline aria-label={t.cameraHint}/><p>{t.cameraHint}</p></div>}</>}{bundle&&<div className="key-kiosk-bundle"><strong>{bundle.label}</strong><small>{bundle.identifier||bundle.barcode}</small></div>}{mode==="borrow"&&bundle&&<label>{t.name}<input autoComplete="name" required minLength={2} maxLength={180} value={borrower} onChange={e=>setBorrower(e.target.value)}/></label>}{error&&<p role="alert" className="key-kiosk-error">{error}</p>}<button className="key-kiosk-confirm" type="submit" disabled={!bundle||busy||(mode==="borrow"&&borrower.trim().length<2)}>{busy?t.busy:mode==="borrow"?t.confirm:t.finish}</button></form>}
 </main></div>;
}
