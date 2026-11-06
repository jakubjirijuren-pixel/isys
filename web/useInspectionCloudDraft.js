import {useEffect,useRef,useState} from "react";

// One private draft per authenticated user and inspection type.
// Keep local recovery as fallback when the device is offline.
export default function useInspectionCloudDraft({supabase,kind,data,setData,localKey,validate,normalize}){
 const [status,setStatus]=useState("Načítám uložený koncept…");
 const ready=useRef(false);
 const skip=useRef(false);
 const paused=useRef(false);
 const pending=useRef(Promise.resolve());
 const revision=useRef(0);
 const latest=useRef(data);
 const dirty=useRef(false);
 const pendingKey=localKey+"-pending-sync";
 latest.current=data;
 const user=useRef(null);
 const localStampKey=localKey+"-updated-at";
 const dirtyKey=localKey+"-pending-sync";
 useEffect(()=>{
  let active=true;
  ready.current=false;
  const init=async()=>{
   let local=null,localTime=0;
   try{dirty.current=localStorage.getItem(dirtyKey)==="1"}catch{}
   try{dirty.current=localStorage.getItem(pendingKey)==="1"}catch{}
   try{const raw=localStorage.getItem(localKey);if(raw){local=JSON.parse(raw);localTime=Number(localStorage.getItem(localStampKey)||0);if(!validate(local))local=null}}catch{}
   try{
    const {data:auth,error:authError}=await supabase.auth.getUser();
    if(authError||!auth?.user?.id)throw authError||new Error("Nejste přihlášeni.");
    user.current=auth.user.id;
    const {data:remote,error}=await supabase.from("isys_inspection_drafts").select("content,updated_at").eq("user_id",auth.user.id).eq("kind",kind).maybeSingle();
    if(error)throw error;
    if(!active)return;
    const cloud=remote?.content&&validate(remote.content)?remote.content:null;
    const cloudTime=remote?.updated_at?new Date(remote.updated_at).getTime():0;
    const chosen=local&&(dirty.current||localTime>cloudTime)?local:cloud||local;
    if(chosen)setData(normalize(chosen));
    setStatus(chosen?"Rozpracovaný koncept obnoven":"Automatické ukládání do Supabase aktivní");
   }catch(e){
    if(!active)return;
    if(local)setData(normalize(local));
    setStatus("Supabase není dostupná; používá se místní záloha");
   }finally{if(active){ready.current=true}}
  };
  init();
  return()=>{active=false;ready.current=false};
 },[supabase,kind,localKey]);
 useEffect(()=>{
  if(!ready.current)return;
  if(skip.current){skip.current=false;return}
  if(paused.current)paused.current=false;
  const current=++revision.current;
  setStatus("Ukládání do Supabase…");
  const timer=setTimeout(async()=>{
   if(current!==revision.current)return;
   const snapshot=latest.current;
   const time=Date.now();
   try{
    localStorage.setItem(localKey,JSON.stringify(snapshot));
    localStorage.setItem(localStampKey,String(time));
   }catch{
    try{localStorage.setItem(localKey,JSON.stringify({...snapshot,photoFiles:[]}));localStorage.setItem(localStampKey,String(time))}catch{}
   }
   try{
    if(!navigator.onLine)throw new Error("offline");
    const id=user.current;
    if(!id)throw new Error("Chybí přihlášení.");
    const request=supabase.from("isys_inspection_drafts").upsert({user_id:id,kind,content:snapshot,updated_at:new Date(time).toISOString()},{onConflict:"user_id,kind"});
    const operation=pending.current.then(()=>request);
    pending.current=operation.catch(()=>{});
    const {error}=await operation;
    if(error)throw error;
    if(current===revision.current){dirty.current=false;try{localStorage.removeItem(pendingKey)}catch{}}
    if(current===revision.current)setStatus("Uloženo do Supabase v "+new Date().toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"}));
   }catch(e){if(current===revision.current)setStatus("Koncept je uložen lokálně a čeká na synchronizaci")}
  },1200);
  return()=>clearTimeout(timer);
 },[data,supabase,kind,localKey]);
 useEffect(()=>{
  const retry=async()=>{
   if(!navigator.onLine||!dirty.current||!user.current)return;
   const snapshot=latest.current;
   const stamp=Date.now();
   try{
    const {error}=await supabase.from("isys_inspection_drafts").upsert({user_id:user.current,kind,content:snapshot,updated_at:new Date(stamp).toISOString()},{onConflict:"user_id,kind"});
    if(error)throw error;
    dirty.current=false;
    try{localStorage.removeItem(pendingKey)}catch{}
    setStatus("Offline koncept synchronizován do Supabase");
   }catch{setStatus("Koncept čeká na synchronizaci");}
  };
  window.addEventListener("online",retry);
  const onVisible=()=>{if(!document.hidden)retry()};
  document.addEventListener("visibilitychange",onVisible);
  return()=>{window.removeEventListener("online",retry);document.removeEventListener("visibilitychange",onVisible)};
 },[supabase,kind,localKey]);
 const discard=async()=>{
  paused.current=true;
  dirty.current=false;
  try{localStorage.removeItem(pendingKey)}catch{}
  revision.current++;
  skip.current=true;
  await pending.current;
  try{localStorage.removeItem(localKey);localStorage.removeItem(localStampKey)}catch{}
  const id=user.current;
  if(id){
   const {error}=await supabase.from("isys_inspection_drafts").delete().eq("user_id",id).eq("kind",kind);
   if(error){paused.current=false;setStatus("Koncept se nepodařilo odstranit ze Supabase");return false}
  }
  setStatus("Koncept odstraněn");
  return true;
 };
 const saveNow=async()=>{
  paused.current=false;
  const snapshot=latest.current;
  try{
   localStorage.setItem(localKey,JSON.stringify(snapshot));localStorage.setItem(localStampKey,String(Date.now()));
   dirty.current=true;
   try{localStorage.setItem(dirtyKey,"1")}catch{}
   try{localStorage.setItem(pendingKey,"1")}catch{}
   if(!navigator.onLine){setStatus("Koncept uložen lokálně – synchronizuje se po připojení");return true}
   const id=user.current;
   if(!id)throw new Error("Chybí přihlášení");
   const operation=pending.current.then(()=>supabase.from("isys_inspection_drafts").upsert({user_id:id,kind,content:snapshot,updated_at:new Date().toISOString()},{onConflict:"user_id,kind"}));
   pending.current=operation.catch(()=>{});
   const {error}=await operation;
   if(error)throw error;
   try{localStorage.setItem(localKey,JSON.stringify(snapshot));localStorage.setItem(localStampKey,String(Date.now()))}catch{}
   dirty.current=false;
   try{localStorage.removeItem(pendingKey)}catch{}
   setStatus("Uloženo do Supabase");return true;
  }catch{setStatus("Nepodařilo se uložit do Supabase");return false}
 };
 return {status,discard,saveNow};
}
