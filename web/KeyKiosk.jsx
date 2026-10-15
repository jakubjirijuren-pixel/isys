import React,{useEffect,useRef,useState} from "react";
import "./KeyKiosk.css";
const translations={
 cs:{borrow:"Výpůjčka",return:"Vrácení",back:"Zpět",scan:"Naskenujte čárový kód svazku",name:"Jméno a příjmení vypůjčitele",confirm:"Potvrdit výpůjčku",finish:"Potvrdit vrácení",successBorrow:"Svazek byl úspěšně vypůjčen.",successReturn:"Svazek byl úspěšně vrácen.",again:"Další operace",welcome:"Klíčárna iSYS",login:"Terminál používá přihlášený účet iSYS",missing:"Svazek nebyl nalezen.",busy:"Zpracovávám…"},
 en:{borrow:"Borrow",return:"Return",back:"Back",scan:"Scan the key bundle barcode",name:"Borrower's full name",confirm:"Confirm checkout",finish:"Confirm return",successBorrow:"Key bundle checked out.",successReturn:"Key bundle returned.",again:"New transaction",welcome:"iSYS Key Room",login:"Terminal uses the signed-in iSYS account",missing:"Bundle not found.",busy:"Processing…"},
 uk:{borrow:"Видача",return:"Повернення",back:"Назад",scan:"Скануйте штрихкод зв’язки ключів",name:"Ім’я та прізвище отримувача",confirm:"Підтвердити видачу",finish:"Підтвердити повернення",successBorrow:"Ключі видано.",successReturn:"Ключі повернуто.",again:"Нова операція",welcome:"Ключова кімната iSYS",login:"Термінал використовує поточний обліковий запис",missing:"Зв’язку не знайдено.",busy:"Обробка…"}
};
export default function KeyKiosk({supabase,onExit}){
 const [lang,setLang]=useState("cs"),[mode,setMode]=useState(null),[barcode,setBarcode]=useState(""),[borrower,setBorrower]=useState(""),[bundle,setBundle]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[done,setDone]=useState(false);
 const input=useRef(null),t=translations[lang];
 useEffect(()=>{if(mode&&!done)input.current?.focus()},[mode,done]);
 const reset=()=>{setMode(null);setBarcode("");setBorrower("");setBundle(null);setError("");setDone(false)};
 const lookup=async value=>{
  const code=value.trim().toUpperCase();setBarcode(code);setError("");setBundle(null);
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
  const {error:e}=await supabase.rpc(fn,params);
  if(e)setError(e.message);else setDone(true);
  setBusy(false);
 };
 return <div className="key-kiosk" role="region" aria-label="Terminál klíčárny"><header className="key-kiosk-head"><strong>{t.welcome}</strong><div><label className="key-kiosk-lang"><span aria-label="Language">🌐</span><select aria-label="Jazyk terminálu" value={lang} onChange={e=>setLang(e.target.value)}><option value="cs">Čeština</option><option value="en">English</option><option value="uk">Українська</option></select></label><button type="button" className="key-kiosk-exit" onClick={onExit}>✕</button></div></header><main className="key-kiosk-main">
 {!mode?<div className="key-kiosk-choices"><button onClick={()=>setMode("borrow")}><span aria-hidden="true">↗</span>{t.borrow}</button><button onClick={()=>setMode("return")}><span aria-hidden="true">↙</span>{t.return}</button></div>:done?<div className="key-kiosk-panel key-kiosk-done"><span aria-hidden="true">✓</span><h1>{mode==="borrow"?t.successBorrow:t.successReturn}</h1><p>{bundle?.label} · {bundle?.barcode}</p><button onClick={reset}>{t.again}</button></div>:<form className="key-kiosk-panel" onSubmit={submit}><button type="button" className="key-kiosk-back" onClick={reset}>← {t.back}</button><h1>{mode==="borrow"?t.borrow:t.return}</h1><label>{t.scan}<input ref={input} autoComplete="off" inputMode="text" value={barcode} onChange={e=>{setBarcode(e.target.value);setBundle(null)}} onKeyDown={e=>{if(e.key==="Enter"&&!bundle){e.preventDefault();lookup(barcode)}}} placeholder="ISYS-…" required/></label><button type="button" className="key-kiosk-lookup" onClick={()=>lookup(barcode)}>{t.scan} →</button>{bundle&&<div className="key-kiosk-bundle"><strong>{bundle.label}</strong><small>{bundle.identifier||bundle.barcode}</small></div>}{mode==="borrow"&&bundle&&<label>{t.name}<input autoComplete="name" required minLength={2} maxLength={180} value={borrower} onChange={e=>setBorrower(e.target.value)}/></label>}{error&&<p role="alert" className="key-kiosk-error">{error}</p>}<button className="key-kiosk-confirm" type="submit" disabled={!bundle||busy||(mode==="borrow"&&borrower.trim().length<2)}>{busy?t.busy:mode==="borrow"?t.confirm:t.finish}</button></form>}
 </main></div>;
}
