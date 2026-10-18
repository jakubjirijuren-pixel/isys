import React,{useState} from "react";
import {SBD_LOGO} from "./SbdProtocolLogo.js";
import "./PrintForms.css";

const today=()=>new Date().toISOString().slice(0,10);
const templates={
 letter:{title:"Dopis na hlavičkovém papíře",subject:"Věc: ",greeting:"Vážení,",body:"",closing:"S pozdravem"},
 notice:{title:"Oznámení vlastníkům / nájemcům",subject:"Oznámení",greeting:"Vážení vlastníci a nájemci,",body:"Dovolujeme si Vás informovat, že\n\nDěkujeme za pochopení.",closing:"S pozdravem"},
 request:{title:"Výzva / žádost o součinnost",subject:"Výzva k součinnosti",greeting:"Vážení,",body:"Žádáme Vás o poskytnutí součinnosti v následující záležitosti:\n\n",closing:"Děkujeme za spolupráci.\n\nS pozdravem"},
 blank:{title:"Volný tiskopis",subject:"",greeting:"",body:"",closing:""}
};
const esc=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const multiline=v=>esc(v).replace(/\r?\n/g,"<br>");
const dateCZ=v=>v?new Date(v+"T12:00:00").toLocaleDateString("cs-CZ"):"";

