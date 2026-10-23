import React,{useEffect,useState} from "react";
import {getVisibleReleases} from "./foxaReleases.js";
import "./Changelog.css";

export default function Changelog({supabase,userId,roles=[],open,onClose}){
 const foxaReleases=getVisibleReleases(roles);
 const [readIds,setReadIds]=useState([]);
 const [ready,setReady]=useState(false);
 const [error,setError]=useState("");
 const [saving,setSaving]=useState(false);
 const [dismissed,setDismissed]=useState(false);
 useEffect(()=>{
  let active=true;
  setReady(false);setReadIds([]);setError("");setDismissed(false);
  if(!userId)return;
  supabase.from("foxa_changelog_reads").select("release_id").eq("user_id",userId).then(({data,error:e})=>{
   if(!active)return;
   if(e)setError("Nepodařilo se načíst potvrzení přečtení. "+e.message);
   else setReadIds((data||[]).map(x=>x.release_id));
   setReady(true);
  });
  return()=>{active=false};
 },[supabase,userId]);
 const unread=foxaReleases.filter(x=>!readIds.includes(x.id));
 const visible=open||ready&&!dismissed&&unread.length>0;
 const items=open?foxaReleases:unread;
 const markRead=async()=>{
  if(saving)return;
  setSaving(true);setError("");
  const ids=items.filter(x=>!readIds.includes(x.id)).map(x=>x.id);
  if(!ids.length){setDismissed(true);onClose();setSaving(false);return}
  const {error:e}=await supabase.from("foxa_changelog_reads").upsert(ids.map(release_id=>({user_id:userId,release_id})),{onConflict:"user_id,release_id",ignoreDuplicates:true});
  if(e)setError("Potvrzení se nepodařilo uložit: "+e.message);
  else{setReadIds(prev=>[...new Set([...prev,...ids])]);window.dispatchEvent(new Event("foxa-changelog-updated"));setDismissed(true);onClose()}
  setSaving(false);
 };
 if(!userId||!visible)return null;
 return <div className="foxa-changelog-backdrop" role="presentation">
  <section className="foxa-changelog-dialog" role="dialog" aria-modal="true" aria-labelledby="foxa-changelog-title">
   <header className="foxa-changelog-header"><div><span className="foxa-changelog-eyebrow">AKTUALIZACE SYSTÉMU</span><h2 id="foxa-changelog-title">Co je nového ve FOXA</h2><p>{open?"Přehled vydaných aktualizací.":"Od posledního potvrzení byly vydány tyto novinky."}</p></div></header>
   <div className="foxa-changelog-body">{items.map(release=><article key={release.id} className="foxa-changelog-release">
    <div className="foxa-changelog-release-heading"><h3>{release.title}</h3><time dateTime={release.date}>{new Date(release.date+"T12:00:00").toLocaleDateString("cs-CZ")}</time>{readIds.includes(release.id)&&<span className="foxa-changelog-read">Přečteno</span>}</div>
    <ul>{release.changes.map((change,i)=><li key={i}><strong>{change.area}</strong><span>{change.description}</span></li>)}</ul>
   </article>)}</div>
   {error&&<p className="foxa-changelog-error" role="alert">{error}</p>}
   <footer className="foxa-changelog-footer">{(open||error)&&<button type="button" className="secondarybutton" onClick={()=>{setDismissed(true);onClose()}}>{error?"Zavřít bez potvrzení":"Zavřít"}</button>}<button type="button" className="primary" onClick={markRead} disabled={saving||!!error}>{saving?"Ukládám…":unread.length?"Označit jako přečtené":"Rozumím"}</button></footer>
  </section>
 </div>;
}
