import React,{useEffect,useMemo,useRef,useState} from "react";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
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
   const byt=find(["byt","jednotka","cislo bytu"]),prij=find(["prijmeni","vlastnik"]),jmeno=find(["jmeno"]);
   const numerator=find(["citatel"]),denominator=find(["jmen.","jmenovatel"]);
   const shareIndex=find(["podil","hlas"]);
   const fractionFormat=numerator>=0&&denominator>=0;
   if(prij<0||(!fractionFormat&&shareIndex<0))continue;
   const entries=rows.slice(i+1).map((r,j)=>{
    const surname=r[prij]||"",given=jmeno>=0?r[jmeno]||"":"";
    const share=fractionFormat?number(r[numerator]):number(r[shareIndex]);
    const denominatorValue=fractionFormat?number(r[denominator]):0;
    return {id:crypto.randomUUID(),unit:byt>=0?r[byt]||"":"",name:[surname,given].filter(Boolean).join(" ").replace(/\\s+/g," ").trim(),surname,given,share,denominator:denominatorValue,sourceRow:i+j+2};
   }).filter(r=>r.name&&r.share>0&&!/^(celkem|sou[cč]et|úhrnem)/i.test(r.name));
   if(!best||entries.length>best.entries.length)best={entries,rows,header:i,fractionFormat};
  }
 }
 if(!best||!best.entries.length)throw Error("Nenašel jsem sloupce vlastníků a hlasovacích podílů. Podporovány jsou také listiny se sloupci čitatel a jmenovatel.");
 const total=best.entries.reduce((s,x)=>s+x.share,0);
 if(best.fractionFormat){
  const denominators=[...new Set(best.entries.map(x=>x.denominator).filter(v=>v>0))];
  if(denominators.length!==1)throw Error("V prezenční listině jsou různé nebo chybějící jmenovatele podílů. Zkontroluj soubor.");
  const declared=denominators[0];
  return {owners:best.entries,denominator:declared,warning:Math.abs(declared-total)>0.01?`Součet čitatelů (${total}) se liší od jmenovatele (${declared}). Zkontroluj úplnost seznamu.`:""};
 }
 const header=best.rows[best.header].map(norm),totalIndex=header.findIndex(x=>x==="celkem"||x.includes("celkovy"));
 const declared=totalIndex>=0?best.rows.slice(best.header+1).map(r=>number(r[totalIndex])).find(v=>v>0):0;
 return {owners:best.entries,denominator:declared||total,warning:declared&&Math.abs(declared-total)>0.01?`Součet importovaných podílů (${total}) se liší od celku uvedeného v souboru (${declared}). Zkontroluj import.`:""};
}
export default function VotingSVJ({buildings=[]}){
 const [dragActive,setDragActive]=useState(false),[selectedFile,setSelectedFile]=useState(""),[fileInputRef]=useState(()=>React.createRef()),[doc,setDoc]=useState(empty),[buildingQuery,setBuildingQuery]=useState(""),[buildingOpen,setBuildingOpen]=useState(false),[notice,setNotice]=useState(""),[error,setError]=useState("");
 const update=(key,value)=>setDoc(d=>({...d,[key]:value}));
 const buildingLabel=b=>[b.object_number||b.external_id,b.name,b.address||[b.street,b.city].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
 const matchingBuildings=useMemo(()=>buildings.filter(b=>norm(buildingLabel(b)).includes(norm(buildingQuery))).slice(0,80),[buildings,buildingQuery]);
 const selectBuilding=b=>{update("building_label",buildingLabel(b));setBuildingQuery(buildingLabel(b));setBuildingOpen(false)};
 const present=useMemo(()=>doc.owners.filter(o=>doc.attendance[o.id]),[doc]);
 const total=doc.owners.reduce((s,o)=>s+number(o.share),0),presentShare=present.reduce((s,o)=>s+number(o.share),0),den=number(doc.denominator)||total;
 const quorum=den>0&&presentShare/den*100>number(doc.threshold);
 const importFile=async file=>{if(!file)return;setError("");if(!/\.(xlsx|xls)$/i.test(file.name||"")){setError("Nahraj excelový soubor ve formátu .xlsx nebo .xls.");return}setSelectedFile(file.name);try{const buf=await file.arrayBuffer(),wb=XLSX.read(buf,{type:"array"}),result=parseOwners(wb);setDoc(d=>({...d,owners:result.owners,denominator:result.denominator,attendance:{},points:d.points.map(p=>({...p,votes:{}}))}));setNotice(`Načteno ${result.owners.length} záznamů. ${result.warning} Před hlasováním zkontroluj vlastníky a podíly.`)}catch(e){setError(e.message)}};
 const setAttendance=(id,value)=>setDoc(d=>({...d,attendance:{...d.attendance,[id]:value}}));
 const setVote=(pointId,id,value)=>setDoc(d=>({...d,points:d.points.map(p=>p.id===pointId?{...p,votes:{...p.votes,[id]:value}}:p)}));

 const exportExcel=async()=>{
  if(!doc.owners.length){setError("Nejdříve nahraj prezenční listinu.");return}
  setError("");
  try{
   const workbook=new ExcelJS.Workbook();
   workbook.creator="FOXA";workbook.calcProperties.fullCalcOnLoad=true;
   const ws=workbook.addWorksheet("hlasování",{views:[{state:"frozen",ySplit:10,topLeftCell:"A11",zoomScale:115}],pageSetup:{orientation:"landscape",fitToPage:true,fitToWidth:1,fitToHeight:0,paperSize:9}});
   [13.57,11.71,8.43,16.14,24.43,31.29,15.29,11.29,9.14].forEach((w,i)=>ws.getColumn(i+1).width=w);
   const border={bottom:{style:"thin",color:{argb:"FF8C8C8C"}}};
   const heading={name:"Arial",size:11,bold:true,color:{argb:"FF000000"}};
   const normal={name:"Arial",size:10,color:{argb:"FF000000"}};
   const set=(cell,value,style={})=>{const c=ws.getCell(cell);c.value=value;c.font={...normal,...(style.font||{})};c.alignment=style.alignment||{vertical:"middle",wrapText:true};if(style.fill)c.fill=style.fill;if(style.border)c.border=style.border;if(style.numFmt)c.numFmt=style.numFmt;return c};
   set("A1","Přítomno v %",{font:heading});
   set("B1",{formula:'SUMIFS($D:$D,$G:$G,"ano")',result:0},{numFmt:"0.00%"});
   set("A2","z přítomných",{font:heading});set("A6","ze všech",{font:heading});
   ["PRO","PROTI","ZDRŽEL"].forEach((vote,i)=>{
    const r=i+2,all=i+6;
    set("B"+r,vote,{font:heading});set("B"+all,vote,{font:heading});
    set("C"+r,{formula:`IFERROR(SUMIFS($D:$D,$G:$G,"ano",$H:$H,B${r})/SUMIFS($D:$D,$G:$G,"ano"),0)`,result:0},{numFmt:"0.00%"});
    set("C"+all,{formula:`SUMIFS($D:$D,$G:$G,"ano",$H:$H,B${all})`,result:0},{numFmt:"0.00%"});
   });
   set("C5",{formula:'IF(SUM(C2:C4)=1,"","pozor nehlasovali všichni přítomní")',result:""},{font:{bold:true,color:{argb:"FFB00000"}}});
   ws.getRow(9).height=7.5;ws.getRow(10).height=33;
   ["podíl","celkem","Č. bytu","%","příjmení","jméno","přítomen","hlasoval"].forEach((x,i)=>{
    const c=set(ws.getCell(10,i+1).address,x,{font:heading,border:{bottom:{style:"medium",color:{argb:"FF000000"}}},fill:{type:"pattern",pattern:"solid",fgColor:{argb:"FFE7E7E7"}}});
    c.alignment={horizontal:"center",vertical:"middle",wrapText:true};
   });
   const total=number(doc.denominator)||doc.owners.reduce((sum,o)=>sum+number(o.share),0);
   doc.owners.forEach((o,i)=>{
    const row=i+11;ws.getRow(row).height=30;
    const name=String(o.name||"").trim(),parts=name.split(/\\s+/),surname=parts.shift()||"",given=parts.join(" ");
    set("A"+row,number(o.share),{numFmt:"#,##0",border});
    set("B"+row,total,{numFmt:"#,##0",border});
    set("C"+row,o.unit,{border});
    set("D"+row,{formula:`IFERROR(A${row}/B${row},0)`,result:0},{numFmt:"0.00%",border});
    set("E"+row,o.surname??surname,{border});set("F"+row,o.given??given,{border});
    set("G"+row,"nepřítomen",{border,fill:{type:"pattern",pattern:"solid",fgColor:{argb:"FFF0F0F0"}}});
    set("H"+row,"_",{border,fill:{type:"pattern",pattern:"solid",fgColor:{argb:"FFFFFFD6"}}});
   });
   const last=10+doc.owners.length;
   ws.dataValidations.add(`G11:G${last}`,{type:"list",allowBlank:true,formulae:['"ano,nepřítomen"'],showErrorMessage:true,errorTitle:"Neplatná hodnota",error:"Vyber ano nebo nepřítomen."});
   ws.dataValidations.add(`H11:H${last}`,{type:"list",allowBlank:true,formulae:['"_,PRO,PROTI,ZDRŽEL"'],showErrorMessage:true,errorTitle:"Neplatná hodnota",error:"Vyber _, PRO, PROTI nebo ZDRŽEL."});
   ws.getCell("C"+(last+2)).value="kontrola";
   ws.getCell("D"+(last+2)).value={formula:`SUM(D11:D${last})`,result:0};
   ws.autoFilter={from:"A10",to:`H${last}`};
   const buffer=await workbook.xlsx.writeBuffer();
   const url=URL.createObjectURL(new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));
   const link=document.createElement("a");link.href=url;link.download=`FOXA-hlasovani-${doc.meeting_date||"schuze"}.xlsx`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
   setNotice("Stažena hlasovací tabulka podle struktury dodaného vzoru. V Excelu fungují rozbalovací nabídky i výpočty.");
  }catch(e){setError("Vytvoření Excelu selhalo: "+e.message)}
 };
 return <main className="foxa-vote">
 <header className="foxa-vote-head"><div className="foxa-vote-head-copy"><span className="foxa-vote-eyebrow">SPRÁVA SVJ · DOKUMENTY</span><h1>Generátor hlasovací tabulky</h1><p>Připravte hlasovací tabulku v Excelu z prezenční listiny vlastníků pro použití přímo na schůzi.</p></div><div className="foxa-vote-actions"><button type="button" className="foxa-vote-action-secondary" onClick={()=>{setDoc(empty());setBuildingQuery("");setBuildingOpen(false);setSelectedFile("");setNotice("");setError("")}}><span aria-hidden="true">＋</span> Nová tabulka</button><button type="button" className="foxa-vote-action-primary" disabled={!doc.owners.length} onClick={exportExcel}><span aria-hidden="true">↓</span> Stáhnout Excel (.xlsx)</button></div></header>
 {error&&<div className="foxa-vote-error" role="alert">{error}</div>}{notice&&<div className="foxa-vote-notice">{notice}</div>}
 <section className="foxa-vote-card"><h2>Podklady pro tabulku</h2><div className="foxa-vote-fields"><label>Název schůze<input value={doc.title} onChange={e=>update("title",e.target.value)}/></label>
 <div className="foxa-vote-building"><label htmlFor="foxa-vote-building-search">Objekt</label><input id="foxa-vote-building-search" type="search" autoComplete="off" placeholder="Vyhledat objekt…" value={buildingOpen?buildingQuery:(doc.building_label||buildingQuery)} onFocus={()=>{setBuildingQuery("");setBuildingOpen(true)}} onChange={e=>{setBuildingQuery(e.target.value);setBuildingOpen(true);update("building_label","")}} onBlur={()=>setTimeout(()=>setBuildingOpen(false),180)}/>{buildingOpen&&<div className="foxa-vote-building-options" role="listbox">{matchingBuildings.length?matchingBuildings.map(b=><button type="button" role="option" aria-selected={doc.building_label===buildingLabel(b)} key={b.id} onMouseDown={e=>e.preventDefault()} onClick={()=>selectBuilding(b)}>{buildingLabel(b)}</button>):<div className="foxa-vote-building-empty">Žádný odpovídající objekt</div>}</div>}</div>
 <label>Datum<input type="date" value={doc.meeting_date} onChange={e=>update("meeting_date",e.target.value)}/></label></div><div className={"foxa-vote-dropzone"+(dragActive?" is-dragging":"")} role="button" tabIndex={0} aria-label="Nahrát nebo přetáhnout prezenční listinu" onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();fileInputRef.current?.click()}}} onClick={()=>fileInputRef.current?.click()} onDragEnter={e=>{e.preventDefault();e.stopPropagation();setDragActive(true)}} onDragOver={e=>{e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect="copy";setDragActive(true)}} onDragLeave={e=>{e.preventDefault();e.stopPropagation();if(!e.currentTarget.contains(e.relatedTarget))setDragActive(false)}} onDrop={e=>{e.preventDefault();e.stopPropagation();setDragActive(false);importFile(e.dataTransfer.files?.[0])}}><input ref={fileInputRef} className="foxa-vote-file-hidden" type="file" accept=".xlsx,.xls" tabIndex={-1} onClick={e=>e.stopPropagation()} onChange={e=>{importFile(e.target.files?.[0]);e.target.value=""}}/><span className="foxa-vote-drop-icon" aria-hidden="true">⇧</span><strong>{dragActive?"Pusť soubor pro nahrání":"Přetáhni sem prezenční listinu"}</strong><span>nebo <span className="foxa-vote-drop-link">vyber soubor</span> z počítače (.xlsx / .xls)</span>{selectedFile&&<span className="foxa-vote-selected">Vybráno: {selectedFile}</span>}</div></section>
 <section className="foxa-vote-stats"><div><strong>{doc.owners.length}</strong><span>Importovaných záznamů</span></div><div><strong>{(number(doc.denominator)||doc.owners.reduce((a,o)=>a+number(o.share),0)).toLocaleString("cs-CZ")}</strong><span>Celkový hlasovací podíl</span></div><div><strong>1</strong><span>Aktuální hlasovací bod v Excelu</span></div></section>
 {doc.owners.length>0&&<section className="foxa-vote-card"><h2>Kontrola importovaných vlastníků</h2><p className="foxa-vote-help">Tabulka v Excelu bude mít přesně tolik řádků, kolik je importovaných vlastníků. Zkontroluj podíly a případné společné vlastnictví.</p><div className="foxa-vote-scroll"><table><thead><tr><th>Jednotka</th><th>Vlastník</th><th>Podíl</th></tr></thead><tbody>{doc.owners.map(o=><tr key={o.id}><td>{o.unit}</td><td>{o.name}</td><td>{o.share.toLocaleString("cs-CZ")}</td></tr>)}</tbody></table></div></section>}
 <p className="foxa-vote-help">FOXA pouze generuje Excel. Hlasování se vyplňuje a počítá přímo v souboru na počítači; údaje schůze se neukládají do Supabase.</p>
 </main>;
}