export default function PrintForms({buildings=[],currentAccountName=""}){
 const [template,setTemplate]=useState("letter");
 const [fields,setFields]=useState({recipient:"",recipientAddress:"",subject:"",greeting:"Vážení,",body:"",closing:"S pozdravem",city:"Praha",date:today(),reference:"",contact:currentAccountName,position:"",footer:"Stavební bytové družstvo Praha 8"});
 const [selectedBuilding,setSelectedBuilding]=useState("");
 const [error,setError]=useState("");
 const set=(key,value)=>setFields(prev=>({...prev,[key]:value}));
 const chooseTemplate=id=>{setTemplate(id);const t=templates[id];setFields(prev=>({...prev,subject:t.subject,greeting:t.greeting,body:t.body,closing:t.closing}))};
 const selectBuilding=id=>{setSelectedBuilding(id);const b=buildings.find(x=>String(x.id)===id);if(b)setFields(prev=>({...prev,recipient:b.legal_entity||b.name||"",recipientAddress:b.address||[b.street,b.city].filter(Boolean).join(", ")}))};
 const documentHTML=()=>`<div class="pf-paper"><header class="pf-letterhead sbd-header"><div class="sbd-logo">${SBD_LOGO}</div><div class="sbd-info"><div class="sbd-name">Stavební bytové družstvo Praha 8</div><div>Horňátecká 1772/19, 182 00 Praha 8</div><div>IČO: 00034550, DIČ: CZ 00034550, Bankovní spojení: ČSOB a.s., č.ú. 746873/0300</div><div>Zapsané v Obchodním rejstříku vedeném Městským soudem v Praze v oddílu Dr XCVIII., vložka 254</div></div></header><div class="pf-top"><div class="pf-recipient">${multiline(fields.recipient)}<br>${multiline(fields.recipientAddress)}</div><div class="pf-dateline">${esc(fields.city)}${fields.city&&fields.date?", ":""}${dateCZ(fields.date)}</div></div>${fields.reference?`<p class="pf-reference">Naše značka: ${esc(fields.reference)}</p>`:""}${fields.subject?`<h2 class="pf-subject">${multiline(fields.subject)}</h2>`:""}<main class="pf-letterbody">${fields.greeting?`<p>${multiline(fields.greeting)}</p>`:""}<div class="pf-bodytext">${multiline(fields.body)||'<span class="pf-placeholder">Zde bude text tiskopisu…</span>'}</div>${fields.closing?`<p>${multiline(fields.closing)}</p>`:""}<div class="pf-signature">${multiline(fields.contact)}${fields.position?`<small>${multiline(fields.position)}</small>`:""}</div></main><footer class="pf-footer">${multiline(fields.footer)}</footer></div>`;
 const print=()=>{
  setError("");
  const popup=window.open("","_blank");
  if(!popup){setError("Prohlížeč zablokoval tiskové okno. Povolte vyskakovací okna pro FOXA.");return}
  const styles=document.querySelector('link[href*="PrintForms.css"]');
  const css=`@page{size:A4 portrait;margin:0}html,body{margin:0;padding:0;background:white}body{font-family:Arial,Helvetica,sans-serif;color:#16222b}.pf-paper{width:210mm;min-height:297mm;padding:20mm 20mm 18mm;box-sizing:border-box;position:relative;background:white}.sbd-header{display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:9px;border-bottom:1px solid #999;break-inside:avoid;page-break-inside:avoid;background:#fff!important;color:#000!important}.sbd-logo{flex:0 0 49px;width:49px}.sbd-logo svg{display:block;width:49px;height:65px}.sbd-info{flex:1;min-width:0;font-size:8px;line-height:1.3;color:#000!important}.sbd-name{font-weight:800;font-size:11px;line-height:1.2;margin-bottom:3px;color:#000!important}.sbd-info>div{overflow-wrap:anywhere}.pf-top{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-top:25mm;min-height:23mm}.pf-recipient{font-size:12px;line-height:1.6;white-space:normal}.pf-dateline{font-size:11px;white-space:nowrap}.pf-reference{font-size:11px;margin:8mm 0 0}.pf-subject{font-size:14px;margin:15mm 0 10mm;line-height:1.4}.pf-letterbody{font-size:12px;line-height:1.6}.pf-letterbody p{margin:0 0 10mm}.pf-bodytext{min-height:32mm;overflow-wrap:anywhere}.pf-placeholder{color:#aaa}.pf-signature{margin-top:18mm;display:flex;flex-direction:column;font-weight:bold}.pf-signature small{font-size:11px;font-weight:normal}.pf-footer{position:absolute;bottom:15mm;left:20mm;right:20mm;border-top:1px solid #b5c4cf;padding-top:3mm;color:#506575;font-size:9px}@media print{.pf-placeholder{display:none}} `;
  popup.document.open();popup.document.write('<!doctype html><html lang="cs"><head><meta charset="utf-8"><title>'+esc(fields.subject||templates[template].title)+'</title><style>'+css+'</style></head><body>'+documentHTML()+'</body></html>');popup.document.close();
  popup.addEventListener("load",()=>{popup.focus();popup.print()},{once:true});
 };
 return <div className="printforms"><div className="pageheading"><div><h1>Generátor tiskopisů</h1><p>Vytvořte dopis nebo oznámení na hlavičkovém papíře SBD Praha 8 a vytiskněte jej nebo uložte jako PDF.</p></div></div>
  <div className="pf-workspace"><section className="pf-editor"><h2>Nastavení dokumentu</h2>
   <label>Typ tiskopisu<select value={template} onChange={e=>chooseTemplate(e.target.value)}>{Object.entries(templates).map(([id,t])=><option key={id} value={id}>{t.title}</option>)}</select></label>
   <label>Vyplnit příjemce z objektu<select value={selectedBuilding} onChange={e=>selectBuilding(e.target.value)}><option value="">Bez výběru objektu</option>{[...buildings].sort((a,b)=>String(a.object_number||"").localeCompare(String(b.object_number||""),"cs",{numeric:true})).map(b=><option key={b.id} value={b.id}>{b.object_number?"Objekt "+b.object_number+" – ":""}{b.name||b.address}</option>)}</select></label>
   <div className="pf-two"><label>Příjemce<input value={fields.recipient} onChange={e=>set("recipient",e.target.value)} placeholder="Jméno / SVJ / společnost"/></label><label>Adresa příjemce<textarea rows={2} value={fields.recipientAddress} onChange={e=>set("recipientAddress",e.target.value)} placeholder="Ulice, číslo, PSČ, město"/></label></div>
   <div className="pf-two"><label>Místo vystavení<input value={fields.city} onChange={e=>set("city",e.target.value)}/></label><label>Datum<input type="date" value={fields.date} onChange={e=>set("date",e.target.value)}/></label></div>
   <label>Číslo jednací / značka (nepovinné)<input value={fields.reference} onChange={e=>set("reference",e.target.value)}/></label>
   <label>Věc / nadpis<input value={fields.subject} onChange={e=>set("subject",e.target.value)}/></label>
   <label>Oslovení<input value={fields.greeting} onChange={e=>set("greeting",e.target.value)}/></label>
   <label>Text dokumentu<textarea rows={11} value={fields.body} onChange={e=>set("body",e.target.value)} placeholder="Napište obsah dopisu…"/></label>
   <label>Závěr<textarea rows={2} value={fields.closing} onChange={e=>set("closing",e.target.value)}/></label>
   <div className="pf-two"><label>Podpisující osoba<input value={fields.contact} onChange={e=>set("contact",e.target.value)}/></label><label>Funkce<input value={fields.position} onChange={e=>set("position",e.target.value)}/></label></div>
   <label>Patička dokumentu<input value={fields.footer} onChange={e=>set("footer",e.target.value)}/></label>
   {error&&<p className="error" role="alert">{error}</p>}
   <button type="button" className="primary" onClick={print}>Tisk / Uložit jako PDF</button>
   <small>PDF uložíte v tiskovém dialogu volbou „Uložit jako PDF“. Text se při úpravách nikam automaticky neukládá.</small>
  </section><section className="pf-preview"><h2>Náhled A4</h2><div className="pf-preview-scroll"><div className="pf-preview-paper" dangerouslySetInnerHTML={{__html:documentHTML()}}/></div></section></div>
 </div>;
}
