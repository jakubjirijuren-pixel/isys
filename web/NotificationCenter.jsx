import React,{useEffect,useRef,useState} from "react";
import "./notifications.css";
import {foxaReleases} from "./foxaReleases.js";

export default function NotificationCenter({supabase,userId,onNavigate,onOpenChangelog}){
 const [open,setOpen]=useState(false),[items,setItems]=useState([]),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const [permission,setPermission]=useState(()=>typeof Notification==="undefined"?"unsupported":Notification.permission);
 const panel=useRef(null),initialized=useRef(false);
 const [readReleaseIds,setReadReleaseIds]=useState([]);
 const refreshReleases=async()=>{if(!userId)return;const {data,error:e}=await supabase.from("foxa_changelog_reads").select("release_id").eq("user_id",userId);if(e)setError(e.message);else setReadReleaseIds((data||[]).map(x=>x.release_id))};
 useEffect(()=>{refreshReleases();const sync=()=>refreshReleases();window.addEventListener("foxa-changelog-updated",sync);window.addEventListener("focus",sync);return()=>{window.removeEventListener("foxa-changelog-updated",sync);window.removeEventListener("focus",sync)}},[supabase,userId]);
 const refresh=async()=>{const {data,error:e}=await supabase.from("notifications").select("id,title,body,module,created_at,read_at").eq("user_id",userId).order("created_at",{ascending:false}).limit(100);if(e)setError(e.message);else{setItems(data||[]);setError("")}};
 useEffect(()=>{if(!userId)return;initialized.current=false;refresh();const channel=supabase.channel("isys-notifications-"+userId).on("postgres_changes",{event:"INSERT",schema:"public",table:"notifications",filter:"user_id=eq."+userId},payload=>{setItems(old=>[payload.new,...old.filter(x=>x.id!==payload.new.id)].slice(0,100))}).on("postgres_changes",{event:"UPDATE",schema:"public",table:"notifications",filter:"user_id=eq."+userId},payload=>setItems(old=>old.map(x=>x.id===payload.new.id?payload.new:x))).subscribe();const interval=window.setInterval(()=>{if(document.visibilityState==="visible")refresh()},15000);const onFocus=()=>refresh();const onVisible=()=>{if(document.visibilityState==="visible")refresh()};window.addEventListener("focus",onFocus);document.addEventListener("visibilitychange",onVisible);initialized.current=true;return()=>{initialized.current=false;window.clearInterval(interval);window.removeEventListener("focus",onFocus);document.removeEventListener("visibilitychange",onVisible);supabase.removeChannel(channel)}},[supabase,userId]);
 useEffect(()=>{if(!open)return;const onPointer=e=>{if(!panel.current?.contains(e.target))setOpen(false)};const onKey=e=>{if(e.key==="Escape")setOpen(false)};document.addEventListener("pointerdown",onPointer);document.addEventListener("keydown",onKey);return()=>{document.removeEventListener("pointerdown",onPointer);document.removeEventListener("keydown",onKey)}},[open]);
 const markRead=async ids=>{if(!ids.length)return;setBusy(true);const {error:e}=await supabase.from("notifications").update({read_at:new Date().toISOString()}).eq("user_id",userId).in("id",ids);if(e)setError(e.message);else setItems(old=>old.map(x=>ids.includes(x.id)?{...x,read_at:x.read_at||new Date().toISOString()}:x));setBusy(false)};
 const deleteAll=async()=>{
  if(busy||!items.length||!userId)return;
  if(!window.confirm("Opravdu smazat všechna oznámení? Tuto akci nelze vrátit zpět."))return;
  setBusy(true);setError("");
  try{
   const {error:e}=await supabase.rpc("isys_delete_my_notifications");
   if(e)throw e;
   await refresh();
  }catch(e){setError("Oznámení se nepodařilo smazat: "+e.message)}
  finally{setBusy(false)}
 };
 const [pushStatus,setPushStatus]=useState(""),[pushEnabled,setPushEnabled]=useState(false),[pushBusy,setPushBusy]=useState(false);
 const supported=typeof window!=="undefined"&&"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window;
 const pushEndpoint=supabase.supabaseUrl+"/functions/v1/isys-web-push";
 const bytes=key=>{const padding="=".repeat((4-key.length%4)%4);const raw=atob((key+padding).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from(raw,c=>c.charCodeAt(0))};
 useEffect(()=>{if(!supported||!userId)return;let live=true;
  (async()=>{try{
   const reg=await navigator.serviceWorker.ready;
   const sub=await reg.pushManager.getSubscription();
   if(!live)return;
   if(!sub){setPushEnabled(false);return}
   const {data,error:e}=await supabase.from("push_subscriptions").select("id").eq("user_id",userId).eq("endpoint",sub.endpoint).maybeSingle();
   if(!live)return;
   setPushEnabled(!e&&!!data&&Notification.permission==="granted");
   if(e)setPushStatus("Registraci push nelze ověřit: "+e.message);
   else if(!data)setPushStatus("Zařízení není přiřazeno k tomuto účtu. Klikni na Zapnout push pro opětovnou registraci.");
  }catch(e){if(live){setPushEnabled(false);setPushStatus("Kontrola push selhala: "+(e.message||e))}}})();
  return()=>{live=false}
 },[supabase,userId]);
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
   const existing=await reg.pushManager.getSubscription();
   let subscription=existing;
   if(existing){
    const currentKey=existing.options?.applicationServerKey;
    const expected=bytes(publicKey);
    const actual=currentKey?new Uint8Array(currentKey):null;
    if(!actual||actual.length!==expected.length||actual.some((value,i)=>value!==expected[i])){
     await existing.unsubscribe();
     subscription=null;
    }
   }
   if(!subscription)subscription=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes(publicKey)});
   const register=async sub=>{
    const keys=sub.toJSON().keys;
    return supabase.rpc("isys_register_push_subscription",{p_endpoint:sub.endpoint,p_p256dh:keys?.p256dh,p_auth:keys?.auth});
   };
   let {error:e}=await register(subscription);
   if(e&&e.code==="P0001"){
    // An old browser endpoint may belong to a different account with rotated keys.
    // Never take it over: unsubscribe locally and request a fresh endpoint.
    await subscription.unsubscribe();
    subscription=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes(publicKey)});
    ({error:e}=await register(subscription));
   }
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
 const releaseItems=foxaReleases.map(r=>({id:"release:"+r.id,releaseId:r.id,title:"Aktualizace systému FOXA: "+r.title,body:r.changes.map(x=>x.area).join(" · "),created_at:r.date+"T12:00:00",read_at:readReleaseIds.includes(r.id)?r.date:null,isRelease:true}));
 const allItems=[...items,...releaseItems].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
 const unread=allItems.filter(x=>!x.read_at);
 const markReleaseRead=async ids=>{if(!ids.length)return true;const {error:e}=await supabase.from("foxa_changelog_reads").upsert(ids.map(release_id=>({user_id:userId,release_id})),{onConflict:"user_id,release_id",ignoreDuplicates:true});if(e){setError(e.message);return false}setReadReleaseIds(old=>[...new Set([...old,...ids])]);window.dispatchEvent(new Event("foxa-changelog-updated"));return true};
 const markAllRead=async()=>{setBusy(true);try{await markRead(unread.filter(x=>!x.isRelease).map(x=>x.id));await markReleaseRead(unread.filter(x=>x.isRelease).map(x=>x.releaseId))}finally{setBusy(false)}};
 const allow=async()=>{if(typeof Notification==="undefined")return;try{const p=await Notification.requestPermission();setPermission(p)}catch{setError("Prohlížeč nepovolil oznámení.")}};
 return <div className="notification-root" ref={panel}><button type="button" className="notification-bell" aria-label={"Oznámení, nepřečtených: "+unread.length} aria-expanded={open} onClick={()=>setOpen(v=>!v)}><span aria-hidden="true">♧</span>{unread.length>0&&<span className="notification-badge">{unread.length>99?"99+":unread.length}</span>}</button>{open&&<div className="notification-panel"><div className="notification-heading"><strong>Centrum oznámení</strong><button type="button" className="notification-close" onClick={()=>setOpen(false)} aria-label="Zavřít oznámení">×</button></div><div className="notification-toolbar"><span>{unread.length} nepřečtených</span><div className="notification-toolbar-actions"><button type="button" disabled={busy||!unread.length} onClick={markAllRead}>Označit vše jako přečtené</button><button type="button" className="notification-delete-all" disabled={busy||!items.length} onClick={deleteAll}>{busy?"Pracuji…":"Smazat všechna"}</button></div></div>{error&&<p className="notification-error" role="alert">{error}</p>}{supported&&<div className="notification-permission"><span>{pushEnabled?"Push na tomto zařízení: registrováno k účtu":"Push na tomto zařízení: vypnuto"}</span><button type="button" disabled={pushBusy} onClick={pushEnabled?disablePush:enablePush}>{pushBusy?"Čekej…":pushEnabled?"Vypnout push":"Zapnout push"}</button></div>}{pushStatus&&<p className="notification-hint" role="status">{pushStatus}</p>}{permission==="default"&&<div className="notification-permission"><span>Zapnout oznámení při otevřené aplikaci na podporovaných zařízeních?</span><button type="button" onClick={allow}>Povolit</button></div>}{permission==="denied"&&<p className="notification-hint">Oznámení prohlížeče jsou zakázaná v nastavení zařízení.</p>}<div className="notification-items">{allItems.length?allItems.map(n=><button type="button" key={n.id} className={"notification-item"+(!n.read_at?" unread":"")} onClick={async()=>{if(n.isRelease){setOpen(false);onOpenChangelog?.();return}if(!n.read_at)await markRead([n.id]);if(n.module){onNavigate(n.module);setOpen(false)}}}><span className="notification-item-title">{!n.read_at&&<i aria-hidden="true"/>}{n.title}</span><span className="notification-item-body">{n.body}</span><time>{new Date(n.created_at).toLocaleString("cs-CZ",{dateStyle:"short",timeStyle:"short"})}</time></button>):<p className="notification-empty">Zatím nemáš žádná oznámení.</p>}</div></div>}</div>;
}
