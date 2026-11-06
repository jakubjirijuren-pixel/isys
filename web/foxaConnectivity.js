import {useEffect,useState} from "react";

// navigator.onLine alone does not establish that FOXA can reach its backend.
// Use a lightweight public Supabase REST request; 401/403 still proves reachability.
const endpoint="https://qcbyjxovnffdruiznlnt.supabase.co/rest/v1/";
let state={online:typeof navigator!=="undefined"?navigator.onLine:false,checked:false};
const listeners=new Set();
let timer=null;
let generation=0;
function publish(next){if(state.online===next.online&&state.checked===next.checked)return;state=next;listeners.forEach(fn=>fn(state));}
export async function checkFoxaConnectivity(){
 const run=++generation;
 if(!navigator.onLine){publish({online:false,checked:true});return false;}
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),5000);
 try{
  const response=await fetch(endpoint,{method:"GET",cache:"no-store",signal:controller.signal});
  if(run===generation)publish({online:response.status>0,checked:true});
  return response.status>0;
 }catch{if(run===generation)publish({online:false,checked:true});return false}
 finally{clearTimeout(timeout)}
}
function start(){
 if(typeof window==="undefined"||timer)return;
 const onChange=()=>{if(!navigator.onLine){generation++;publish({online:false,checked:true})}else checkFoxaConnectivity()};
 const onVisible=()=>{if(!document.hidden)checkFoxaConnectivity()};
 window.addEventListener("online",onChange);
 window.addEventListener("offline",onChange);
 window.addEventListener("focus",onVisible);
 document.addEventListener("visibilitychange",onVisible);
 timer={onChange,onVisible,interval:setInterval(()=>{if(!document.hidden)checkFoxaConnectivity()},15000)};
 checkFoxaConnectivity();
}
function stop(){
 if(!timer)return;
 window.removeEventListener("online",timer.onChange);
 window.removeEventListener("offline",timer.onChange);
 window.removeEventListener("focus",timer.onVisible);
 document.removeEventListener("visibilitychange",timer.onVisible);
 clearInterval(timer.interval);timer=null;
}
export function useFoxaConnectivity(){
 const [value,setValue]=useState(state);
 useEffect(()=>{listeners.add(setValue);start();return()=>{listeners.delete(setValue);if(!listeners.size)stop()}},[]);
 return value;
}
