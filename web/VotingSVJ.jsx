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
 const [pointCount,setPointCount]=useState(10);
 const exportExcel=()=>{
  if(!doc.owners.length){setError("Nejdříve nahraj prezenční listinu.");return}
  const wb=XLSX.utils.book_new(),n=doc.owners.length,start=9,end=start+n-1,shareSum=doc.owners.reduce((sum,o)=>sum+number(o.share),0);
  const header=[["HLASOVACÍ TABULKA – SVJ"],["Schůze",doc.title],["Objekt",doc.building_label],["Datum",doc.meeting_date],["Vyplň do sloupce D: ANO pro přítomné, NE pro nepřítomné. Do hlasovacích sloupců: PRO / PROTI / ZDRŽEL SE."],["Celkový podíl",number(doc.denominator)||shareSum,"Podíl přítomných",null,"Účast",null],["Usnášeníschopnost posuzujte podle stanov a platných pravidel."],[],["Jednotka","Vlastník","Podíl","Přítomen",...Array.from({length:pointCount},(_,i)=>"Bod "+(i+1))]];
  const data=[...header,...doc.owners.map(o=>[o.unit,o.name,number(o.share),"",...Array(pointCount).fill("")])];
  const ws=XLSX.utils.aoa_to_sheet(data);
  ws["D6"]={t:"n",f:`SUMIF(D${start}:D${end},"ANO",C${start}:C${end})`};
  ws["F6"]={t:"n",f:"IFERROR(D6/B6,0)",z:"0.00%"};
  ws["!cols"]=[{wch:18},{wch:40},{wch:16},{wch:18},...Array(pointCount).fill({wch:19})];
  ws["!freeze"]={xSplit:4,ySplit:8};
  ws["!autofilter"]={ref:`A8:${XLSX.utils.encode_col(3+pointCount)}${end}`};
  ws["!dataValidation"]=[];
  const resultsStart=end+3;
  const labels=["PRO","PROTI","ZDRŽEL SE","NEHLASOVAL"];
  XLSX.utils.sheet_add_aoa(ws,[["VÝSLEDKY HLASOVÁNÍ (podíly)"],["Výsledek",...Array.from({length:pointCount},(_,i)=>"Bod "+(i+1))]],{origin:`A${resultsStart}`});
  labels.forEach((label,i)=>{
   const row=resultsStart+2+i;
   const cells=[label,...Array.from({length:pointCount},(_,j)=>{
    const col=XLSX.utils.encode_col(j+4);
    return {t:"n",f:label==="NEHLASOVAL"?`SUMIF($D$${start}:$D$${end},"ANO",$C$${start}:$C$${end})-SUMIF(${col}${start}:${col}${end},"PRO",$C$${start}:$C$${end})-SUMIF(${col}${start}:${col}${end},"PROTI",$C$${start}:$C$${end})-SUMIF(${col}${start}:${col}${end},"ZDRŽEL SE",$C$${start}:$C$${end})`:`SUMIFS($C$${start}:$C$${end},$D$${start}:$D$${end},"ANO",${col}${start}:${col}${end},"${label}")`};
   })];
   XLSX.utils.sheet_add_aoa(ws,[cells],{origin:`A${row}`});
  });
  const pctRow=resultsStart+7;
  XLSX.utils.sheet_add_aoa(ws,[["PODÍL Z PŘÍTOMNÝCH (%)"],["Výsledek",...Array.from({length:pointCount},(_,i)=>"Bod "+(i+1))]],{origin:`A${pctRow}`});
  labels.forEach((label,i)=>{
   const formulaRow=resultsStart+2+i;
   XLSX.utils.sheet_add_aoa(ws,[[label,...Array.from({length:pointCount},(_,j)=>({t:"n",f:`IFERROR(${XLSX.utils.encode_col(j+1)}${formulaRow}/$D$6,0)`,z:"0.00%"}))]],{origin:`A${pctRow+2+i}`});
  });
  XLSX.utils.book_append_sheet(wb,ws,"Hlasovací tabulka");
  const guide=XLSX.utils.aoa_to_sheet([["POKYNY K POUŽITÍ"],["1. Ve sloupci D vyplň ANO nebo NE pro každou jednotku."],["2. Ve sloupcích E a dalších zapisuj PRO, PROTI nebo ZDRŽEL SE."],["3. Součty a procenta se v Excelu přepočítají automaticky."],["4. Nehlasoval se počítá jako přítomný podíl bez jednoho ze tří platných hlasů."],["5. U spoluvlastnictví a SJM ověř společné hlasovací právo; před hlasováním zkontroluj údaje."],["6. Výsledek a přijetí usnesení posuzuj podle stanov a platných právních pravidel."]]);
  guide["!cols"]=[{wch:110}];XLSX.utils.book_append_sheet(wb,guide,"Pokyny");
  XLSX.writeFile(wb,`FOXA-hlasovaci-tabulka-${doc.meeting_date||"schuze"}.xlsx`);
  setNotice("Excelová hlasovací tabulka byla připravena ke stažení. Vzorce se přepočítají po otevření v Excelu.");
 };
 return <main className="foxa-vote">
 <header className="foxa-vote-head"><div><h1>Generátor hlasovací tabulky SVJ</h1><p>Ze seznamu vlastníků připraví Excel se vzorci pro použití přímo na schůzi.</p></div><div className="foxa-vote-actions"><button onClick={()=>{setDoc(empty());setBuildingQuery("");setBuildingOpen(false);setNotice("")}}>Nová tabulka</button><button disabled={!doc.owners.length} onClick={exportExcel}>Stáhnout hlasovací tabulku (.xlsx)</button></div></header>
 {error&&<div className="foxa-vote-error" role="alert">{error}</div>}{notice&&<div className="foxa-vote-notice">{notice}</div>}
 <section className="foxa-vote-card"><h2>Podklady pro tabulku</h2><div className="foxa-vote-fields"><label>Název schůze<input value={doc.title} onChange={e=>update("title",e.target.value)}/></label>
 <div className="foxa-vote-building"><label htmlFor="foxa-vote-building-search">Objekt</label><input id="foxa-vote-building-search" type="search" autoComplete="off" placeholder="Vyhledat objekt…" value={buildingOpen?buildingQuery:(doc.building_label||buildingQuery)} onFocus={()=>{setBuildingQuery("");setBuildingOpen(true)}} onChange={e=>{setBuildingQuery(e.target.value);setBuildingOpen(true);update("building_label","")}} onBlur={()=>setTimeout(()=>setBuildingOpen(false),180)}/>{buildingOpen&&<div className="foxa-vote-building-options" role="listbox">{matchingBuildings.length?matchingBuildings.map(b=><button type="button" role="option" aria-selected={doc.building_label===buildingLabel(b)} key={b.id} onMouseDown={e=>e.preventDefault()} onClick={()=>selectBuilding(b)}>{buildingLabel(b)}</button>):<div className="foxa-vote-building-empty">Žádný odpovídající objekt</div>}</div>}</div>
 <label>Datum<input type="date" value={doc.meeting_date} onChange={e=>update("meeting_date",e.target.value)}/></label><label>Počet hlasovacích bodů<input type="number" min="1" max="60" value={pointCount} onChange={e=>setPointCount(Math.max(1,Math.min(60,Number(e.target.value)||1)))}/></label></div><label className="foxa-vote-upload">Nahrát prezenční listinu (.xlsx / .xls)<input type="file" accept=".xlsx,.xls" onChange={e=>importFile(e.target.files?.[0])}/></label></section>
 <section className="foxa-vote-stats"><div><strong>{doc.owners.length}</strong><span>Importovaných záznamů</span></div><div><strong>{(number(doc.denominator)||doc.owners.reduce((a,o)=>a+number(o.share),0)).toLocaleString("cs-CZ")}</strong><span>Celkový hlasovací podíl</span></div><div><strong>{pointCount}</strong><span>Připravených hlasovacích bodů</span></div></section>
 {doc.owners.length>0&&<section className="foxa-vote-card"><h2>Kontrola importovaných vlastníků</h2><p className="foxa-vote-help">Tabulka v Excelu bude mít přesně tolik řádků, kolik je importovaných vlastníků. Zkontroluj podíly a případné společné vlastnictví.</p><div className="foxa-vote-scroll"><table><thead><tr><th>Jednotka</th><th>Vlastník</th><th>Podíl</th></tr></thead><tbody>{doc.owners.map(o=><tr key={o.id}><td>{o.unit}</td><td>{o.name}</td><td>{o.share.toLocaleString("cs-CZ")}</td></tr>)}</tbody></table></div></section>}
 <p className="foxa-vote-help">FOXA pouze generuje Excel. Hlasování se vyplňuje a počítá přímo v souboru na počítači; údaje schůze se neukládají do Supabase.</p>
 </main>;
}
