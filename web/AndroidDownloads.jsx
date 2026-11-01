import React,{useEffect,useState} from "react";
import "./AndroidDownloads.css";
const FALLBACK={version:"1.0.1",versionCode:2,releases:[{version:"1.0.1",versionCode:2,status:"artifact",runUrl:"https://github.com/jakubjirijuren-pixel/isys/actions/runs/41335341794"}]};
export default function AndroidDownloads(){
 const [release,setRelease]=useState(FALLBACK);
 useEffect(()=>{let alive=true;fetch(import.meta.env.BASE_URL+"android-release.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("Metadata unavailable");return r.json()}).then(v=>{if(alive&&v?.version)setRelease(v)}).catch(()=>{});return()=>{alive=false}},[]);
 const releases=Array.isArray(release.releases)&&release.releases.length?release.releases:[release];
 const isApk=url=>typeof url==="string"&&/^https:\/\/[^\s]+\.apk(?:\?[^\s]*)?$/i.test(url);
 return <div className="foxa-downloads">
  <h2>FOXA pro Android</h2>
  <div className="foxa-downloads-notice"><strong>Distribuce mimo Google Play</strong><p>Do dokončení publikace v Google Play jsou verze FOXA dostupné prostřednictvím GitHubu. Instalujte pouze ověřené a podepsané APK.</p></div>
  <section className="foxa-downloads-panel"><h3>Dostupné verze</h3>
   {releases.map(item=><article className="foxa-download-release" key={item.version}>
    <div><strong>FOXA {item.version}</strong><p>Android · versionCode {item.versionCode||"—"}{item.status==="artifact"?" · ověřené sestavení GitHub Actions":" · podepsané vydání"}</p></div>
    {isApk(item.apkUrl)?<a className="foxa-downloads-action" href={item.apkUrl}>Stáhnout APK</a>:item.runUrl?<a className="foxa-downloads-action" href={item.runUrl} target="_blank" rel="noopener noreferrer">Stáhnout z GitHub Actions</a>:<span>APK zatím není dostupné</span>}
   </article>)}
   <p className="foxa-downloads-footnote">U vydání z GitHub Actions otevřete sekci Artifacts a stáhněte ZIP obsahující APK a AAB. GitHub může vyžadovat přihlášení a artefakty mají omezenou dobu dostupnosti.</p>
  </section>
  <p className="foxa-downloads-footnote">Při prvním přechodu z debug verze na produkčně podepsanou aplikaci je nutná přeinstalace. Další produkčně podepsané aktualizace lze instalovat přes stávající aplikaci, pokud se zachová podpis a zvýší versionCode.</p>
 </div>
}