import React,{useEffect,useState} from "react";
import "./tasks.css";
const statuses=["nový","přidělený","v řešení","čeká na kontrolu","vráceno k dopracování","uzavřený"];
const empty={building_id:"",title:"",description:"",priority:"běžná",technician:"",assigned_user_id:null,referent:"",due_date:""};
export default function Tasks({supabase,buildings,myReferent,myTechnician,userId,userEmail,initialFilter="otevřené"}){
 const [items,setItems]=useState([]),[events,setEvents]=useState([]),[selected,setSelected]=useState(null),[draft,setDraft]=useState(empty),[creating,setCreating]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[filter,setFilter]=useState(initialFilter),[note,setNote]=useState(""),[resolution,setResolution]=useState(""),[handoffTo,setHandoffTo]=useState(""),[handoffReason,setHandoffReason]=useState("");
 const [actorNames,setActorNames]=useState({});
 const [assignees,setAssignees]=useState([]);
 useEffect(()=>{let active=true;supabase.from("profiles").select("*").then(({data,error})=>{if(!active||error)return;const names={};for(const p of data||[]){const label=[p.full_name,p.display_name,p.name,p.email].find(x=>typeof x==="string"&&x.trim());if(label)names[p.id]=label}setActorNames(names)});return()=>{active=false}},[supabase]);
 useEffect(()=>{
  let active=true;
  supabase.rpc("isys_task_assignees").then(({data,error})=>{
   if(!active)return;
   if(error){setNotice("Seznam řešitelů se nepodařilo načíst: "+error.message);return;}
   setAssignees((data||[]).map(p=>({id:p.id,label:p.display_name||"Uživatel"})));
  });
  return()=>{active=false};
 },[supabase]);
 const assigneeLabel=id=>assignees.find(a=>a.id===id)?.label||"Nepřiřazeno";
 const actorLabel=e=>e.actor_email||actorNames[e.actor_id]||(e.actor_id===userId?userEmail||"Já":"Uživatel "+String(e.actor_id||"").slice(0,8));
 const technicians=[...new Set(buildings.map(b=>b.manager).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"cs"));
 const buildingName=id=>{const b=buildings.find(b=>String(b.id)===String(id));return b?(b.object_number?"Objekt "+b.object_number+" – ":"")+(b.street||b.name||b.address):"Bez objektu"};
 const saveToCalendar=request=>{
  if(!request?.due_date)return;
  const escapeIcs=value=>String(value??"").replace(/\\/g,"\\\\").replace(/\r?\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;");
  const date=request.due_date.replaceAll("-","");
  const next=new Date(request.due_date+"T12:00:00");next.setDate(next.getDate()+1);
  const end=[next.getFullYear(),String(next.getMonth()+1).padStart(2,"0"),String(next.getDate()).padStart(2,"0")].join("");
  const stamp=new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
  const description=["Požadavek iSYS",request.description||"", "Objekt: "+buildingName(request.building_id),"Technik: "+(request.technician||"nepřiřazen"),"Referent: "+(request.referent||"—"),"Priorita: "+request.priority,"Stav: "+request.status].filter(Boolean).join("\n");
  const ics=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//iSYS//Pracovni pozadavky//CS","CALSCALE:GREGORIAN","METHOD:PUBLISH","BEGIN:VEVENT","UID:"+request.id+"@isys","DTSTAMP:"+stamp,"DTSTART;VALUE=DATE:"+date,"DTEND;VALUE=DATE:"+end,"SUMMARY:"+escapeIcs(request.title),"DESCRIPTION:"+escapeIcs(description),"END:VEVENT","END:VCALENDAR"].join("\r\n")+"\r\n";
  const url=URL.createObjectURL(new Blob([ics],{type:"text/calendar;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download="isys-ukol-"+request.id.slice(0,8)+".ics";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  setNotice("Kalendářový soubor byl stažen. Otevři ho nebo importuj do svého kalendáře.");
 };
 const load=async()=>{const {data,error}=await supabase.from("work_requests").select("*").order("created_at",{ascending:false}).limit(300);if(error)setNotice("Načtení úkolů selhalo: "+error.message);else setItems(data||[])};
 useEffect(()=>{load()},[]);
 useEffect(()=>{setFilter(initialFilter)},[initialFilter]);
 useEffect(()=>{if(!selected)return;setSelected(items.find(x=>x.id===selected.id)||selected)},[items]);
 useEffect(()=>{if(!selected){setEvents([]);return}let active=true;supabase.from("work_request_events").select("*").eq("request_id",selected.id).order("created_at",{ascending:false}).then(({data})=>{if(active)setEvents(data||[])});return()=>{active=false}},[selected?.id]);
 const create=async e=>{e.preventDefault();if(!draft.building_id||!draft.title.trim())return setNotice("Vyber objekt a vyplň název požadavku.");setBusy(true);setNotice("");
  const payload={...draft,title:draft.title.trim(),description:draft.description.trim(),technician:draft.assigned_user_id?assigneeLabel(draft.assigned_user_id):"",assigned_user_id:draft.assigned_user_id||null,referent:draft.referent||"",due_date:draft.due_date||null,created_by:userId,updated_by:userId,status:draft.assigned_user_id?"přidělený":"nový"};
  const {data,error}=await supabase.from("work_requests").insert(payload).select().single();
  if(error)setNotice("Požadavek se nepodařilo uložit: "+error.message);
  else{await supabase.from("work_request_events").insert({request_id:data.id,actor_id:userId,actor_email:userEmail||null,status:data.status,note:"Požadavek vytvořen"});setDraft(empty);setCreating(false);setSelected(data);setNotice("Požadavek byl vytvořen.");await load()}
  setBusy(false);
 };
 const update=async(status,details={})=>{if(!selected||busy)return;setBusy(true);setNotice("");
  const changes={...details,status,updated_by:userId,updated_at:new Date().toISOString()};
  if(status==="čeká na kontrolu")changes.finished_at=new Date().toISOString();
  if(status==="uzavřený")changes.reviewed_at=new Date().toISOString();
  if(status==="v řešení"||status==="vráceno k dopracování")changes.reviewed_at=null;
  const {error}=await supabase.from("work_requests").update(changes).eq("id",selected.id);
  if(error)setNotice("Změna se nezdařila: "+error.message);
  else{const historyNote=details.review_note||details.resolution||note||"";const {error:historyError}=await supabase.from("work_request_events").insert({request_id:selected.id,actor_id:userId,actor_email:userEmail||null,status,note:historyNote});if(historyError)setNotice("Stav uložen, ale zápis historie selhal: "+historyError.message);else setNotice("Stav požadavku aktualizován.");setNote("");await load();const {data}=await supabase.from("work_request_events").select("*").eq("request_id",selected.id).order("created_at",{ascending:false});setEvents(data||[])}
  setBusy(false);
 };
 const handoff=async()=>{if(!selected||busy)return;const next=handoffTo.trim();if(!next||next===selected.assigned_user_id){setNotice("Vyber jiného technika, kterému chceš požadavek předat.");return}setBusy(true);setNotice("");
  const previous=selected.technician||"nepřiřazen";const nextName=assigneeLabel(next);const newStatus=selected.status==="uzavřený"?"uzavřený":"přidělený";
  const {error}=await supabase.from("work_requests").update({technician:nextName,assigned_user_id:next,status:newStatus,updated_by:userId,updated_at:new Date().toISOString()}).eq("id",selected.id);
  if(error)setNotice("Předání požadavku selhalo: "+error.message);
  else{const description="Předání požadavku: "+previous+" → "+nextName+(handoffReason.trim()?"\nDůvod: "+handoffReason.trim():"");const {error:historyError}=await supabase.from("work_request_events").insert({request_id:selected.id,actor_id:userId,actor_email:userEmail||null,status:newStatus,note:description});setNotice(historyError?"Požadavek byl předán, ale zápis do historie selhal: "+historyError.message:"Požadavek byl předán technikovi "+nextName+".");setHandoffTo("");setHandoffReason("");await load();const {data}=await supabase.from("work_request_events").select("*").eq("request_id",selected.id).order("created_at",{ascending:false});setEvents(data||[])}
  setBusy(false);
 };
 const filtered=items.filter(x=>filter==="po termínu"?(x.status!=="uzavřený"&&x.due_date&&x.due_date<(()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")})()):filter==="vše"||filter==="moje"?(filter==="vše"||x.assigned_user_id===userId):filter==="ke kontrole"?x.status==="čeká na kontrolu":x.status!=="uzavřený");
 const counts={open:items.filter(x=>x.status!=="uzavřený").length,review:items.filter(x=>x.status==="čeká na kontrolu").length,closed:items.filter(x=>x.status==="uzavřený").length};
 return <div className="tasks"><header className="tasksheader"><div><h1>Úkoly a požadavky</h1><p>Od zadání referentem až po kontrolu provedené práce.</p></div><button className="primary" onClick={()=>{setCreating(v=>!v);setSelected(null)}}>{creating?"Zavřít formulář":"+ Nový požadavek"}</button></header>
 {notice&&<div className="notice" role="status">{notice}</div>}
 <div className="taskstats"><div><strong>{counts.open}</strong><span>Otevřené</span></div><div><strong>{counts.review}</strong><span>Ke kontrole</span></div><div><strong>{counts.closed}</strong><span>Uzavřené</span></div></div>
 {creating&&<form className="taskform" onSubmit={create}><h2>Nový požadavek</h2><div className="taskgrid"><label>Objekt *<select required value={draft.building_id} onChange={e=>{const b=buildings.find(x=>String(x.id)===e.target.value);setDraft(d=>({...d,building_id:e.target.value,technician:"",assigned_user_id:null,referent:b?.referent||myReferent||""}))}}><option value="">Vyber objekt…</option>{buildings.map(b=><option key={b.id} value={b.id}>{buildingName(b.id)}</option>)}</select></label><label>Přiřadit uživateli<select value={draft.assigned_user_id||""} onChange={e=>setDraft(d=>({...d,assigned_user_id:e.target.value||null,technician:assigneeLabel(e.target.value)}))}><option value="">Nepřiřazeno</option>{assignees.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}</select></label><label>Referent<input value={draft.referent} onChange={e=>setDraft(d=>({...d,referent:e.target.value}))}/></label><label>Priorita<select value={draft.priority} onChange={e=>setDraft(d=>({...d,priority:e.target.value}))}>{["nízká","běžná","vysoká","urgentní"].map(p=><option key={p}>{p}</option>)}</select></label><label>Termín splnění<input type="date" value={draft.due_date} onChange={e=>setDraft(d=>({...d,due_date:e.target.value}))}/></label><label>Název požadavku *<input required maxLength={180} value={draft.title} onChange={e=>setDraft(d=>({...d,title:e.target.value}))}/></label></div><label>Popis požadavku<textarea rows="4" value={draft.description} onChange={e=>setDraft(d=>({...d,description:e.target.value}))}/></label><button className="primary" disabled={busy}>{busy?"Ukládám…":"Zadat požadavek"}</button></form>}
 <div className="taskfilters"><label>Zobrazit <select value={filter} onChange={e=>setFilter(e.target.value)}><option value="otevřené">Otevřené</option><option value="ke kontrole">Ke kontrole</option><option value="po termínu">Po termínu</option><option value="moje">Přiřazené mně</option><option value="vše">Všechny</option></select></label><button className="secondarybutton" onClick={load}>Obnovit</button></div>
 <div className="tasklayout"><div className="tasklist">{filtered.length?filtered.map(x=><button type="button" key={x.id} className={"taskitem"+(selected?.id===x.id?" active":"")} onClick={()=>{setSelected(x);setCreating(false);setNote("");setResolution(x.resolution||"");setHandoffTo("");setHandoffReason("")}}><span className="taskitemtop"><strong>{x.title}</strong><span className="taskstatus">{x.status}</span></span><small>{buildingName(x.building_id)}</small><small>Technik: {x.technician||"nepřiřazen"} · {x.priority} priorita{x.due_date?" · do "+new Date(x.due_date+"T12:00:00").toLocaleDateString("cs-CZ"):""}</small></button>):<p>Žádné požadavky v tomto filtru.</p>}</div>
 {selected&&<section className="taskdetail"><h2>{selected.title}</h2><p><strong>Objekt:</strong> {buildingName(selected.building_id)}</p><p><strong>Stav:</strong> {selected.status} · <strong>Priorita:</strong> {selected.priority}</p><p><strong>Referent:</strong> {selected.referent||"—"} · <strong>Technik:</strong> {selected.technician||"nepřiřazen"}</p><p><strong>Zadání:</strong> {selected.description||"Bez popisu"}</p>{selected.due_date&&<p><strong>Termín:</strong> {new Date(selected.due_date+"T12:00:00").toLocaleDateString("cs-CZ")}</p>}<div className="taskcalendar"><button type="button" className="secondarybutton" disabled={!selected.due_date} onClick={()=>saveToCalendar(selected)}>📅 Uložit do kalendáře (.ics)</button>{!selected.due_date&&<small>Pro uložení do kalendáře musí mít požadavek nastavený termín splnění.</small>}</div>
 {selected.status!=="uzavřený"&&<div className="taskhandoff"><h3>Předat požadavek jinému technikovi</h3><p>Po předání se změní přiřazený technik a změna se zapíše do historie.</p><label>Nový řešitel<select value={handoffTo} onChange={e=>setHandoffTo(e.target.value)}><option value="">Vyber technika…</option>{assignees.filter(a=>a.id!==selected.assigned_user_id).map(a=><option key={a.id} value={a.id}>{a.label}</option>)}</select></label><label>Důvod předání (nepovinný)<textarea rows="2" value={handoffReason} onChange={e=>setHandoffReason(e.target.value)} placeholder="Například zastupování, jiná odbornost…"/></label><button type="button" className="secondarybutton" disabled={busy||!handoffTo||handoffTo===selected.assigned_user_id} onClick={handoff}>Předat požadavek</button></div>}
 <div className="taskactions"><h3>Průběh řešení</h3>{selected.status!=="uzavřený"&&<><label>Poznámka k průběhu<textarea rows="3" value={note} onChange={e=>setNote(e.target.value)}/></label><button disabled={busy} className="secondarybutton" onClick={()=>update("v řešení")}>Zahájit / aktualizovat řešení</button><label>Provedené práce a výsledek<textarea rows="4" value={resolution} onChange={e=>setResolution(e.target.value)}/></label><button disabled={busy||!resolution.trim()} className="primary" onClick={()=>update("čeká na kontrolu",{resolution:resolution.trim()})}>Předat ke kontrole</button></>}
 {selected.resolution&&<p><strong>Provedené práce:</strong> {selected.resolution}</p>}
 {selected.status==="čeká na kontrolu"&&<div className="taskreview"><h3>Výsledná kontrola práce</h3><label>Hodnocení / připomínky<textarea rows="3" value={note} onChange={e=>setNote(e.target.value)} placeholder="Zápis referenta o kontrole provedené práce"/></label><div className="taskreviewbuttons"><button disabled={busy} className="primary" onClick={()=>update("uzavřený",{review_note:note})}>Schválit a uzavřít</button><button disabled={busy||!note.trim()} className="secondarybutton" onClick={()=>update("vráceno k dopracování",{review_note:note})}>Vrátit k dopracování</button></div></div>}
 {selected.review_note&&<p><strong>Výsledek kontroly:</strong> {selected.review_note}</p>}</div>
 <h3>Historie změn</h3><div className="taskhistory">{events.map(e=><div key={e.id}><strong>{e.status}</strong><small>{new Date(e.created_at).toLocaleString("cs-CZ")} · Změnil: {actorLabel(e)}</small>{e.note&&<p>{e.note}</p>}</div>)}</div></section>}</div></div>;
}
