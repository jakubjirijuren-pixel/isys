import React,{useEffect,useState} from "react";
import "./notification-preferences.css";
const fields=[
 ["key_loans","Evidence klíčů","Výpůjčky a vrácení klíčů"],
 ["tasks","Úkoly","Nové úkoly, změny a termíny"],
 ["inspections","Kontroly objektů","Plánované a dokončené kontroly"],
 ["defects","Závady","Nové závady a změny jejich stavu"],
 ["admin_messages","Zprávy administrátora","Individuální zprávy od správce iSYS"],
 ["other","Ostatní","Další systémová oznámení"],
];
const defaults=Object.fromEntries(fields.map(([key])=>[key,true]));
export default function NotificationPreferences({supabase,userId}){
 const [prefs,setPrefs]=useState(defaults),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[status,setStatus]=useState("");
 useEffect(()=>{if(!userId)return;let active=true;setLoading(true);setStatus("");
  supabase.from("notification_preferences").select("*").eq("user_id",userId).maybeSingle().then(({data,error})=>{
   if(!active)return;
   if(error)setStatus("Nastavení se nepodařilo načíst. Spusť SQL skript notification-preferences.sql.");
   else setPrefs({...defaults,...Object.fromEntries(Object.keys(defaults).map(key=>[key,data?.[key]??true]))});
   setLoading(false);
  });return()=>{active=false};
 },[supabase,userId]);
 const save=async(key,value)=>{
  const next={...prefs,[key]:value};setPrefs(next);setSaving(true);setStatus("");
  const {error}=await supabase.from("notification_preferences").upsert({user_id:userId,...next,updated_at:new Date().toISOString()},{onConflict:"user_id"});
  if(error){setPrefs(prefs);setStatus("Uložení selhalo: "+error.message)}
  else setStatus("Předvolby oznámení byly uloženy.");
  setSaving(false);
 };
 return <section className="notification-preferences"><strong>Oznámení</strong><small>Vyber, která oznámení chceš dostávat jako push na telefon nebo počítač. V centru oznámení zůstanou zprávy dostupné.</small>{loading?<small>Načítám nastavení…</small>:fields.map(([key,label,description])=><label className="notification-preference" key={key}><span><b>{label}</b><small>{description}</small></span><input type="checkbox" checked={prefs[key]} disabled={saving} onChange={e=>save(key,e.target.checked)} aria-label={label}/></label>)}{status&&<small role="status">{status}</small>}</section>;
}
