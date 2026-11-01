import FieldWizardForm from "./FieldWizardForm.jsx";
import React,{useCallback,useEffect,useMemo,useState} from "react";
import "./OutgoingMail.css";
const empty={sent_on:new Date().toISOString().slice(0,10),recipient:"",address:"",subject:"",reference:"",method:"Pošta",tracking_number:"",notes:"",building_id:""};
const dateCZ=value=>value?new Date(value+"T12:00:00").toLocaleDateString("cs-CZ"):"—";
export default function OutgoingMail({supabase,buildings=[],userId,isAdmin=false}){
 const [rows,setRows]=useState([]),[form,setForm]=useState(empty),[editing,setEditing]=useState(null),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(""),[query,setQuery]=useState("");
 const load=useCallback(async()=>{setLoading(true);const {data,error:e}=await supabase.from("outgoing_mail").select("*").order("sent_on",{ascending:false}).order("created_at",{ascending:false}).limit(1000);if(e)setError("Nepodařilo se načíst knihu odchozí pošty: "+e.message);else{setRows(data||[]);setError("")}setLoading(false)},[supabase]);
 useEffect(()=>{load()},[load]);
 const change=(k,v)=>setForm(prev=>({...prev,[k]:v}));
 const reset=()=>{setForm(empty);setEditing(null)};
 const save=async e=>{e.preventDefault();if(!form.recipient.trim()||!form.subject.trim()||!form.sent_on)return;setSaving(true);setError("");const payload={...form,recipient:form.recipient.trim(),subject:form.subject.trim(),building_id:form.building_id||null};const result=editing?await supabase.from("outgoing_mail").update(payload).eq("id",editing):await supabase.from("outgoing_mail").insert({...payload,created_by:userId});if(result.error)setError("Uložení se nezdařilo: "+result.error.message);else{reset();await load()}setSaving(false)};
 const edit=r=>{setEditing(r.id);setForm(Object.fromEntries(Object.keys(empty).map(k=>[k,r[k]??""])));window.scrollTo({top:0,behavior:"smooth"})};
 const remove=async r=>{if(!window.confirm("Opravdu odstranit záznam odchozí pošty?"))return;const {error:e}=await supabase.from("outgoing_mail").delete().eq("id",r.id);if(e)setError("Smazání se nezdařilo: "+e.message);else await load()};
 const filtered=useMemo(()=>rows.filter(r=>[r.reference,r.recipient,r.subject,r.address,r.tracking_number,r.method].some(v=>String(v||"").toLocaleLowerCase("cs").includes(query.toLocaleLowerCase("cs")))),[rows,query]);
 const buildingLabel=id=>{const b=buildings.find(x=>String(x.id)===String(id));return b?(b.object_number?"Objekt "+b.object_number+" – ":"")+(b.name||b.address):"—"};
 return <div className="outmail"><div className="pageheading"><div><h1>Kniha odchozí pošty</h1><p>Evidence odeslaných dopisů, oznámení a dalších písemností.</p></div></div>
 <FieldWizardForm className="om-panel" onSubmit={save} steps={["Údaje zásilky","Kontrola a zápis"]}><h2>{editing?"Upravit záznam":"Nová odchozí zásilka"}</h2><div className="om-fields">
 <label>Datum odeslání<input type="date" required value={form.sent_on} onChange={e=>change("sent_on",e.target.value)}/></label>
 <label>Příjemce<input required maxLength={250} value={form.recipient} onChange={e=>change("recipient",e.target.value)}/></label>
 <label>Adresa příjemce<input maxLength={500} value={form.address} onChange={e=>change("address",e.target.value)}/></label>
 <label>Věc / předmět<input required maxLength={500} value={form.subject} onChange={e=>change("subject",e.target.value)}/></label>
 <label>Naše značka / č. j.<input maxLength={100} value={form.reference} onChange={e=>change("reference",e.target.value)}/></label>
 <label>Způsob odeslání<select value={form.method} onChange={e=>change("method",e.target.value)}>{["Pošta","Doporučeně","Datová schránka","E-mail","Osobní předání","Jiné"].map(x=><option key={x}>{x}</option>)}</select></label>
 <label>Podací číslo / ID zprávy<input maxLength={150} value={form.tracking_number} onChange={e=>change("tracking_number",e.target.value)}/></label>
 <label>Objekt<select value={form.building_id} onChange={e=>change("building_id",e.target.value)}><option value="">Bez objektu</option>{buildings.map(b=><option key={b.id} value={b.id}>{buildingLabel(b.id)}</option>)}</select></label>
 <label className="om-wide">Poznámka<textarea rows={2} maxLength={2000} value={form.notes} onChange={e=>change("notes",e.target.value)}/></label></div>
 <div className="om-actions"><button className="primary" type="submit" disabled={saving}>{saving?"Ukládám…":editing?"Uložit změny":"Zapsat odchozí poštu"}</button>{editing&&<button type="button" className="secondarybutton" onClick={reset}>Zrušit úpravu</button>}</div></FieldWizardForm>
 <section className="om-panel"><div className="om-listhead"><h2>Evidence zásilek ({filtered.length})</h2><div><input aria-label="Hledat v odchozí poště" placeholder="Hledat příjemce, věc, značku…" value={query} onChange={e=>setQuery(e.target.value)}/><button className="secondarybutton" type="button" onClick={load}>Obnovit</button></div></div>{error&&<p className="error" role="alert">{error}</p>}
 {loading?<p>Načítání…</p>:filtered.length===0?<p>Žádné záznamy.</p>:<div className="om-tablewrap"><table><thead><tr><th>Datum</th><th>Č. záznamu</th><th>Příjemce</th><th>Věc</th><th>Způsob</th><th>Podací číslo</th><th>Objekt</th><th>Akce</th></tr></thead><tbody>{filtered.map(r=><tr key={r.id}><td>{dateCZ(r.sent_on)}</td><td>{r.record_number||"—"}</td><td><strong>{r.recipient}</strong><small>{r.address}</small></td><td>{r.subject}<small>{r.reference}</small></td><td>{r.method}</td><td>{r.tracking_number||"—"}</td><td>{r.building_id?buildingLabel(r.building_id):"—"}</td><td><div className="om-rowactions">{(isAdmin||r.created_by===userId)&&<><button type="button" onClick={()=>edit(r)}>Upravit</button><button type="button" onClick={()=>remove(r)}>Smazat</button></>}</div></td></tr>)}</tbody></table></div>}</section></div>;
}
