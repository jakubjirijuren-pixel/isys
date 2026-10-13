import React,{useEffect,useState} from "react";
import "./inspections.css";
const sections=["Fasáda objektu","Vstupní portály","Vnitřní společné prostory","Požární zařízení","Výtahy","Elektro","Topení, voda, kanalizace, plyn","Kontejnerové stání a okolí objektu"];
const blank=()=>({buildingId:"",date:new Date().toISOString().slice(0,10),number:"",referent:"",inspector:"",nextDate:"",overall:"",other:"",unresolved:"",photos:"",items:sections.map(title=>({title,status:"",note:""}))});
const esc=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
export default function Inspections({buildings,userEmail,myReferent,myTechnician,reportSignature,supabase}){
 const [data,setData]=useState(blank);
 const [notice,setNotice]=useState("");
 const [pdfBusy,setPdfBusy]=useState(false);
 const [temporaryReports,setTemporaryReports]=useState([]);
 const [reportsLoading,setReportsLoading]=useState(false);
 const [backupStatus,setBackupStatus]=useState("");
 const loadReports=async()=>{
  setReportsLoading(true);
  const {data,error}=await supabase.from("temporary_reports").select("id,filename,object_label,storage_path,created_at,expires_at").gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false}).limit(50);
  if(!error)setTemporaryReports(data||[]);
  else setNotice("Načtení dočasných reportů selhalo: "+error.message);
  setReportsLoading(false);
 };
 useEffect(()=>{loadReports()},[]);
 const retrieveReport=async report=>{
  const {data,error}=await supabase.storage.from("temporary-reports").download(report.storage_path);
  if(error){setNotice("Stažení reportu selhalo: "+error.message);return}
  const url=URL.createObjectURL(data),link=document.createElement("a");
  link.href=url;link.download=report.filename;document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
 };

 const set=(key,value)=>setData(prev=>({...prev,[key]:value}));
 const building=buildings.find(b=>String(b.id)===data.buildingId);
 const complete=data.items.filter(x=>x.status).length;
 const faults=data.items.filter(x=>x.status==="Zjištěna závada").length;
 const key="isys-inspection-draft-"+(userEmail||"user");
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem(key)||"null");if(saved&&Array.isArray(saved.items)&&saved.items.length===sections.length)setData(saved)}catch{}},[key]);
 const saveDraft=()=>{try{localStorage.setItem(key,JSON.stringify(data));setNotice("Rozpracovaná kontrola byla uložena do tohoto prohlížeče.")}catch{setNotice("Uložení konceptu se nezdařilo.")}};
 const reset=()=>{if(!window.confirm("Opravdu zahodit rozpracovanou kontrolu?"))return;setData(blank());setNotice("");try{localStorage.removeItem(key)}catch{}};
 const buildHtml=()=>{const buildingLabel=building?([building.street||building.name,building.city].filter(Boolean).join(", ")||building.address):"—";const rows=data.items.map(x=>'<tr><td>'+esc(x.title)+'</td><td>'+esc(x.status||"Nevyplněno")+'</td><td>'+esc(x.note||"—")+'</td></tr>').join("");const date=v=>v?new Date(v+"T12:00:00").toLocaleDateString("cs-CZ"):"—";return '<!doctype html><html lang="cs"><head><meta charset="utf-8"><title>Výkaz pravidelné kontroly domu</title><style>@page{size:A4;margin:17mm}.sbd-header{display:flex;align-items:center;gap:17px;margin-bottom:22px;padding-bottom:16px;border-bottom:2px solid #111;break-inside:avoid;page-break-inside:avoid;background:#fff!important;color:#000!important}.sbd-logo{flex:0 0 105px;width:105px}.sbd-logo svg{display:block;width:105px;height:140px}.sbd-info{flex:1;min-width:0;font-size:10px;line-height:1.55;color:#000!important}.sbd-name{font-weight:800;font-size:17px;line-height:1.3;margin-bottom:7px;color:#000!important}.sbd-info>div{overflow-wrap:anywhere}body{font-family:Arial,sans-serif;color:#182b3b;font-size:11px}h1{font-size:20px;border-bottom:3px solid #196d98;padding-bottom:10px}h2{font-size:13px;margin-top:24px}.report-signature-image img{display:block;max-width:170px;max-height:68px;object-fit:contain;margin-top:5px}.report-signature-name{font-size:10px;margin-top:5px;font-weight:bold}table{border-collapse:collapse;width:100%;margin:12px 0}td,th{border:1px solid #ccd5de;padding:8px;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#eaf2f8}td:first-child{width:32%}td:nth-child(2){width:24%}.meta td{width:50%}.signature{margin-top:45px;display:flex;justify-content:space-between}.signature span{display:block;width:45%;border-top:1px solid #778899;padding-top:8px}.footer{margin-top:28px;font-size:9px;color:#677889}@media print{button{display:none}}</style></head><body><div class="sbd-header"><div class="sbd-logo"><svg xmlns="http://www.w3.org/2000/svg" width="105" height="140" viewBox="0 0 400 532" role="img" aria-label="Původní logo SBD Praha 8 v černobílém provedení"><path fill="#000" fill-rule="evenodd" d="M317 433 312 439 312 445 315 449 312 453 311 461 312 465 316 469 320 470 327 464 328 457 327 453 324 450 327 442 326 437 322 433Z M317 452 321 452 325 458 324 462 320 466 317 465 314 460 314 456Z M321 437 323 439 323 445 318 448 315 441 318 437Z M253 433 243 469 247 468 248 460 250 458 258 458 261 462 262 468 266 469 256 433Z M254 440 257 447 257 454 250 453Z M203 433 203 469 206 469 207 452 220 453 220 469 222 469 223 434 220 433 220 446 218 448 208 448 206 446 206 433Z M170 433 160 469 164 468 164 464 167 458 176 458 179 468 183 469 174 434Z M171 441 174 446 176 453 175 454 167 453Z M121 433 121 469 124 469 125 453 131 454 138 468 142 469 140 462 135 454 140 448 141 444 139 436 136 433Z M124 438 134 437 137 440 137 445 133 449 125 449Z M94 433 80 433 80 469 84 468 83 456 85 454 94 454 99 448 99 440 97 435Z M83 439 93 438 96 442 95 447 92 450 85 450 83 448Z M293 222 292 354 325 355 333 353 339 350 348 340 355 322 358 298 358 276 355 255 347 235 337 225 321 222Z M305 241 328 241 333 243 339 249 345 266 345 309 339 327 329 336 304 336Z M172 222 172 355 206 355 215 353 225 344 230 333 232 322 232 310 229 297 226 291 218 284 224 277 227 268 228 251 226 242 221 231 213 224 203 222Z M184 295 207 295 212 297 217 302 220 312 220 319 218 328 213 334 201 337 183 336Z M184 241 207 241 213 245 216 252 216 267 210 275 201 277 183 276Z M73 222 64 224 59 227 50 239 46 256 47 270 51 281 59 290 67 295 85 302 93 309 95 314 95 327 91 335 86 339 73 341 65 337 59 331 56 324 54 311 44 312 43 318 46 334 52 347 62 356 78 360 92 355 102 343 107 325 107 311 104 300 95 287 87 282 63 272 58 264 59 250 65 243 69 241 80 241 85 243 91 252 93 265 104 264 102 244 98 235 89 226 83 223Z M0 177 0 531 399 531 399 177 244 87 244 419 357 419 357 388 271 388 269 386 269 146 272 145 373 205 372 487 27 487 26 205 127 145 130 146 130 386 128 388 42 388 42 419 155 419 155 87Z M200 72 195 76 195 86 199 101 198 102 181 86 174 85 172 87 173 92 178 96 198 104 176 114 172 118 172 122 175 124 182 122 198 106 199 108 195 123 195 133 199 137 204 133 204 123 200 108 201 106 217 122 224 124 227 121 226 117 220 112 201 104 213 100 224 94 227 89 226 86 218 86 201 102 200 100 204 86 204 76Z M0 121 1 158 200 40 399 158 398 120 200 0Z"/></svg></div><div class="sbd-info"><div class="sbd-name">Stavební bytové družstvo Praha 8</div><div>Horňátecká 1772/19, 182 00 Praha 8</div><div>IČO: 00034550, DIČ: CZ 00034550, Bankovní spojení: ČSOB a.s., č.ú. 746873/0300</div><div>Zapsané v Obchodním rejstříku vedeném Městským soudem v Praze v oddílu Dr XCVIII., vložka 254</div></div></div><h1>VÝKAZ PRAVIDELNÉ KONTROLY DOMU</h1><table class="meta"><tr><td><b>Adresa:</b> '+esc(buildingLabel)+'</td><td><b>Č. objektu:</b> '+esc(building?.object_number||"—")+'</td></tr><tr><td><b>Referent:</b> '+esc(data.referent||building?.referent||"—")+'</td><td><b>Č. kontroly:</b> '+esc(data.number||"—")+'</td></tr><tr><td><b>Datum kontroly:</b> '+esc(date(data.date))+'</td><td><b>Celkové hodnocení:</b> '+esc(data.overall||"—")+'</td></tr></table><h2>Průběh kontroly objektu a zjištěné závady</h2><table><thead><tr><th>Kontrolovaná oblast</th><th>Stav</th><th>Zjištění / poznámka</th></tr></thead><tbody>'+rows+'</tbody></table><h2>Další zjištění</h2><p><b>Ostatní:</b> '+esc(data.other||"—")+'</p><p><b>Neodstraněné závady:</b> '+esc(data.unresolved||"—")+'</p><p><b>Fotodokumentace / poznámka:</b> '+esc(data.photos||"—")+'</p><table class="meta"><tr><td><b>Zkontroloval:</b> '+esc(data.inspector||"—")+'</td><td><b>Datum:</b> '+esc(date(data.date))+'</td></tr><tr><td><b>Další kontrola:</b> '+esc(date(data.nextDate))+'</td><td><b>Podpis:</b> '+(reportSignature?.image&&/^data:image\/(png|jpeg|webp);base64,/.test(reportSignature.image)?'<div class="report-signature-image"><img src="'+reportSignature.image+'" alt="Podpis kontrolujícího"/></div>':'_______________________')+(reportSignature?.name?'<div class="report-signature-name">'+esc(reportSignature.name)+'</div>':'')+'</td></tr></table><div class="footer">Vytvořeno v iSYS • Výkaz pravidelné kontroly domu</div></body></html>'};
 const validate=()=>{
  if(!building){setNotice("Nejdřív vyber objekt.");return false}
  if(!data.date){setNotice("Vyplň datum kontroly.");return false}
  if(complete!==sections.length){setNotice("Vyplň stav všech osmi kontrolovaných oblastí.");return false}
  return true;
 };
 const printPdf=()=>{
  if(!validate())return;
  const win=window.open("","_blank");
  if(!win){setNotice("Prohlížeč zablokoval tiskové okno.");return}
  win.document.open();win.document.write(buildHtml());win.document.close();win.focus();
  setTimeout(()=>win.print(),350);
 };
 const makePdf=async(mode="download")=>{
  if(!validate()||pdfBusy)return;
  if(mode==="email"&&!userEmail){setNotice("Není dostupná e-mailová adresa přihlášeného uživatele.");return}
  setPdfBusy(true);setNotice("");setBackupStatus("");
  let host;
  try{
   const module=await import("html2pdf.js");
   const html2pdf=module.default;
   const doc=new DOMParser().parseFromString(buildHtml(),"text/html");
   host=document.createElement("div");
   host.className="inspectionpdfhost";
   host.style.cssText="position:fixed;left:-12000px;top:0;width:794px;background:white;color:#182b3b;z-index:-1";
   const style=document.createElement("style");
   style.textContent=doc.querySelector("style")?.textContent.replace(/@page\\s*\\{[^}]*\\}/g,"")||"";
   host.appendChild(style);
   // The PDF is rendered inside the running app, not inside the standalone HTML body.
   // Override dark-mode and global app styles explicitly so text remains black on white.
   const pdfStyle=document.createElement("style");
   pdfStyle.textContent=`.inspectionpdfhost,.inspectionpdfhost .inspectionpdfdocument{background:#fff!important;color:#17212b!important;font-family:Arial,sans-serif!important;opacity:1!important;filter:none!important}.inspectionpdfhost .inspectionpdfdocument h1{color:#152d3c!important;font-size:20px!important;font-weight:800!important;line-height:1.35!important;border-bottom:3px solid #196d98!important}.inspectionpdfhost .inspectionpdfdocument h2{color:#17212b!important;font-size:14px!important;font-weight:700!important}.inspectionpdfhost .inspectionpdfdocument p,.inspectionpdfhost .inspectionpdfdocument b,.inspectionpdfhost .inspectionpdfdocument td,.inspectionpdfhost .inspectionpdfdocument th,.inspectionpdfhost .inspectionpdfdocument .sbd-info,.inspectionpdfhost .inspectionpdfdocument .sbd-info div{color:#17212b!important;opacity:1!important;text-shadow:none!important}.inspectionpdfhost .inspectionpdfdocument td,.inspectionpdfhost .inspectionpdfdocument th{border:1px solid #7c8b96!important;background:#fff!important;font-size:11px!important;line-height:1.45!important}.inspectionpdfhost .inspectionpdfdocument th{background:#dce9f2!important;color:#152d3c!important;font-weight:700!important}.inspectionpdfhost .inspectionpdfdocument .meta td{background:#fff!important}.inspectionpdfhost .inspectionpdfdocument .sbd-header{border-bottom:1px solid #8e9ba4!important}.inspectionpdfhost .inspectionpdfdocument .sbd-name{color:#202020!important;font-size:17px!important;font-weight:800!important}.inspectionpdfhost .inspectionpdfdocument .footer{color:#485865!important}`;
   host.appendChild(pdfStyle);
   const content=document.createElement("div");
   content.className="inspectionpdfdocument";
   content.style.cssText="padding:35px 48px;background:#fff;color:#17212b;font-family:Arial,sans-serif;font-size:11px";
   content.innerHTML=doc.body.innerHTML;
   host.appendChild(content);
   document.body.appendChild(host);
   const filename="Kontrola_objekt_"+String(building.object_number||"bez_cisla").replace(/[^a-zA-Z0-9_-]/g,"_")+"_"+data.date+".pdf";
   const blob=await html2pdf().set({margin:0,filename,image:{type:"jpeg",quality:0.98},html2canvas:{scale:2,backgroundColor:"#ffffff",scrollY:0},jsPDF:{unit:"mm",format:"a4",orientation:"portrait"},pagebreak:{mode:["css","legacy"],avoid:["tr","h2"]}}).from(content).outputPdf("blob");
   try{
    const {data:auth}=await supabase.auth.getUser();
    if(!auth?.user?.id)throw new Error("Nepřihlášený uživatel");
    const path=auth.user.id+"/"+crypto.randomUUID()+".pdf";
    const {error:uploadError}=await supabase.storage.from("temporary-reports").upload(path,blob,{contentType:"application/pdf"});
    if(uploadError)throw uploadError;
    const {error:dbError}=await supabase.from("temporary_reports").insert({user_id:auth.user.id,filename,object_label:String(building.object_number||building.name||""),storage_path:path});
    if(dbError){await supabase.storage.from("temporary-reports").remove([path]);throw dbError}
    await loadReports();
    setBackupStatus("Záložní PDF bylo uloženo do tvého účtu na 24 hodin.");
   }catch(e){setBackupStatus("Pozor: PDF se nepodařilo zálohovat do Supabase: "+e.message)}
   const download=()=>{const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)};
   if(mode==="email"){
    const subject="Výkaz pravidelné kontroly domu – objekt "+(building.object_number||"")+" – "+data.date;
    const body="Dobrý den,\\n\\nv příloze zasílám výkaz pravidelné kontroly domu (objekt "+(building.object_number||"")+", "+data.date+").\\n\\nS pozdravem";
    const file=new File([blob],filename,{type:"application/pdf"});
    if(navigator.share&&navigator.canShare?.({files:[file]})){
     try{await navigator.share({files:[file],title:subject,text:"Příjemce: "+userEmail+"\\n"+body});setNotice("PDF bylo předáno nabídce sdílení. V e-mailové aplikaci zkontroluj příjemce: "+userEmail+".");}
     catch(error){if(error?.name==="AbortError"){setNotice("Sdílení bylo zrušeno.");}else{download();window.location.href="mailto:"+encodeURIComponent(userEmail)+"?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(body);setNotice("PDF se stáhlo. Připoj ho k připravenému e-mailu.");}}
    }else{
     download();
     window.location.href="mailto:"+encodeURIComponent(userEmail)+"?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(body);
     setNotice("PDF se stáhlo. Připoj ho k připravenému e-mailu pro "+userEmail+".");
    }
   }else{download();setNotice("PDF bylo připraveno ke stažení.");}
  }catch(error){setNotice("PDF se nepodařilo vytvořit: "+(error?.message||"neznámá chyba"))}
  finally{host?.remove();setPdfBusy(false)}
 };

 return <div className="inspectionmodule"><div className="inspectionheading"><div><h1>Pravidelné kontroly domů</h1><p>Vyplň výkaz podle původní šablony a vytvoř PDF.</p></div><div className="inspectionactions"><button type="button" className="secondarybutton" onClick={saveDraft}>Uložit koncept</button><button type="button" className="secondarybutton" onClick={printPdf}>Tisk</button><button type="button" className="secondarybutton" onClick={()=>makePdf("email")} disabled={pdfBusy}>Odeslat e-mailem</button><button type="button" className="primary" onClick={()=>makePdf("download")} disabled={pdfBusy}>{pdfBusy?"Připravuji PDF…":"Stáhnout PDF"}</button></div></div>{notice&&<div className="notice" role="status">{notice}</div>}{backupStatus&&<div className="notice" role="status">{backupStatus}</div>}<section className="inspectionpanel"><h2>Dočasně uložené reporty (24 hodin)</h2><p>PDF je dostupné na všech zařízeních přihlášeného uživatele.</p><button type="button" className="secondarybutton" onClick={loadReports} disabled={reportsLoading}>Obnovit seznam</button>{temporaryReports.length?temporaryReports.map(r=><div className="temporaryreportrow" key={r.id}><div><strong>{r.object_label} – {r.filename}</strong><small>Vytvořeno: {new Date(r.created_at).toLocaleString("cs-CZ")} · Vyprší: {new Date(r.expires_at).toLocaleString("cs-CZ")}</small></div><button type="button" className="secondarybutton" onClick={()=>retrieveReport(r)}>Stáhnout</button></div>):<p>Žádné dostupné reporty.</p>}</section><div className="inspectionprogress"><strong>Průběh kontroly</strong><span>{complete} z {sections.length} oblastí • {faults} závad</span><div className="inspectionbar"><div style={{width:(complete/sections.length*100)+"%"}}/></div></div><section className="inspectionpanel"><h2>Základní údaje</h2><div className="inspectionfields"><label>Objekt *<select value={data.buildingId} onChange={e=>{const b=buildings.find(x=>String(x.id)===e.target.value);setData(prev=>({...prev,buildingId:e.target.value,referent:b?.referent||prev.referent}))}}><option value="">Vyber objekt…</option>{[...buildings].sort((a,b)=>String(a.object_number||"").localeCompare(String(b.object_number||""),"cs",{numeric:true})).map(b=><option key={b.id} value={b.id}>{b.object_number?"Objekt "+b.object_number+" – ":""}{b.street||b.name}{b.city?", "+b.city:""}</option>)}</select></label><label>Datum kontroly *<input type="date" value={data.date} onChange={e=>set("date",e.target.value)}/></label><label>Číslo kontroly<input value={data.number} onChange={e=>set("number",e.target.value)} placeholder="Např. 2026/001"/></label><label>Referent<input value={data.referent} onChange={e=>set("referent",e.target.value)} placeholder={myReferent||"Jméno referenta"}/></label><label>Zkontroloval<input value={data.inspector} onChange={e=>set("inspector",e.target.value)} placeholder={myTechnician||"Jméno kontrolujícího"}/></label><label>Další kontrola<input type="date" value={data.nextDate} onChange={e=>set("nextDate",e.target.value)}/></label><label>Celkové hodnocení<select value={data.overall} onChange={e=>setData(prev=>({...prev,overall:e.target.value,items:e.target.value==="Bez závad"?prev.items.map(item=>({...item,status:"Bez závad"})):prev.items}))}><option value="">Vyber hodnocení…</option><option>Bez závad</option><option>Zjištěny závady</option><option>Vyžaduje neodkladné řešení</option></select></label></div></section><section className="inspectionpanel"><h2>Průběh kontroly a zjištěné závady</h2><p>U každé oblasti vyber stav a případně doplň zjištění.</p><div className="inspectionitems">{data.items.map((item,i)=><div className="inspectionitem" key={item.title}><div className="inspectionitemtitle"><span className="inspectionindex">{i+1}</span><strong>{item.title}</strong></div><div className="inspectionitemcontrols"><label>Stav<select value={item.status} onChange={e=>setData(prev=>({...prev,items:prev.items.map((x,j)=>j===i?{...x,status:e.target.value}:x)}))}><option value="">Nevyplněno</option><option>Bez závad</option><option>Zjištěna závada</option><option>Nekontrolováno</option></select></label><label>Zjištění / poznámka<textarea rows="2" value={item.note} onChange={e=>setData(prev=>({...prev,items:prev.items.map((x,j)=>j===i?{...x,note:e.target.value}:x)}))} placeholder={item.status==="Zjištěna závada"?"Popiš zjištěnou závadu…":"Volitelná poznámka"}/></label></div></div>)}</div></section><section className="inspectionpanel"><h2>Doplňující informace</h2><div className="inspectionextras"><label>Ostatní<textarea rows="3" value={data.other} onChange={e=>set("other",e.target.value)}/></label><label>Neodstraněné závady<textarea rows="3" value={data.unresolved} onChange={e=>set("unresolved",e.target.value)}/></label><label>Fotodokumentace / poznámka<textarea rows="3" value={data.photos} onChange={e=>set("photos",e.target.value)} placeholder="Popis fotodokumentace nebo odkazy na přílohy"/></label></div></section><div className="inspectionbottom"><button type="button" className="secondarybutton" onClick={reset}>Nová prázdná kontrola</button><button type="button" className="secondarybutton" onClick={saveDraft}>Uložit koncept</button><button type="button" className="secondarybutton" onClick={printPdf}>Tisk</button><button type="button" className="secondarybutton" onClick={()=>makePdf("email")} disabled={pdfBusy}>Odeslat e-mailem</button><button type="button" className="primary" onClick={()=>makePdf("download")} disabled={pdfBusy}>{pdfBusy?"Připravuji PDF…":"Stáhnout PDF"}</button></div><p className="inspectiondisclaimer">Koncept se ukládá pouze do tohoto prohlížeče, nikoli do centrální databáze. Při vytvoření PDF se jeho kopie uloží na 24 hodin do soukromého úložiště Supabase; pro přímý tisk použij „Tisk“. „Odeslat e-mailem“ otevře sdílení PDF nebo připraví e-mail, který je nutné potvrdit a případně ručně přiložit soubor.</p></div>
}
