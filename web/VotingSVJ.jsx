import React,{useEffect,useMemo,useState} from "react";
import * as XLSX from "xlsx";
import "./VotingSVJ.css";
const empty=()=>({title:"Schůze SVJ",building_label:"",meeting_date:new Date().toISOString().slice(0,10),owners:[],points:[{id:crypto.randomUUID(),title:"Bod 1",votes:{}}],denominator:0,threshold:50,attendance:{}});
const number=v=>{const n=Number(String(v??"").replace(/\s/g,"").replace(",","."));return Number.isFinite(n)?n:0};
const norm=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
const percent=(n,d)=>d>0?(100*n/d).toLocaleString("cs-CZ",{maximumFractionDigits:2})+" %":"—";
const rowsFromSheet=sheet=>XLSX.utils.sheet_to_json(sheet,{header:1,defval:"",raw:false}).map(r=>r.map(v=>String(v??"").trim()));
function parseOwners(book){
 let best=null;
 for(const sheet of Object.values(book.Sheets)){
  const rows=rowsFromSheet(sheet);
  for(let i=0;i<Math.min(rows.length,35);i++){
   const h=rows[i].map(norm),find=(keys)=>h.findIndex(v=>keys.some(k=>v===k||v.includes(k)));
   const byt=find(["byt","jednotka","cislo bytu"]),prij=find(["prijmeni","vlastnik"]),jmeno=find(["jmeno"]),podil=find(["podil","hlas"]);
   if(byt<0||prij<0||podil<0)continue;
   const entries=rows.slice(i+1).map((r,j)=>({id:crypto.randomUUID(),unit:r[byt]||"",name:[r[prij],jmeno>=0?r[jmeno]:""].filter(Boolean).join(" ").replace(/\s+/g," ").trim(),share:number(r[podil]),sourceRow:i+j+2})).filter(r=>r.name&&r.share>0&&!/celkem|sou[cč]et|úhrnem/i.test(r.name));
   if(!best||entries.length>best.entries.length)best={entries,rows,header:i};
  }
 }
 if(!best||!best.entries.length)throw Error("Nenašel jsem sloupce byt, příjmení/jméno a podíl. Zkontroluj strukturu souboru.");
 const total=best.entries.reduce((s,x)=>s+x.share,0);
 const header=best.rows[best.header].map(norm),totalIndex=header.findIndex(x=>x==="celkem"||x.includes("celkovy"));
 const declared=totalIndex>=0?best.rows.slice(best.header+1).map(r=>number(r[totalIndex])).find(v=>v>0):0;
 return {owners:best.entries,denominator:declared||total,warning:declared&&Math.abs(declared-total)>0.01?`Součet importovaných podílů (${total}) se liší od celku uvedeného v souboru (${declared}). Zkontroluj import.`:""};
}
export default function VotingSVJ({buildings=[]}){
 const [doc,setDoc]=useState(empty),[buildingQuery,setBuildingQuery]=useState(""),[buildingOpen,setBuildingOpen]=useState(false),[notice,setNotice]=useState(""),[error,setError]=useState("");
 const update=(key,value)=>setDoc(d=>({...d,[key]:value}));
 const buildingLabel=b=>[b.object_number||b.external_id,b.name,b.address||[b.street,b.city].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
 const matchingBuildings=useMemo(()=>buildings.filter(b=>norm(buildingLabel(b)).includes(norm(buildingQuery))).slice(0,80),[buildings,buildingQuery]);
 const selectBuilding=b=>{update("building_label",buildingLabel(b));setBuildingQuery(buildingLabel(b));setBuildingOpen(false)};
 const present=useMemo(()=>doc.owners.filter(o=>doc.attendance[o.id]),[doc]);
 const total=doc.owners.reduce((s,o)=>s+number(o.share),0),presentShare=present.reduce((s,o)=>s+number(o.share),0),den=number(doc.denominator)||total;
 const quorum=den>0&&presentShare/den*100>number(doc.threshold);
 const importFile=async file=>{if(!file)return;setError("");try{const buf=await file.arrayBuffer(),wb=XLSX.read(buf,{type:"array"}),result=parseOwners(wb);setDoc(d=>({...d,owners:result.owners,denominator:result.denominator,attendance:{},points:d.points.map(p=>({...p,votes:{}}))}));setNotice(`Načteno ${result.owners.length} záznamů. ${result.warning} Před hlasováním zkontroluj vlastníky a podíly.`)}catch(e){setError(e.message)}};
 const setAttendance=(id,value)=>setDoc(d=>({...d,attendance:{...d.attendance,[id]:value}}));
 const setVote=(pointId,id,value)=>setDoc(d=>({...d,points:d.points.map(p=>p.id===pointId?{...p,votes:{...p.votes,[id]:value}}:p)}));
 const exportExcel=()=>{const wb=XLSX.utils.book_new(),summary=[["Hlasování SVJ",doc.title],["Objekt",doc.building_label],["Datum",doc.meeting_date],["Celkový podíl",den],["Podíl přítomných",presentShare],["Účast (%)",den?presentShare/den*100:0],[],["Jednotka","Vlastník","Podíl","Přítomen",...doc.points.map(p=>p.title)]];
 doc.owners.forEach(o=>summary.push([o.unit,o.name,number(o.share),doc.attendance[o.id]?"ANO":"NE",...doc.points.map(p=>doc.attendance[o.id]?(p.votes[o.id]||"NEHLASOVAL"):"NEPŘÍTOMEN")]));
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(summary),"Hlasování");
 doc.points.forEach((p,i)=>{const sums={PRO:0,PROTI:0,"ZDRŽEL SE":0,NEHLASOVAL:0};present.forEach(o=>sums[p.votes[o.id]||"NEHLASOVAL"]+=number(o.share));const data=[["Bod",p.title],["Výsledek","Podíl hlasů","% přítomných","% všech"],...Object.entries(sums).map(([k,v])=>[k,v,presentShare?100*v/presentShare:0,den?100*v/den:0])];XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(data),`Bod ${i+1}`)});
 XLSX.writeFile(wb,`FOXA-hlasovani-${doc.meeting_date||"schuze"}.xlsx`)};
 return <main className="foxa-vote">
 <header className="foxa-vote-head"><div><h1>Hlasování SVJ</h1><p>Import prezenční listiny, kontrola účasti a vážené hlasování</p></div><div className="foxa-vote-actions"><button onClick={()=>{setDoc(empty());setBuildingQuery("");setBuildingOpen(false);setNotice("")}}>Nová schůze</button><button disabled={!doc.owners.length} onClick={exportExcel}>Export Excel</button></div></header>
 {error&&<div className="foxa-vote-error" role="alert">{error}</div>}{notice&&<div className="foxa-vote-notice">{notice}</div>}
 <section className="foxa-vote-card"><h2>Schůze a import</h2><div className="foxa-vote-fields"><label>Název schůze<input value={doc.title} onChange={e=>update("title",e.target.value)}/></label>
 <div className="foxa-vote-building"><label htmlFor="foxa-vote-building-search">Objekt</label><input id="foxa-vote-building-search" type="search" autoComplete="off" placeholder="Vyhledat objekt podle názvu, adresy nebo střediska…" value={buildingOpen?buildingQuery:(doc.building_label||buildingQuery)} onFocus={()=>{setBuildingQuery("");setBuildingOpen(true)}} onChange={e=>{setBuildingQuery(e.target.value);setBuildingOpen(true);update("building_label","")}} onBlur={()=>setTimeout(()=>setBuildingOpen(false),180)}/>{buildingOpen&&<div className="foxa-vote-building-options" role="listbox">{matchingBuildings.length?matchingBuildings.map(b=><button type="button" role="option" aria-selected={doc.building_label===buildingLabel(b)} key={b.id} onMouseDown={e=>e.preventDefault()} onClick={()=>selectBuilding(b)}>{buildingLabel(b)}</button>):<div className="foxa-vote-building-empty">Žádný odpovídající objekt</div>}</div>}</div>
 <label>Datum<input type="date" value={doc.meeting_date} onChange={e=>update("meeting_date",e.target.value)}/></label></div><label className="foxa-vote-upload">Nahrát prezenční listinu (.xlsx / .xls)<input type="file" accept=".xlsx,.xls" onChange={e=>importFile(e.target.files?.[0])}/></label><p className="foxa-vote-help">Schůze se nyní neukládá na server. Po obnovení stránky se rozpracovaná data ztratí; výsledek si stáhni do Excelu.</p></section>
 <section className="foxa-vote-stats"><div><strong>{doc.owners.length}</strong><span>Záznamů vlastníků</span></div><div><strong>{percent(presentShare,den)}</strong><span>Přítomné podíly</span></div><div><strong>{quorum?"ANO":"NE"}</strong><span>Splněna nastavená hranice účasti</span></div></section>
 <section className="foxa-vote-card"><div className="foxa-vote-line"><h2>Prezenční listina</h2><label>Hranice účasti (%) <input type="number" min="0" max="100" step="0.01" value={doc.threshold} onChange={e=>update("threshold",e.target.value)}/></label><label>Celkový podíl <input type="number" min="0" value={doc.denominator} onChange={e=>update("denominator",e.target.value)}/></label></div><p className="foxa-vote-help">Hranice účasti je pouze orientační parametr; usnášeníschopnost a potřebnou většinu ověř podle stanov a zákona. Spoluvlastníky a SJM posuzuj podle jejich společného hlasovacího práva.</p><div className="foxa-vote-scroll"><table><thead><tr><th>Byt</th><th>Vlastník / vlastníci</th><th>Podíl</th><th>Přítomen / zastoupen</th></tr></thead><tbody>{doc.owners.map(o=><tr key={o.id}><td>{o.unit}</td><td>{o.name}</td><td>{o.share.toLocaleString("cs-CZ")}</td><td><input type="checkbox" checked={!!doc.attendance[o.id]} onChange={e=>setAttendance(o.id,e.target.checked)} aria-label={"Účast "+o.name}/></td></tr>)}</tbody></table></div></section>
 <section className="foxa-vote-card"><div className="foxa-vote-line"><h2>Body hlasování</h2><button onClick={()=>update("points",[...doc.points,{id:crypto.randomUUID(),title:`Bod ${doc.points.length+1}`,votes:{}}])}>+ Přidat bod</button></div>
 {doc.points.map((p,i)=>{const sums={PRO:0,PROTI:0,"ZDRŽEL SE":0,NEHLASOVAL:0};present.forEach(o=>sums[p.votes[o.id]||"NEHLASOVAL"]+=number(o.share));return <article className="foxa-vote-point" key={p.id}><div className="foxa-vote-line"><input aria-label={"Název bodu "+(i+1)} value={p.title} onChange={e=>update("points",doc.points.map(x=>x.id===p.id?{...x,title:e.target.value}:x))}/><button disabled={doc.points.length===1} onClick={()=>update("points",doc.points.filter(x=>x.id!==p.id))}>Odebrat</button></div><div className="foxa-vote-results">{Object.entries(sums).map(([k,v])=><div key={k}><strong>{percent(v,presentShare)}</strong><span>{k} ({v.toLocaleString("cs-CZ")})</span></div>)}</div><div className="foxa-vote-scroll"><table><thead><tr><th>Byt</th><th>Vlastník</th><th>Podíl</th><th>Hlas</th></tr></thead><tbody>{present.map(o=><tr key={o.id}><td>{o.unit}</td><td>{o.name}</td><td>{o.share.toLocaleString("cs-CZ")}</td><td><select value={p.votes[o.id]||""} onChange={e=>setVote(p.id,o.id,e.target.value)}><option value="">Nehlasoval</option><option>PRO</option><option>PROTI</option><option>ZDRŽEL SE</option></select></td></tr>)}</tbody></table></div></article>})}
 </section><p className="foxa-vote-help">Rozpracovaná schůze se neukládá do Supabase. Importované údaje před použitím ověř. Export neobsahuje podpisy.</p></main>
}