import React,{useEffect,useState} from "react";
import "./Feedback.css";
export function FeedbackForm({supabase,onClose}){
 const [photo,setPhoto]=useState(null),[preview,setPreview]=useState(""),[subject,setSubject]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[sent,setSent]=useState(false);
 useEffect(()=>{if(!photo){setPreview("");return}const url=URL.createObjectURL(photo);setPreview(url);return()=>URL.revokeObjectURL(url)},[photo]);
 const selectPhoto=e=>{const file=e.target.files?.[0]||null;if(file&&(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024)){setError("Fotografie musí být JPG, PNG nebo WebP do 5 MB.");setPhoto(null);return}setError("");setPhoto(file)};
 const send=async e=>{e.preventDefault();if(busy)return;setBusy(true);setError("");let path=null;
 try{
  if(photo){const {data:{user},error:authError}=await supabase.auth.getUser();if(authError||!user)throw Error("Přihlášení vypršelo.");const ext=photo.type==="image/png"?"png":photo.type==="image/webp"?"webp":"jpg";path=user.id+"/"+crypto.randomUUID()+"."+ext;const {error:uploadError}=await supabase.storage.from("isys-feedback").upload(path,photo,{contentType:photo.type,upsert:false});if(uploadError)throw uploadError}
  const {error:rpcError}=await supabase.rpc("isys_submit_feedback",{p_subject:subject.trim(),p_message:message.trim(),p_attachment_path:path});
  if(rpcError)throw rpcError;setSent(true)
 }catch(err){if(path)await supabase.storage.from("isys-feedback").remove([path]);setError(err.message||"Zprávu se nepodařilo odeslat.")}
 finally{setBusy(false)}
 };
 return <div className="feedback-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="feedback-dialog" role="dialog" aria-modal="true" aria-label="Odeslat zpětnou vazbu"><div className="feedback-top"><h2>Zpětná vazba FOXA</h2><button type="button" onClick={onClose} aria-label="Zavřít">✕</button></div>{sent?<div className="feedback-sent"><h3>Děkujeme za zpětnou vazbu.</h3><p>Vaše zpráva byla předána administrátorům systému.</p><button type="button" className="primary" onClick={onClose}>Zavřít</button></div>:<form onSubmit={send}><p>Pošli nám návrh na zlepšení, připomínku nebo nahlášení chyby. Zprávu uvidí pouze administrátoři.</p><label>Předmět<input autoFocus required minLength={3} maxLength={120} value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Čeho se zpráva týká?"/></label><label>Zpráva<textarea required minLength={5} maxLength={3000} rows={6} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Popiš svůj návrh nebo problém…"/></label><label>Fotografie (volitelně, max. 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectPhoto}/></label>{preview&&<div className="feedback-preview"><img src={preview} alt="Náhled přiložené fotografie"/><button type="button" className="secondarybutton" onClick={()=>setPhoto(null)}>Odebrat fotografii</button></div>}{error&&<p className="feedback-error" role="alert">{error}</p>}<div className="feedback-actions"><button type="button" className="secondarybutton" onClick={onClose}>Zrušit</button><button type="submit" className="primary" disabled={busy}>{busy?"Odesílám…":"Odeslat administrátorům"}</button></div></form>}</section></div>
}
const STATUSES={new:"Nový",in_progress:"V řešení",resolved:"Vyřešený",closed:"Uzavřený"};
const PRIORITIES={low:"Nízká",normal:"Běžná",high:"Vysoká",urgent:"Urgentní"};
const dateTime=value=>value?new Date(value).toLocaleString("cs-CZ",{dateStyle:"short",timeStyle:"short"}):"—";
export default function FeedbackAdmin({supabase,accountDirectory=[]}){
 const [items,setItems]=useState([]),[comments,setComments]=useState([]),[photos,setPhotos]=useState({}),[selected,setSelected]=useState(null);
 const [filter,setFilter]=useState("open"),[priorityFilter,setPriorityFilter]=useState("all"),[search,setSearch]=useState("");
 const [busy,setBusy]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(""),[note,setNote]=useState("");
 const [userId,setUserId]=useState(null);
 useEffect(()=>{supabase.auth.getUser().then(({data})=>setUserId(data?.user?.id||null))},[supabase]);
 const load=async()=>{
  setBusy(true);setError("");
  const {data,error:e}=await supabase.from("isys_feedback").select("id,author_id,subject,message,status,priority,assigned_to,due_at,created_at,updated_at,attachment_path").order("created_at",{ascending:false}).limit(500);
  if(e)setError(e.message);else setItems(data||[]);
  setBusy(false);
 };
 useEffect(()=>{load()},[supabase]);
 const active=items.find(x=>x.id===selected);
 useEffect(()=>{if(!active){setComments([]);return}let live=true;supabase.from("isys_feedback_comments").select("id,author_id,body,created_at").eq("feedback_id",active.id).order("created_at",{ascending:true}).then(({data,error:e})=>{if(live){if(e)setError(e.message);else setComments(data||[])}});return()=>{live=false}},[supabase,selected]);
 useEffect(()=>{if(!active?.attachment_path)return;let live=true;supabase.storage.from("isys-feedback").createSignedUrl(active.attachment_path,3600).then(({data,error:e})=>{if(live&&!e)setPhotos(prev=>({...prev,[active.attachment_path]:data.signedUrl}))});return()=>{live=false}},[supabase,active?.attachment_path]);
 const nameFor=id=>accountDirectory.find(u=>u.id===id)?.display_name||accountDirectory.find(u=>u.id===id)?.email||id?.slice(0,8)||"Nepřiřazeno";
 const update=async(patch)=>{
  if(!active||saving)return;setSaving(true);setError("");
  const {data,error:e}=await supabase.from("isys_feedback").update(patch).eq("id",active.id).select("id,status,priority,assigned_to,due_at,updated_at").single();
  if(e)setError(e.message);else setItems(old=>old.map(x=>x.id===active.id?{...x,...data}:x));
  setSaving(false);
 };
 const sendNote=async e=>{
  e.preventDefault();if(!active||!note.trim()||saving||!userId)return;
  setSaving(true);setError("");
  const {data,error:e2}=await supabase.from("isys_feedback_comments").insert({feedback_id:active.id,author_id:userId,body:note.trim()}).select("id,author_id,body,created_at").single();
  if(e2)setError(e2.message);else{setComments(old=>[...old,data]);setNote("")}
  setSaving(false);
 };
 const visible=items.filter(x=>{
  if(filter==="open"&&["resolved","closed"].includes(x.status))return false;
  if(filter==="mine"&&x.assigned_to!==userId)return false;
  if(!["open","all","mine"].includes(filter)&&x.status!==filter)return false;
  if(priorityFilter!=="all"&&x.priority!==priorityFilter)return false;
  return !search||[x.subject,x.message,x.id,nameFor(x.author_id)].join(" ").toLocaleLowerCase("cs").includes(search.toLocaleLowerCase("cs"));
 });
 const counts={open:items.filter(x=>!["resolved","closed"].includes(x.status)).length,urgent:items.filter(x=>x.priority==="urgent"&&!["resolved","closed"].includes(x.status)).length,assigned:items.filter(x=>x.assigned_to===userId&&!["resolved","closed"].includes(x.status)).length};
 return <section className="feedback-admin feedback-ticketing">
  <div className="pageheading"><div><h1>Ticketing – zpětná vazba</h1><p>Evidence hlášení, přidělování odpovědnosti a interní komunikace administrátorů.</p></div><button type="button" className="secondarybutton" onClick={load} disabled={busy}>Obnovit</button></div>
  <div className="ticket-stats"><div><strong>{counts.open}</strong><span>Otevřené tickety</span></div><div><strong>{counts.urgent}</strong><span>Urgentní</span></div><div><strong>{counts.assigned}</strong><span>Přiřazené mně</span></div><div><strong>{items.length}</strong><span>Celkem</span></div></div>
  <div className="ticket-filters"><label>Hledat<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Předmět, text nebo číslo ticketu"/></label><label>Stav<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="open">Otevřené</option><option value="all">Všechny</option><option value="mine">Přiřazené mně</option>{Object.entries(STATUSES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label>Priorita<select value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)}><option value="all">Všechny</option>{Object.entries(PRIORITIES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label></div>
  {error&&<p className="feedback-error" role="alert">{error}</p>}
  <div className="ticket-layout">
   <div className="ticket-list" aria-label="Seznam ticketů">{busy&&<p>Načítám…</p>}{!busy&&visible.length===0&&<p>Žádné odpovídající tickety.</p>}{visible.map(item=><button key={item.id} type="button" className={"ticket-list-item"+(selected===item.id?" selected":"")} onClick={()=>{setSelected(item.id);setNote("");setError("")}}><div className="ticket-list-top"><strong>#{item.id.slice(0,8).toUpperCase()}</strong><span className={"ticket-priority "+item.priority}>{PRIORITIES[item.priority]||item.priority}</span></div><b>{item.subject}</b><small>{nameFor(item.author_id)} · {dateTime(item.created_at)}</small><div className="ticket-list-bottom"><span className={"ticket-status "+item.status}>{STATUSES[item.status]||item.status}</span><span>{item.assigned_to?nameFor(item.assigned_to):"Nepřiřazeno"}</span></div></button>)}</div>
   <div className="ticket-detail">{active?<><div className="ticket-detail-heading"><div><small>Ticket #{active.id.slice(0,8).toUpperCase()}</small><h2>{active.subject}</h2><p>Odeslal(a): {nameFor(active.author_id)} · {dateTime(active.created_at)}</p></div><button className="secondarybutton" type="button" onClick={()=>setSelected(null)}>Zavřít</button></div>
    <div className="ticket-edit-grid"><label>Stav<select value={active.status} disabled={saving} onChange={e=>update({status:e.target.value})}>{Object.entries(STATUSES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label>Priorita<select value={active.priority} disabled={saving} onChange={e=>update({priority:e.target.value})}>{Object.entries(PRIORITIES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label>Přiřazeno<select value={active.assigned_to||""} disabled={saving} onChange={e=>update({assigned_to:e.target.value||null})}><option value="">Nepřiřazeno</option>{accountDirectory.map(u=><option key={u.id} value={u.id}>{u.display_name||u.email||u.id}</option>)}{active.assigned_to&&!accountDirectory.some(u=>u.id===active.assigned_to)&&<option value={active.assigned_to}>{nameFor(active.assigned_to)}</option>}</select></label><label>Termín řešení<input type="date" value={active.due_at||""} disabled={saving} onChange={e=>update({due_at:e.target.value||null})}/></label></div>
    <div className="ticket-message"><h3>Popis hlášení</h3><p>{active.message}</p>{active.attachment_path&&<div className="feedback-attachment">{photos[active.attachment_path]?<a href={photos[active.attachment_path]} target="_blank" rel="noreferrer"><img src={photos[active.attachment_path]} alt="Přiložená fotografie"/><span>Otevřít přílohu</span></a>:<small>Načítání přílohy…</small>}</div>}</div>
    <div className="ticket-comments"><h3>Interní poznámky <small>({comments.length})</small></h3><p className="ticket-hint">Poznámky jsou viditelné pouze administrátorům.</p>{comments.length===0&&<p>Zatím bez poznámek.</p>}{comments.map(c=><div className="ticket-comment" key={c.id}><div><strong>{nameFor(c.author_id)}</strong><small>{dateTime(c.created_at)}</small></div><p>{c.body}</p></div>)}<form onSubmit={sendNote}><label>Nová interní poznámka<textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={3000} rows={3} placeholder="Postup řešení, zjištění, další kroky…"/></label><button className="primary" type="submit" disabled={saving||!note.trim()||!userId}>{saving?"Ukládám…":"Přidat poznámku"}</button></form></div>
   </>:<div className="ticket-empty"><h2>Vyber ticket ze seznamu</h2><p>V detailu lze změnit stav, prioritu, přiřadit odpovědnou osobu a přidat interní poznámky.</p></div>}</div>
  </div>
 </section>
}
