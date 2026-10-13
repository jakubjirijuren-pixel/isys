import React,{useEffect,useState} from "react";
import "./inspections.css";
const sections=["Fasáda objektu","Vstupní portály","Vnitřní společné prostory","Požární zařízení","Výtahy","Elektro","Topení, voda, kanalizace, plyn","Kontejnerové stání a okolí objektu"];
const blank=()=>({buildingId:"",date:new Date().toISOString().slice(0,10),number:"",referent:"",inspector:"",nextDate:"",overall:"",other:"",unresolved:"",photos:"",items:sections.map(title=>({title,status:"",note:""}))});
const esc=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
export default function Inspections({buildings,userEmail,myReferent,myTechnician}){
 const [data,setData]=useState(blank);
 const [notice,setNotice]=useState("");
 const [pdfBusy,setPdfBusy]=useState(false);
 const set=(key,value)=>setData(prev=>({...prev,[key]:value}));
 const building=buildings.find(b=>String(b.id)===data.buildingId);
 const complete=data.items.filter(x=>x.status).length;
 const faults=data.items.filter(x=>x.status==="Zjištěna závada").length;
 const key="isys-inspection-draft-"+(userEmail||"user");
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem(key)||"null");if(saved&&Array.isArray(saved.items)&&saved.items.length===sections.length)setData(saved)}catch{}},[key]);
 const saveDraft=()=>{try{localStorage.setItem(key,JSON.stringify(data));setNotice("Rozpracovaná kontrola byla uložena do tohoto prohlížeče.")}catch{setNotice("Uložení konceptu se nezdařilo.")}};
 const reset=()=>{if(!window.confirm("Opravdu zahodit rozpracovanou kontrolu?"))return;setData(blank());setNotice("");try{localStorage.removeItem(key)}catch{}};
 const buildHtml=()=>{const buildingLabel=building?([building.street||building.name,building.city].filter(Boolean).join(", ")||building.address):"—";const rows=data.items.map(x=>'<tr><td>'+esc(x.title)+'</td><td>'+esc(x.status||"Nevyplněno")+'</td><td>'+esc(x.note||"—")+'</td></tr>').join("");const date=v=>v?new Date(v+"T12:00:00").toLocaleDateString("cs-CZ"):"—";return '<!doctype html><html lang="cs"><head><meta charset="utf-8"><title>Výkaz pravidelné kontroly domu</title><style>@page{size:A4;margin:17mm}body{font-family:Arial,sans-serif;color:#182b3b;font-size:11px}h1{font-size:20px;border-bottom:3px solid #196d98;padding-bottom:10px}h2{font-size:13px;margin-top:24px}table{border-collapse:collapse;width:100%;margin:12px 0}td,th{border:1px solid #ccd5de;padding:8px;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#eaf2f8}td:first-child{width:32%}td:nth-child(2){width:24%}.meta td{width:50%}.signature{margin-top:45px;display:flex;justify-content:space-between}.signature span{display:block;width:45%;border-top:1px solid #778899;padding-top:8px}.footer{margin-top:28px;font-size:9px;color:#677889}@media print{button{display:none}}</style></head><body><h1>VÝKAZ PRAVIDELNÉ KONTROLY DOMU</h1><table class="meta"><tr><td><b>Adresa:</b> '+esc(buildingLabel)+'</td><td><b>Č. objektu:</b> '+esc(building?.object_number||"—")+'</td></tr><tr><td><b>Referent:</b> '+esc(data.referent||building?.referent||"—")+'</td><td><b>Č. kontroly:</b> '+esc(data.number||"—")+'</td></tr><tr><td><b>Datum kontroly:</b> '+esc(date(data.date))+'</td><td><b>Celkové hodnocení:</b> '+esc(data.overall||"—")+'</td></tr></table><h2>Průběh kontroly objektu a zjištěné závady</h2><table><thead><tr><th>Kontrolovaná oblast</th><th>Stav</th><th>Zjištění / poznámka</th></tr></thead><tbody>'+rows+'</tbody></table><h2>Další zjištění</h2><p><b>Ostatní:</b> '+esc(data.other||"—")+'</p><p><b>Neodstraněné závady:</b> '+esc(data.unresolved||"—")+'</p><p><b>Fotodokumentace / poznámka:</b> '+esc(data.photos||"—")+'</p><table class="meta"><tr><td><b>Zkontroloval:</b> '+esc(data.inspector||"—")+'</td><td><b>Datum:</b> '+esc(date(data.date))+'</td></tr><tr><td><b>Další kontrola:</b> '+esc(date(data.nextDate))+'</td><td><b>Podpis:</b> _______________________</td></tr></table><div class="footer">Vytvořeno v iSYS • Výkaz pravidelné kontroly domu</div></body></html>'};
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
 const downloadPdf=async()=>{
  if(!validate()||pdfBusy)return;
  setPdfBusy(true);setNotice("");
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
   const content=document.createElement("div");
   content.style.cssText="padding:35px 48px;background:white;font-family:Arial,sans-serif;font-size:11px";
   content.innerHTML=doc.body.innerHTML;
   host.appendChild(content);
   document.body.appendChild(host);
   const filename="Kontrola_objekt_"+String(building.object_number||"bez_cisla").replace(/[^a-zA-Z0-9_-]/g,"_")+"_"+data.date+".pdf";
   await html2pdf().set({margin:0,filename,image:{type:"jpeg",quality:0.98},html2canvas:{scale:2,backgroundColor:"#ffffff",scrollY:0},jsPDF:{unit:"mm",format:"a4",orientation:"portrait"},pagebreak:{mode:["css","legacy"],avoid:["tr","h2"]}}).from(content).save();
   setNotice("PDF bylo připraveno ke stažení.");
  }catch(error){setNotice("PDF se nepodařilo vytvořit: "+(error?.message||"neznámá chyba"))}
  finally{host?.remove();setPdfBusy(false)}
 };

 return <div className="inspectionmodule"><div className="inspectionheading"><div><h1>Pravidelné kontroly domů</h1><p>Vyplň výkaz podle původní šablony a vytvoř PDF.</p></div><div className="inspectionactions"><button type="button" className="secondarybutton" onClick={saveDraft}>Uložit koncept</button><button type="button" className="secondarybutton" onClick={printPdf}>Tisk</button><button type="button" className="primary" onClick={downloadPdf} disabled={pdfBusy}>{pdfBusy?"Připravuji PDF…":"Stáhnout PDF"}</button></div></div>{notice&&<div className="notice" role="status">{notice}</div>}<div className="inspectionprogress"><strong>Průběh kontroly</strong><span>{complete} z {sections.length} oblastí • {faults} závad</span><div className="inspectionbar"><div style={{width:(complete/sections.length*100)+"%"}}/></div></div><section className="inspectionpanel"><h2>Základní údaje</h2><div className="inspectionfields"><label>Objekt *<select value={data.buildingId} onChange={e=>{const b=buildings.find(x=>String(x.id)===e.target.value);setData(prev=>({...prev,buildingId:e.target.value,referent:b?.referent||prev.referent}))}}><option value="">Vyber objekt…</option>{[...buildings].sort((a,b)=>String(a.object_number||"").localeCompare(String(b.object_number||""),"cs",{numeric:true})).map(b=><option key={b.id} value={b.id}>{b.object_number?"Objekt "+b.object_number+" – ":""}{b.street||b.name}{b.city?", "+b.city:""}</option>)}</select></label><label>Datum kontroly *<input type="date" value={data.date} onChange={e=>set("date",e.target.value)}/></label><label>Číslo kontroly<input value={data.number} onChange={e=>set("number",e.target.value)} placeholder="Např. 2026/001"/></label><label>Referent<input value={data.referent} onChange={e=>set("referent",e.target.value)} placeholder={myReferent||"Jméno referenta"}/></label><label>Zkontroloval<input value={data.inspector} onChange={e=>set("inspector",e.target.value)} placeholder={myTechnician||"Jméno kontrolujícího"}/></label><label>Další kontrola<input type="date" value={data.nextDate} onChange={e=>set("nextDate",e.target.value)}/></label><label>Celkové hodnocení<select value={data.overall} onChange={e=>setData(prev=>({...prev,overall:e.target.value,items:e.target.value==="Bez závad"?prev.items.map(item=>({...item,status:"Bez závad"})):prev.items}))}><option value="">Vyber hodnocení…</option><option>Bez závad</option><option>Zjištěny závady</option><option>Vyžaduje neodkladné řešení</option></select></label></div></section><section className="inspectionpanel"><h2>Průběh kontroly a zjištěné závady</h2><p>U každé oblasti vyber stav a případně doplň zjištění.</p><div className="inspectionitems">{data.items.map((item,i)=><div className="inspectionitem" key={item.title}><div className="inspectionitemtitle"><span className="inspectionindex">{i+1}</span><strong>{item.title}</strong></div><div className="inspectionitemcontrols"><label>Stav<select value={item.status} onChange={e=>setData(prev=>({...prev,items:prev.items.map((x,j)=>j===i?{...x,status:e.target.value}:x)}))}><option value="">Nevyplněno</option><option>Bez závad</option><option>Zjištěna závada</option><option>Nekontrolováno</option></select></label><label>Zjištění / poznámka<textarea rows="2" value={item.note} onChange={e=>setData(prev=>({...prev,items:prev.items.map((x,j)=>j===i?{...x,note:e.target.value}:x)}))} placeholder={item.status==="Zjištěna závada"?"Popiš zjištěnou závadu…":"Volitelná poznámka"}/></label></div></div>)}</div></section><section className="inspectionpanel"><h2>Doplňující informace</h2><div className="inspectionextras"><label>Ostatní<textarea rows="3" value={data.other} onChange={e=>set("other",e.target.value)}/></label><label>Neodstraněné závady<textarea rows="3" value={data.unresolved} onChange={e=>set("unresolved",e.target.value)}/></label><label>Fotodokumentace / poznámka<textarea rows="3" value={data.photos} onChange={e=>set("photos",e.target.value)} placeholder="Popis fotodokumentace nebo odkazy na přílohy"/></label></div></section><div className="inspectionbottom"><button type="button" className="secondarybutton" onClick={reset}>Nová prázdná kontrola</button><button type="button" className="secondarybutton" onClick={saveDraft}>Uložit koncept</button><button type="button" className="secondarybutton" onClick={printPdf}>Tisk</button><button type="button" className="primary" onClick={downloadPdf} disabled={pdfBusy}>{pdfBusy?"Připravuji PDF…":"Stáhnout PDF"}</button></div><p className="inspectiondisclaimer">Koncept se ukládá pouze do tohoto prohlížeče, nikoli do centrální databáze. PDF se stáhne samostatným tlačítkem; pro přímý tisk použij „Tisk“.</p></div>
}
