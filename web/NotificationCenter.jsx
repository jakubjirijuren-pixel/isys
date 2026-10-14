import React,{useEffect,useRef,useState} from "react";
import "./notifications.css";

export default function NotificationCenter({supabase,userId,onNavigate}){
 const [open,setOpen]=useState(false),[items,setItems]=useState([]),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const [permission,setPermission]=useState(()=>typeof Notification==="undefined"?"unsupported":Notification.permission);
 const panel=useRef(null),initialized=useRef(false);
 const refresh=async()=>{const {data,error:e}=await supabase.from("notifications").select("id,title,body,module,created_at,read_at").eq("user_id",userId).order("created_at",{ascending:false}).limit(100);if(e)setError(e.message);else{setItems(data||[]);setError("")}};
 useEffect(()=>{if(!userId)return;initialized.current=false;refresh();const channel=supabase.channel("isys-notifications-"+userId).on("postgres_changes",{event:"INSERT",schema:"public",table:"notifications",filter:"user_id=eq."+userId},payload=>{setItems(old=>[payload.new,...old.filter(x=>x.id!==payload.new.id)].slice(0,100));if(initialized.current&&typeof Notification!=="undefined"&&Notification.permission==="granted"&&document.visibilityState!=="visible"){try{const n=new Notification(payload.new.title,{body:payload.new.body||"",tag:payload.new.id});n.onclick=()=>{window.focus();setOpen(true);n.close()}}catch{}}}).on("postgres_changes",{event:"UPDATE",schema:"public",table:"notifications",filter:"user_id=eq."+userId},payload=>setItems(old=>old.map(x=>x.id===payload.new.id?payload.new:x))).subscribe();initialized.current=true;return()=>{initialized.current=false;supabase.removeChannel(channel)}},[supabase,userId]);
 useEffect(()=>{if(!open)return;const onPointer=e=>{if(!panel.current?.contains(e.target))setOpen(false)};const onKey=e=>{if(e.key==="Escape")setOpen(false)};document.addEventListener("pointerdown",onPointer);document.addEventListener("keydown",onKey);return()=>{document.removeEventListener("pointerdown",onPointer);document.removeEventListener("keydown",onKey)}},[open]);
 const markRead=async ids=>{if(!ids.length)return;setBusy(true);const {error:e}=await supabase.from("notifications").update({read_at:new Date().toISOString()}).eq("user_id",userId).in("id",ids);if(e)setError(e.message);else setItems(old=>old.map(x=>ids.includes(x.id)?{...x,read_at:x.read_at||new Date().toISOString()}:x));setBusy(false)};
 const [pushStatus,setPushStatus]=useState(""),[pushEnabled,setPushEnabled]=useState(false),[pushBusy,setPushBusy]=useState(false);
 const supported=typeof window!=="undefined"&&"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window;
 const pushEndpoint=supabase.supabaseUrl+"/functions/v1/isys-web-push";
 const bytes=key=>{const padding="=".repeat((4-key.length%4)%4);const raw=atob((key+padding).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from(raw,c=>c.charCodeAt(0))};
 useEffect(()=>{if(!supported||!userId)return;let live=true;navigator.serviceWorker.ready.then(reg=>reg.pushManager.getSubscription()).then(sub=>{if(live)setPushEnabled(!!sub)}).catch(()=>{});return()=>{live=false}},[userId]);
 const enablePush=async()=>{
  if(!supported)return;
  setPushBusy(true);setPushStatus("");
  try{
   const permission=await Notification.requestPermission();setPermission(permission);
   if(permission!=="granted")throw Error("Povol oznámení v nastavení telefonu nebo prohlížeče.");
   const reg=await navigator.serviceWorker.ready;
   const response=await fetch(pushEndpoint);
   if(!response.ok)throw Error("Push server není dostupný. Zkontroluj nasazení Edge Function.");
   const {publicKey}=await response.json();
   if(!publicKey)throw Error("Chybí veřejný VAPID klíč.");
   const subscription=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes(publicKey)});
   const data=subscription.toJSON();
   const {error:e}=await supabase.from("push_subscriptions").upsert({user_id:userId,endpoint:subscription.endpoint,p256dh:data.keys?.p256dh,auth:data.keys?.auth,updated_at:new Date().toISOString()},{onConflict:"endpoint"});
   if(e)throw Error(e.message);
   setPushEnabled(true);setPushStatus("Push oznámení jsou na tomto zařízení aktivní.");
  }catch(e){setPushStatus(e.message||"Push oznámení se nepodařilo aktivovat.")}finally{setPushBusy(false)}
 };
 const disablePush=async()=>{
  setPushBusy(true);setPushStatus("");
  try{
   const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();
   if(sub){const {error:e}=await supabase.from("push_subscriptions").delete().eq("user_id",userId).eq("endpoint",sub.endpoint);if(e)throw e;await sub.unsubscribe()}
   setPushEnabled(false);setPushStatus("Push oznámení na tomto zařízení byla vypnuta.");
  }catch(e){setPushStatus(e.message||"Nepodařilo se vypnout push oznámení.")}finally{setPushBusy(false)}
 };
 const unread=items.filter(x=>!x.read_at);
 const allow=async()=>{if(typeof Notification==="undefined")return;try{const p=await Notification.requestPermission();setPermission(p)}catch{setError("Prohlížeč nepovolil oznámení.")}};
 return <div className="notification-root" ref={panel}><button type="button" className="notification-bell" aria-label={"Oznámení, nepřečtených: "+unread.length} aria-expanded={open} onClick={()=>setOpen(v=>!v)}><span aria-hidden="true">♧</span>{unread.length>0&&<span className="notification-badge">{unread.length>99?"99+":unread.length}</span>}</button>{open&&<div className="notification-panel"><div className="notification-heading"><strong>Centrum oznámení</strong><button type="button" className="notification-close" onClick={()=>setOpen(false)} aria-label="Zavřít oznámení">×</button></div><div className="notification-toolbar"><span>{unread.length} nepřečtených</span><button type="button" disabled={busy||!unread.length} onClick={()=>markRead(unread.map(x=>x.id))}>Označit vše jako přečtené</button></div>{error&&<p className="notification-error" role="alert">{error}</p>}{supported&&<div className="notification-permission"><span>{pushEnabled?"Push na tomto zařízení: zapnuto":"Push na tomto zařízení: vypnuto"}</span><button type="button" disabled={pushBusy} onClick={pushEnabled?disablePush:enablePush}>{pushBusy?"Čekej…":pushEnabled?"Vypnout push":"Zapnout push"}</button></div>}{pushStatus&&<p className="notification-hint" role="status">{pushStatus}</p>}{permission==="default"&&<div className="notification-permission"><span>Zapnout oznámení při otevřené aplikaci na podporovaných zařízeních?</span><button type="button" onClick={allow}>Povolit</button></div>}{permission==="denied"&&<p className="notification-hint">Oznámení prohlížeče jsou zakázaná v nastavení zařízení.</p>}<div className="notification-items">{items.length?items.map(n=><button type="button" key={n.id} className={"notification-item"+(!n.read_at?" unread":"")} onClick={async()=>{if(!n.read_at)await markRead([n.id]);if(n.module){onNavigate(n.module);setOpen(false)}}}><span className="notification-item-title">{!n.read_at&&<i aria-hidden="true"/>}{n.title}</span><span className="notification-item-body">{n.body}</span><time>{new Date(n.created_at).toLocaleString("cs-CZ",{dateStyle:"short",timeStyle:"short"})}</time></button>):<p className="notification-empty">Zatím nemáš žádná oznámení.</p>}</div><div className="notification-footnote">Mobilní push fungují po povolení a nastavení serveru, i když je aplikace zavřená.</div></div>}</div>;
}
