// Shared attendance calculation. Never restart an active interval when an
// administrator adds a historical arrival before an existing arrival.
const starts=new Set(["in","trip_start","homeoffice_start"]);
const ends=new Set(["out","trip_end","homeoffice_end"]);
const time=e=>new Date(e.occurred_at).getTime();
export const sorted=events=>[...events].sort((a,b)=>time(a)-time(b)||String(a.id||"").localeCompare(String(b.id||"")));
export function attendanceIntervals(events,{until=Date.now(),includeOpen=false}={}){
 const items=sorted(events);
 const intervals=[];const warnings=[];
 let start=null,kind=null,breakStart=null;
 for(const e of items){
  const t=time(e),type=e.event_type;
  if(!Number.isFinite(t))continue;
  if(starts.has(type)){
   if(start!==null){warnings.push("Opakovaný příchod – zkontrolovat záznamy");continue}
   if(breakStart!==null){warnings.push("Příchod během přestávky");breakStart=null}
   start=t;kind=type;
  }else if(type==="break_start"){
   if(start!==null){intervals.push({from:start,to:t,kind});start=null;kind=null}
   else warnings.push("Přestávka bez aktivní práce");
   breakStart=t;
  }else if(type==="break_end"){
   if(breakStart===null){warnings.push("Konec přestávky bez začátku");continue}
   intervals.push({from:breakStart,to:t,kind:"break"});
   breakStart=null;start=t;kind="in";
  }else if(ends.has(type)){
   if(start!==null){intervals.push({from:start,to:t,kind});start=null;kind=null}
   else warnings.push("Odchod bez aktivní práce");
   if(breakStart!==null){warnings.push("Odchod během přestávky");breakStart=null}
  }else if(type==="doctor_start"){
   if(start!==null){intervals.push({from:start,to:t,kind});start=null;kind=null}
   warnings.push("Lékař – posoudit pro mzdy");
  }else if(type==="doctor_end")warnings.push("Lékař – posoudit pro mzdy");
 }
 if(start!==null){warnings.push("Neukončený pracovní úsek");if(includeOpen&&until>start)intervals.push({from:start,to:until,kind})}
 if(breakStart!==null)warnings.push("Neukončená přestávka");
 return {intervals,warnings:[...new Set(warnings)]};
}
export function sumIntervals(intervals,from=-Infinity,to=Infinity){
 let worked=0,breakMs=0;
 for(const i of intervals){
  const ms=Math.max(0,Math.min(i.to,to)-Math.max(i.from,from));
  if(i.kind==="break")breakMs+=ms;else worked+=ms;
 }
 return {worked,breakMs};
}
