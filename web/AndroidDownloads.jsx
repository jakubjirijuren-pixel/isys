import React,{useEffect,useState} from "react";
import "./AndroidDownloads.css";
export default function AndroidDownloads(){
 const [release,setRelease]=useState(null);
 useEffect(()=>{let alive=true;fetch(import.meta.env.BASE_URL+"android-release.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("Release metadata unavailable");return r.json()}).then(v=>{if(alive)setRelease(v)}).catch(()=>{});return()=>{alive=false}},[]);
 const url=release?.apkUrl;
 const valid=typeof url==="string"&&/^https:\/\/[^\s]+\.apk(?:\?[^\s]*)?$/i.test(url);
 return <div className="foxa-downloads">
  <h2>FOXA pro Android</h2>
  <div className="foxa-downloads-notice"><strong>Dočasné řešení</strong><p>Aplikace FOXA je aktuálně v procesu publikace na Google Play. Do dokončení schvalování bude možné nové verze stahovat a instalovat zde.</p></div>
  <section className="foxa-downloads-panel"><h3>Aktuální verze aplikace</h3>
   <p>Verze: <strong>{release?.version||"Zatím nezveřejněna"}</strong></p>
   {valid?<><a className="foxa-downloads-action" href={url} download>Stáhnout APK pro Android</a><p>Chcete-li aktualizovat, stáhněte novější APK a nainstalujte jej přes stávající aplikaci. Musí mít stejný identifikátor a podpis.</p></>:<p>Instalační soubor zatím není dostupný. Jakmile bude připraveno ověřené a podepsané APK, objeví se zde odkaz.</p>}
  </section>
  <p className="foxa-downloads-footnote">Instalujte pouze soubory zveřejněné správcem FOXA. Při instalaci mimo Google Play může Android vyžadovat jednorázové povolení instalace z daného zdroje. Automatické aktualizace přes Google Play budou dostupné až po publikaci aplikace v obchodě.</p>
 </div>
}
