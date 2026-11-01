import React,{useEffect,useState} from "react";
import "./AndroidDownloads.css";
const FALLBACK={version:"1.0.1",versionCode:2,releases:[{version:"1.0.1",versionCode:2,status:"pending"}]};
export default function AndroidDownloads(){
 const [release,setRelease]=useState(FALLBACK);
 useEffect(()=>{let alive=true;fetch(import.meta.env.BASE_URL+"android-release.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("Metadata unavailable");return r.json()}).then(v=>{if(alive&&v?.version)setRelease(v)}).catch(()=>{});return()=>{alive=false}},[]);
 const [githubReleases,setGithubReleases]=useState([]);
 useEffect(()=>{let alive=true;fetch("https://api.github.com/repos/jakubjirijuren-pixel/isys/releases?per_page=20",{headers:{"Accept":"application/vnd.github+json"}}).then(r=>{if(!r.ok)throw Error("GitHub Releases unavailable");return r.json()}).then(items=>{if(!alive||!Array.isArray(items))return;setGithubReleases(items.filter(x=>!x.draft&&x.tag_name?.startsWith("android-v")).map(x=>{const apk=x.assets?.find(a=>/^FOXA-Android-.*\\.apk$/i.test(a.name));return {version:x.tag_name.replace(/^android-v/,""),versionCode:null,status:"release",apkUrl:apk?.browser_download_url,runUrl:x.html_url}}).filter(x=>x.apkUrl))}).catch(()=>{});return()=>{alive=false}},[]);
 const releases=githubReleases.length?githubReleases:Array.isArray(release.releases)&&release.releases.length?release.releases:[release];
 const isApk=url=>typeof url==="string"&&/^https:\/\/[^\s]+\.apk(?:\?[^\s]*)?$/i.test(url);
 return <div className="foxa-downloads">
  <h2>FOXA pro Android</h2>
  <div className="foxa-downloads-notice"><strong>Distribuce mimo Google Play</strong><p>Do dokončení publikace v Google Play jsou verze FOXA dostupné prostřednictvím GitHubu. Instalujte pouze ověřené a podepsané APK.</p></div>
  <section className="foxa-downloads-panel"><h3>Dostupné verze</h3>
   {releases.map(item=><article className="foxa-download-release" key={item.version}>
    <div><strong>FOXA {item.version}</strong><p>Android · versionCode {item.versionCode||"—"}{item.status==="release"?" · podepsané vydání":" · čeká na zveřejnění APK"}</p></div>
    {isApk(item.apkUrl)?<a className="foxa-downloads-action" href={item.apkUrl} download>Stáhnout APK</a>:<span>APK čeká na zveřejnění</span>}
   </article>)}
   <p className="foxa-downloads-footnote">Po zveřejnění podepsaného APK se zde objeví přímé tlačítko pro stažení instalačního souboru.</p>
  </section>
  <p className="foxa-downloads-footnote">Při prvním přechodu z debug verze na produkčně podepsanou aplikaci je nutná přeinstalace. Další produkčně podepsané aktualizace lze instalovat přes stávající aplikaci, pokud se zachová podpis a zvýší versionCode.</p>
 </div>
}