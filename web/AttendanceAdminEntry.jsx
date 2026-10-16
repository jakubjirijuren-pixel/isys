import React,{useState} from "react";
const nowLocal=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)};
export default function AttendanceAdminEntry({supabase,profiles,onSaved}){
 const [user,setUser]=useState(""),[type,setType]=useState("in"),[time,setTime]=useState(nowLocal),[note,setNote]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const save=async e=>{
  e.preventDefault();if(!user||!time)return;
  if(!window.confirm("Opravdu doplnit "+(type==="in"?"příchod":"odchod")+" vybranému zaměstnanci k "+new Date(time).toLocaleString("cs-CZ")+"?"))return;
  setBusy(true);setError("");setSuccess("");
  const {error:err}=await supabase.rpc("isys_attendance_admin_mark",{p_user_id:user,p_type:type,p_occurred_at:new Date(time).toISOString(),p_note:note});
  if(err)setError(err.message);else{setSuccess("Záznam byl uložen s identitou administrátora.");setNote("");onSaved?.()}
  setBusy(false);
 };
 return <section className="attendance-card"><h2>Ruční doplnění docházky zaměstnance</h2><p>Jen pro administrátory. Příchod nebo odchod lze doplnit i zpětně, bez ohledu na pozdější události. Původní záznamy zůstanou zachované a uloží se identita administrátora. Pokud se události překrývají, je nutné před mzdovou uzávěrkou zkontrolovat výpočet hodin.</p>
 <form onSubmit={save} className="attendance-admin-form"><label>Zaměstnanec<select required value={user} onChange={e=>setUser(e.target.value)}><option value="">Vyberte zaměstnance</option>{profiles.map(p=><option key={p.id} value={p.id}>{p.display_name||p.full_name||p.email||"Neznámý zaměstnanec"}</option>)}</select></label><label>Událost<select value={type} onChange={e=>setType(e.target.value)}><option value="in">Příchod</option><option value="out">Odchod</option></select></label><label>Datum a čas<input required type="datetime-local" value={time} onChange={e=>setTime(e.target.value)}/></label><label>Poznámka (nepovinná)<input maxLength={500} value={note} onChange={e=>setNote(e.target.value)} placeholder="Důvod doplnění"/></label><button type="submit" className="primary" disabled={busy||!user}>{busy?"Ukládám…":"Doplnit záznam"}</button></form>
 {error&&<p role="alert" className="error">{error}</p>}{success&&<p role="status" className="notice">{success}</p>}
 </section>;
}
