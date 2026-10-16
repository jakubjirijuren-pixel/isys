import React,{useMemo,useState} from "react";
import "./attendance-payroll.css";
import {attendanceIntervals,sumIntervals} from "./attendance-calculation.js";
const dateKey=value=>new Date(value).toLocaleDateString("sv-SE",{timeZone:"Europe/Prague"});
const minutes=ms=>Math.round(ms/60000);
const hours=ms=>(ms/3600000).toLocaleString("cs-CZ",{minimumFractionDigits:2,maximumFractionDigits:2});
const stamp=v=>new Date(v).toLocaleString("cs-CZ",{dateStyle:"short",timeStyle:"short"});
const escapeCsv=value=>'"'+String(value??"").replaceAll('"','""')+'"';
function calculate(events,month,leaveDays=[]){
 const byUser=new Map();
 for(const event of events){
  if(!byUser.has(event.user_id))byUser.set(event.user_id,[]);
  byUser.get(event.user_id).push(event);
 }
 for(const leave of leaveDays)if(!byUser.has(leave.user_id))byUser.set(leave.user_id,[]);
 const leaveSet=new Set(leaveDays.map(x=>x.user_id+"|"+x.day));
 const details=[],summary=[];
 const [year,mon]=month.split("-").map(Number);
 const daysInMonth=new Date(year,mon,0).getDate();
 for(const [id,items] of byUser){
  const {intervals,warnings}=attendanceIntervals(items);
  let total=0,totalBreak=0,days=0,issues=0,vacation=0;
  for(let day=1;day<=daysInMonth;day++){
   const from=new Date(year,mon-1,day).getTime();
   const to=new Date(year,mon-1,day+1).getTime();
   const {worked,breakMs}=sumIntervals(intervals,from,to);
   const eventsToday=items.filter(e=>{const t=new Date(e.occurred_at).getTime();return t>=from&&t<to});
   const isLeave=leaveSet.has(id+"|"+dateKey(new Date(from)));
   if(!eventsToday.length&&!worked&&!breakMs&&!isLeave)continue;
   if(isLeave)vacation++;
   const first=eventsToday[0]?.occurred_at||new Date(from).toISOString();
   const last=eventsToday[eventsToday.length-1]?.occurred_at||new Date(to).toISOString();
   const dayWarnings=[];
   if(eventsToday.some(e=>e.event_type==="doctor_start"||e.event_type==="doctor_end"))dayWarnings.push("Lékař – posoudit pro mzdy");
   if(eventsToday.some(e=>e.event_type==="in")&&eventsToday.filter(e=>e.event_type==="in").length>1)dayWarnings.push("Více příchodů – ověřit");
   if(eventsToday.length&&warnings.length)dayWarnings.push(...warnings);
   if(isLeave&&(worked>0||eventsToday.length))dayWarnings.push("Dovolená a docházka ve stejný den – prověřit");
   if(dayWarnings.length)issues++;
   if(worked>0)days++;
   total+=worked;totalBreak+=breakMs;
   details.push({id,day:dateKey(new Date(from)),worked,breakMs,first,last,vacation:isLeave,issues:[...new Set(dayWarnings)]});
  }
  summary.push({id,days,vacation,worked:total,breakMs:totalBreak,issues});
 }
 return {details:details.sort((a,b)=>a.day.localeCompare(b.day)||a.id.localeCompare(b.id)),summary};
}
function downloadCsv(filename,rows){
 const content="\ufeff"+rows.map(row=>row.map(escapeCsv).join(";")).join("\r\n");
 const url=URL.createObjectURL(new Blob([content],{type:"text/csv;charset=utf-8"}));
 const a=document.createElement("a");a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function AttendancePayroll({events,leaveDays=[],profiles,month,selected}){
 const [detailsOpen,setDetailsOpen]=useState(false);
 const names=useMemo(()=>Object.fromEntries(profiles.map(p=>[p.id,p.display_name||p.full_name||p.email||"Neznámý zaměstnanec"])),[profiles]);
 const report=useMemo(()=>calculate(events,month,leaveDays),[events,month,leaveDays]);
 const allSummaries=profiles.map(p=>report.summary.find(s=>s.id===p.id)||{id:p.id,days:0,vacation:0,worked:0,breakMs:0,issues:0});
 const visible=allSummaries.filter(s=>!selected||s.id===selected).sort((a,b)=>(names[a.id]||"").localeCompare(names[b.id]||"","cs"));
 const detail=report.details.filter(d=>!selected||d.id===selected);
 const allIssues=visible.reduce((a,s)=>a+s.issues,0);
 const exportSummary=()=>downloadCsv("isys-mzdovy-podklad-"+month+".csv",[["Zaměstnanec","Období","Dny s evidovanou prací","Dovolená (dny)","Odpracováno (hod.)","Přestávky (hod.)","Dny k prověření","Stav"],...visible.map(s=>[names[s.id]||"Neznámý zaměstnanec",month,s.days,s.vacation,hours(s.worked),hours(s.breakMs),s.issues,s.issues?"K prověření":"Bez zjištěných nesrovnalostí"])]);
 const exportDetails=()=>downloadCsv("isys-dochazka-dny-"+month+".csv",[["Zaměstnanec","Datum","První záznam","Poslední záznam","Odpracováno (hod.)","Přestávky (hod.)","Dovolená","Upozornění"],...detail.map(d=>[names[d.id]||"Neznámý zaměstnanec",d.day,d.first?stamp(d.first):"",d.last?stamp(d.last):"",hours(d.worked),hours(d.breakMs),d.vacation?"Ano":"Ne",d.issues.join("; ")])]);
 return <section className="attendance-card attendance-payroll"><div className="attendance-payroll-top"><div><h2>Měsíční podklady pro mzdy</h2><p>Souhrn za {month} pro všechny zaměstnance nebo vybraného zaměstnance.</p></div><div className="attendance-payroll-buttons"><button type="button" className="primary" onClick={exportSummary}>Export mzdového souhrnu CSV</button><button type="button" className="secondarybutton" onClick={exportDetails}>Export po dnech CSV</button></div></div>
 <div className="attendance-payroll-metrics"><div><small>Zaměstnanci</small><strong>{visible.length}</strong></div><div><small>Evidovaná práce</small><strong>{hours(visible.reduce((a,s)=>a+s.worked,0))} h</strong></div><div><small>Dny k prověření</small><strong>{allIssues}</strong></div></div>
 <p className="attendance-payroll-note">Podklad k ruční kontrole před zpracováním mezd. Služební cesty a home office se počítají jako evidovaná práce; lékař se nezapočítává automaticky a označí se ke kontrole. Schválená dovolená je vykázána samostatně ve dnech, nikoli jako odpracované hodiny. Nezahrnuje nemoc, náhrady za svátky, přesčasy, příplatky ani schvalování docházky. Individuální rozvrhy a délku směn je nutné zohlednit při zpracování mezd. Neúplné či přes půlnoc vedené směny je nutné ověřit; hodiny z nich nemusí být správně započtené.</p>
 <div className="attendance-table-wrap"><table><thead><tr><th>Zaměstnanec</th><th>Dny</th><th>Dovolená</th><th>Odpracováno</th><th>Přestávky</th><th>Ke kontrole</th></tr></thead><tbody>{visible.map(s=><tr key={s.id}><td>{names[s.id]||"Neznámý zaměstnanec"}</td><td>{s.days}</td><td>{s.vacation}</td><td>{hours(s.worked)} h</td><td>{hours(s.breakMs)} h</td><td>{s.issues?String(s.issues)+" dnů":"—"}</td></tr>)}{!visible.length&&<tr><td colSpan="6">V tomto období zatím nejsou záznamy.</td></tr>}</tbody></table></div>
 <button type="button" className="secondarybutton" onClick={()=>setDetailsOpen(x=>!x)}>{detailsOpen?"Skrýt denní rozpis":"Zobrazit denní rozpis"}</button>
 {detailsOpen&&<div className="attendance-table-wrap"><table><thead><tr><th>Zaměstnanec</th><th>Den</th><th>První / poslední záznam</th><th>Práce</th><th>Přestávka</th><th>Dovolená</th><th>Kontrola</th></tr></thead><tbody>{detail.map(d=><tr key={d.id+"-"+d.day}><td>{names[d.id]||"Neznámý zaměstnanec"}</td><td>{d.day}</td><td>{stamp(d.first)} – {stamp(d.last)}</td><td>{hours(d.worked)} h</td><td>{hours(d.breakMs)} h</td><td>{d.vacation?"Ano":"—"}</td><td>{d.issues.join(", ")||"—"}</td></tr>)}</tbody></table></div>}
 </section>;
}
