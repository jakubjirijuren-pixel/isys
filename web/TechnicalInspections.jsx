import React,{useEffect,useMemo,useState} from "react";
import "./technical-inspections.css";

const GROUPS=[
 ["21","STŘECHA",["Krytina","Klempířské prvky","Komíny a ventilace","Hromosvody"]],
 ["22","FASÁDA",["Lodžie","Balkony","Plášť"]],
 ["23","SPOLEČNÉ PROSTORY",["Chodby","Sklepy","Schodiště","Ostatní"]],
 ["24","OKNA",["Společné prostory","Bytové jednotky"]],
 ["25","DVEŘE",["Domovní – vchodové","Vnitřní společné prostory","Balkonové"]],
 ["26","ROZVODY ZTI",["Plynové ležaté rozvody","Plynové stoupací potrubí","Studená voda – ležaté rozvody","Studená voda – stoupací potrubí","Teplá užitková voda – ležaté rozvody","Teplá užitková voda – stoupací potrubí","Kanalizace – ležaté rozvody","Kanalizace – stoupací potrubí","Požární voda – ležaté rozvody","Požární voda – stoupací potrubí"]],
 ["27","ELEKTROINSTALACE",["Rozvody – společné prostory","Osvětlení","Domovní zvonky"]],
 ["28","VYTÁPĚNÍ",["Rozvody ÚT – ležaté","Rozvody ÚT – stoupací","Tělesa ÚT","Měřidla","Termoregulace"]],
 ["29","VÝTAHY",[]],["30","OSTATNÍ",["Strojní vybavení"]],["31","KOTELNA",[]],["32","VÝMĚNÍKOVÁ STANICE",[]]
];
const REVISIONS=["NTL – plynové rozvody","Elektro – rozvody","Hromosvody","Hydranty","Studená voda","Teplá užitková voda"];
const fresh=()=>({buildingId:"",date:new Date().toLocaleDateString("en-CA"),svj:"",representative:"",technician:"",address:"",cadastral:"",revisions:{},items:{},signatureSVJ:"",signatureTechnician:"",signedSVJDate:"",signedTechnicianDate:""});
const esc=x=>String(x??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const czDate=x=>x?new Date(x+"T12:00:00").toLocaleDateString("cs-CZ"):"";
const itemId=(g,i)=>g+"-"+String(i+1).padStart(2,"0");
export default function TechnicalInspections({buildings=[],userEmail="",currentAccountName="",reportSignature}){
 const key="foxa-technical-inspection-draft-"+userEmail;
 const [data,setData]=useState(()=>{try{return {...fresh(),...JSON.parse(localStorage.getItem(key)||"null")}}catch{return fresh()}});
 const [notice,setNotice]=useState("");
 const [search,setSearch]=useState("");
 const [open,setOpen]=useState({});
 const set=(name,value)=>setData(p=>({...p,[name]:value}));
 const updateRev=(name,field,value)=>setData(p=>({...p,revisions:{...p.revisions,[name]:{...p.revisions[name],[field]:value}}}}));
 const updateItem=(id,field,value)=>setData(p=>({...p,items:{...p.items,[id]:{...p.items[id],[field]:value}}}}));
 const selected=buildings.find(b=>String(b.id)===String(data.buildingId));
 const matches=useMemo(()=>buildings.filter(b=>[b.name,b.address,b.street,b.city,b.ico].some(v=>String(v||"").toLowerCase().includes(search.toLowerCase()))).slice(0,35),[buildings,search]);
 const choose=b=>{setData(p=>({...p,buildingId:String(b.id),address:[b.address,b.street,b.city].filter(Boolean).join(", ")||b.name||"",svj:b.name||p.svj,technician:currentAccountName||p.technician}));setSearch("");};
 const save=()=>{try{localStorage.setItem(key,JSON.stringify(data));setNotice("Koncept technické kontroly uložen v tomto prohlížeči.")}catch{setNotice("Koncept se nepodařilo uložit.")}};
 const clear=()=>{if(!window.confirm("Opravdu vymazat rozpracovanou technickou kontrolu?"))return;setData(fresh());localStorage.removeItem(key);setNotice("Formulář byl vymazán.")};
 const print=()=>{
  if(!data.buildingId){setNotice("Nejprve vyberte objekt.");return}
  const logo=document.querySelector(".inspectionmodule .sbd-logo svg")?.outerHTML||"";
  const rows=GROUPS.map(([code,name,items])=>{
   const head='<tr class="group"><td>'+code+'</td><td>'+esc(name)+'</td><td colspan="3"></td></tr>';
   const child=(items.length?items:[""]).map((label,i)=>{if(!label)return "";const row=data.items[itemId(code,i)]||{};return '<tr><td>'+itemId(code,i)+'</td><td>'+esc(label)+'</td><td>'+esc(row.state)+'</td><td>'+esc(row.repair)+'</td><td>'+esc(row.deadline)+'</td></tr>'}).join("");
   const general=data.items[code]||{};
   return head+child+(items.length?"":'<tr><td></td><td></td><td>'+esc(general.state)+'</td><td>'+esc(general.repair)+'</td><td>'+esc(general.deadline)+'</td></tr>');
  }).join("");
  const revRows=REVISIONS.map(name=>{const r=data.revisions[name]||{};return '<tr><td>'+esc(name)+'</td><td>'+esc(czDate(r.last))+'</td><td>'+esc(czDate(r.next))+'</td><td>'+esc(r.removal)+'</td></tr>'}).join("");
  const html='<!doctype html><html lang="cs"><head><meta charset="utf-8"><title>Technická kontrola – SBD Praha 8</title><style>@page{size:A4;margin:17mm 13mm}*{box-sizing:border-box}body{font:10px Arial,sans-serif;color:#111}header{display:flex;align-items:center;gap:14px;border-bottom:2px solid #111;padding-bottom:9px;margin-bottom:12px}.logo{width:48px}.logo svg{width:48px;height:65px}.identity{font-size:10px}.identity strong{font-size:15px}h1{text-align:center;font-size:18px;margin:15px 0}table{width:100%;border-collapse:collapse;table-layout:fixed;margin:10px 0}td,th{border:1px solid #222;padding:5px 6px;vertical-align:top;overflow-wrap:anywhere}th{background:#e6e6e6}.group{font-weight:700;background:#eee}.detail th:nth-child(1){width:10%}.detail th:nth-child(2){width:25%}.detail th:nth-child(3){width:25%}.detail th:nth-child(4){width:25%}.detail th:nth-child(5){width:15%}tr{break-inside:avoid}.sign{display:flex;justify-content:space-between;gap:35px;margin-top:32px}.sign>div{width:47%}.signline{margin-top:40px;border-top:1px solid #333;padding-top:6px}.meta td:first-child{width:32%}.rev th:first-child{width:32%}footer{text-align:center;font-size:9px;margin-top:20px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><header><div class="logo">'+logo+'</div><div class="identity"><strong>Stavební bytové družstvo Praha 8</strong><div>SBD Praha 8 · Technický úsek</div><div>FOXA – interní systém správy objektů</div></div></header><h1>Zápis z technické kontroly</h1><table class="meta"><tr><td><b>Datum kontroly</b></td><td>'+esc(czDate(data.date))+'</td></tr><tr><td><b>Společenství vlastníků / objekt</b></td><td>'+esc(data.svj||selected?.name)+'</td></tr><tr><td><b>Adresa</b></td><td>'+esc(data.address)+'</td></tr><tr><td><b>Katastrální území</b></td><td>'+esc(data.cadastral)+'</td></tr><tr><td><b>Za SBD Praha 8</b></td><td>'+esc(data.technician||currentAccountName)+'</td></tr><tr><td><b>Za SVJ</b></td><td>'+esc(data.representative)+'</td></tr></table><h2>Revize a kontroly</h2><table class="rev"><thead><tr><th>Revize</th><th>Poslední</th><th>Příští</th><th>Odstranění závad</th></tr></thead><tbody>'+revRows+'</tbody></table><h2>Technický stav objektu</h2><table class="detail"><thead><tr><th>Č. kp.</th><th>Název</th><th>Současný stav</th><th>Návrh oprav</th><th>Termín provedení</th></tr></thead><tbody>'+rows+'</tbody></table><div class="sign"><div><b>Za SVJ</b><div>'+esc(data.representative)+'</div><div class="signline">Podpis</div><p>Datum: '+esc(czDate(data.signedSVJDate))+'</p></div><div><b>Za SBD Praha 8</b><div>'+esc(data.technician||currentAccountName)+'</div><div class="signline">Podpis</div><p>Datum: '+esc(czDate(data.signedTechnicianDate))+'</p></div></div><footer>SBD Praha 8 · Zápis z technické kontroly · Vytvořeno v systému FOXA</footer><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>';
  const win=window.open("","_blank");if(!win){setNotice("Povolte vyskakovací okna pro vytvoření PDF.");return}win.document.write(html);win.document.close();
 };
 return <div className="technicalmodule"><header className="technicalhead"><div><h1>Technické kontroly objektů</h1><p>Zápis podle předlohy technické kontroly. Tiskopis se stylotypem SBD Praha 8.</p></div><div className="technicalbuttons"><button type="button" onClick={save}>Uložit koncept</button><button type="button" onClick={print}>Tisk / PDF</button><button type="button" className="technicalclear" onClick={clear}>Nová kontrola</button></div></header>
 {notice&&<p role="status" className="technicalnotice">{notice}</p>}
 <section className="technicalpanel"><h2>Základní údaje</h2><div className="technicalfields">
 <label>Objekt *<input type="search" placeholder="Vyhledat objekt podle adresy nebo názvu" value={search} onChange={e=>setSearch(e.target.value)}/><select value={data.buildingId} onChange={e=>{const b=buildings.find(x=>String(x.id)===e.target.value);if(b)choose(b)}}><option value="">Vyberte objekt</option>{(search?matches:buildings).map(b=><option key={b.id} value={b.id}>{b.name||b.address||b.street||b.id} {b.address&&b.name?"– "+b.address:""}</option>)}</select></label>
 <label>Datum kontroly<input type="date" value={data.date||""} onChange={e=>set("date",e.target.value)}/></label>
 <label>Společenství vlastníků<input value={data.svj||""} onChange={e=>set("svj",e.target.value)}/></label>
 <label>Adresa objektu<input value={data.address||""} onChange={e=>set("address",e.target.value)}/></label>
 <label>Katastrální území<input value={data.cadastral||""} onChange={e=>set("cadastral",e.target.value)}/></label>
 <label>Za SBD Praha 8 – technik<input value={data.technician||""} onChange={e=>set("technician",e.target.value)}/></label>
 <label>Za SVJ – zástupce<input value={data.representative||""} onChange={e=>set("representative",e.target.value)}/></label>
 </div></section>
 <section className="technicalpanel"><h2>Revize</h2><div className="technicaltablewrap"><table className="technicaltable"><thead><tr><th>Revize</th><th>Poslední</th><th>Příští</th><th>Odstranění závad</th></tr></thead><tbody>{REVISIONS.map(name=><tr key={name}><th>{name}</th>{["last","next"].map(field=><td key={field}><input aria-label={name+" "+field} type="date" value={data.revisions?.[name]?.[field]||""} onChange={e=>updateRev(name,field,e.target.value)}/></td>)}<td><input aria-label={name+" odstranění závad"} value={data.revisions?.[name]?.removal||""} onChange={e=>updateRev(name,"removal",e.target.value)}/></td></tr>)}</tbody></table></div></section>
 <section className="technicalpanel"><h2>Technický stav objektu</h2><p>U každé položky vyplňte současný stav, návrh oprav a termín provedení. Nevyplněná pole zůstanou v tiskopisu prázdná.</p>{GROUPS.map(([code,title,items])=><div className="technicalgroup" key={code}><button type="button" className="technicalgrouphead" onClick={()=>setOpen(p=>({...p,[code]:p[code]===false?true:false}))} aria-expanded={open[code]!==false}><strong>{code} – {title}</strong><span>{open[code]===false?"Rozbalit":"Sbalit"}</span></button>{open[code]!==false&&<div className="technicalrows">{(items.length?items.map((label,i)=>[itemId(code,i),label]):[[code,title]]).map(([id,label])=><div className="technicalrow" key={id}><strong>{id} – {label}</strong><label>Současný stav<textarea rows="2" value={data.items?.[id]?.state||""} onChange={e=>updateItem(id,"state",e.target.value)}/></label><label>Návrh oprav<textarea rows="2" value={data.items?.[id]?.repair||""} onChange={e=>updateItem(id,"repair",e.target.value)}/></label><label>Termín provedení<input value={data.items?.[id]?.deadline||""} onChange={e=>updateItem(id,"deadline",e.target.value)} placeholder="Termín nebo poznámka"/></label></div>)}</div>}</div>)}</section>
 <section className="technicalpanel"><h2>Potvrzení kontroly</h2><div className="technicalfields"><label>Datum za SVJ<input type="date" value={data.signedSVJDate||""} onChange={e=>set("signedSVJDate",e.target.value)}/></label><label>Datum za SBD Praha 8<input type="date" value={data.signedTechnicianDate||""} onChange={e=>set("signedTechnicianDate",e.target.value)}/></label></div><p>V tiskopisu jsou vyhrazená místa pro podpis zástupce SVJ a technika SBD Praha 8.</p></section>
 <div className="technicalbuttons technicalbottom"><button onClick={save}>Uložit koncept</button><button onClick={print}>Vytvořit tiskopis / PDF</button></div>
 </div>;
}
