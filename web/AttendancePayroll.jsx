import React,{useMemo,useState} from "react";
import "./attendance-payroll.css";
const dateKey=value=>new Date(value).toLocaleDateString("sv-SE",{timeZone:"Europe/Prague"});
const minutes=ms=>Math.round(ms/60000);
const hours=ms=>(ms/3600000).toLocaleString("cs-CZ",{minimumFractionDigits:2,maximumFractionDigits:2});
const stamp=v=>new Date(v).toLocaleString("cs-CZ",{dateStyle:"short",timeStyle:"short"});
const escapeCsv=value=>'"'+String(value??"").replaceAll('"','""')+'"';
function calculate(events,month){
 const byUser=new Map();
 for(const event of events){
  if(!byUser.has(event.user_id))byUser.set(event.user_id,[]);
  byUser.get(event.user_id).push(event);
 }
 const details=[],summary=[];
 for(const [id,items] of byUser){
  items.sort((a,b)=>new Date(a.occurred_at)-new Date(b.occurred_at));
  let day=null,started=null,worked=0,breakStarted=null,breakMs=0,first=null,last=null,issues=[];
  const flush=()=>{
   if(!day)return;
   if(started!==null)issues.push("Neukončený pracovní úsek");
   if(breakStarted!==null)issues.push("Neukončená přestávka");
   details.push({id,day,worked,breakMs,first,last,issues:[...new Set(issues)]});
  };
  for(const e of items){
   const current=dateKey(e.occurred_at),t=new Date(e.occurred_at).getTime();
   if(day!==current){flush();day=current;started=null;worked=0;breakStarted=null;breakMs=0;first=null;last=null;issues=[]}
   if(first===null)first=e.occurred_at;last=e.occurred_at;
   if(e.event_type==="in"){
    if(started!==null||breakStarted!==null)issues.push("Opakovaný příchod");
    started=t;breakStarted=null;
   }else if(e.event_type==="break_start"){
    if(started===null)issues.push("Přestávka bez začátku práce");
    else{worked+=Math.max(0,t-started);started=null;breakStarted=t}
   }else if(e.event_type==="break_end"){
    if(breakStarted===null)issues.push("Konec přestávky bez začátku");
    else{breakMs+=Math.max(0,t-breakStarted);breakStarted=null;started=t}
   }else if(e.event_type==="out"){
    if(started===null)issues.push("Odchod bez aktivní práce");
    else{worked+=Math.max(0,t-started);started=null}
    if(breakStarted!==null){issues.push("Odchod během přestávky");breakStarted=null}
   }
  }
  flush();
 }
 for(const [id] of byUser){
  const rows=details.filter(d=>d.id===id);
  summary.push({id,days:rows.filter(d=>d.worked>0).length,worked:rows.reduce((a,d)=>a+d.worked,0),breakMs:rows.reduce((a,d)=>a+d.breakMs,0),issues:rows.filter(d=>d.issues.length).length});
 }
 return {details:details.sort((a,b)=>a.day.localeCompare(b.day)||a.id.localeCompare(b.id)),summary};
}
function downloadCsv(filename,rows){
 const content="\ufeff"+rows.map(row=>row.map(escapeCsv).join(";")).join("\r\n");
 const url=URL.createObjectURL(new Blob([content],{type:"text/csv;charset=utf-8"}));
 const a=document.createElement("a");a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function AttendancePayroll({events,profiles,month,selected}){
 const [detailsOpen,setDetailsOpen]=useState(false);
 const names=useMemo(()=>Object.fromEntries(profiles.map(p=>[p.id,p.display_name||p.full_name||p.email||"Neznámý zaměstnanec"])),[profiles]);
 const report=useMemo(()=>calculate(events,month),[events,month]);
 const allSummaries=profiles.map(p=>report.summary.find(s=>s.id===p.id)||{id:p.id,days:0,worked:0,breakMs:0,issues:0});
 const visible=allSummaries.filter(s=>!selected||s.id===selected).sort((a,b)=>(names[a.id]||"").localeCompare(names[b.id]||"","cs"));
 const detail=report.details.filter(d=>!selected||d.id===selected);
 const allIssues=visible.reduce((a,s)=>a+s.issues,0);
 const exportSummary=()=>downloadCsv("isys-mzdovy-podklad-"+month+".csv",[["Zaměstnanec","Období","Dny s evidovanou prací","Odpracováno (hod.)","Přestávky (hod.)","Dny k prověření","Stav"],...visible.map(s=>[names[s.id]||"Neznámý zaměstnanec",month,s.days,hours(s.worked),hours(s.breakMs),s.issues,s.issues?"K prověření":"Bez zjištěných nesrovnalostí"])]);
 const exportDetails=()=>downloadCsv("isys-dochazka-dny-"+month+".csv",[["Zaměstnanec","Datum","První záznam","Poslední záznam","Odpracováno (hod.)","Přestávky (hod.)","Upozornění"],...detail.map(d=>[names[d.id]||"Neznámý zaměstnanec",d.day,d.first?stamp(d.first):"",d.last?stamp(d.last):"",hours(d.worked),hours(d.breakMs),d.issues.join("; ")])]);
 return <section className="attendance-card attendance-payroll"><div className="attendance-payroll-top"><div><h2>Měsíční podklady pro mzdy</h2><p>Souhrn za {month} pro všechny zaměstnance nebo vybraného zaměstnance.</p></div><div className="attendance-payroll-buttons"><button type="button" className="primary" onClick={exportSummary}>Export mzdového souhrnu CSV</button><button type="button" className="secondarybutton" onClick={exportDetails}>Export po dnech CSV</button></div></div>
 <div className="attendance-payroll-metrics"><div><small>Zaměstnanci</small><strong>{visible.length}</strong></div><div><small>Evidovaná práce</small><strong>{hours(visible.reduce((a,s)=>a+s.worked,0))} h</strong></div><div><small>Dny k prověření</small><strong>{allIssues}</strong></div></div>
 <p className="attendance-payroll-note">Podklad k ruční kontrole před zpracováním mezd. Nezahrnuje dovolenou, nemoc, svátky, přesčasy, příplatky ani schvalování docházky. Neúplné či přes půlnoc vedené směny je nutné ověřit; hodiny z nich nemusí být správně započtené.</p>
 <div className="attendance-table-wrap"><table><thead><tr><th>Zaměstnanec</th><th>Dny</th><th>Odpracováno</th><th>Přestávky</th><th>Ke kontrole</th></tr></thead><tbody>{visible.map(s=><tr key={s.id}><td>{names[s.id]||"Neznámý zaměstnanec"}</td><td>{s.days}</td><td>{hours(s.worked)} h</td><td>{hours(s.breakMs)} h</td><td>{s.issues?String(s.issues)+" dnů":"—"}</td></tr>)}{!visible.length&&<tr><td colSpan="5">V tomto období zatím nejsou záznamy.</td></tr>}</tbody></table></div>
 <button type="button" className="secondarybutton" onClick={()=>setDetailsOpen(x=>!x)}>{detailsOpen?"Skrýt denní rozpis":"Zobrazit denní rozpis"}</button>
 {detailsOpen&&<div className="attendance-table-wrap"><table><thead><tr><th>Zaměstnanec</th><th>Den</th><th>První / poslední záznam</th><th>Práce</th><th>Přestávka</th><th>Kontrola</th></tr></thead><tbody>{detail.map(d=><tr key={d.id+"-"+d.day}><td>{names[d.id]||"Neznámý zaměstnanec"}</td><td>{d.day}</td><td>{stamp(d.first)} – {stamp(d.last)}</td><td>{hours(d.worked)} h</td><td>{hours(d.breakMs)} h</td><td>{d.issues.join(", ")||"—"}</td></tr>)}</tbody></table></div>}
 </section>;
}
