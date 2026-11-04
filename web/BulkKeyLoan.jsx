import KeyBorrowerPicker from "./KeyBorrowerPicker.jsx";
import React,{useEffect,useRef,useState} from "react";
const label=b=>[b.object_number,b.street||b.name||b.address,b.city].filter(Boolean).join(" – ");
function BuildingSearch({buildings,value,onChange,excluded=[]}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState("");
 const root=useRef(null),search=useRef(null);
 const selected=buildings.find(b=>String(b.id)===String(value));
 const options=buildings.filter(b=>!excluded.includes(String(b.id))&&label(b).toLocaleLowerCase("cs").includes(query.trim().toLocaleLowerCase("cs"))).sort((a,b)=>String(a.object_number||"").localeCompare(String(b.object_number||""),"cs",{numeric:true}));
 useEffect(()=>{if(!open)return;const outside=e=>{if(!root.current?.contains(e.target))setOpen(false)};const esc=e=>{if(e.key==="Escape")setOpen(false)};document.addEventListener("pointerdown",outside);document.addEventListener("keydown",esc);return()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",esc)}},[open]);
 useEffect(()=>{if(open)search.current?.focus();else setQuery("")},[open]);
 return <div ref={root} className={"filterdropdown inspectionbuildingpicker foxa-bulk-picker"+(open?" isopen":"")}><button type="button" className="filtertrigger" aria-expanded={open} aria-haspopup="listbox" onClick={()=>setOpen(v=>!v)}><span>{selected?label(selected):"Vyber objekt…"}</span><span className="filterchevron" aria-hidden="true">⌄</span></button>{open&&<div className="filtermenu inspectionbuildingmenu"><input ref={search} type="search" aria-label="Vyhledat objekt" placeholder="Hledat číslo, ulici nebo město…" value={query} onChange={e=>setQuery(e.target.value)}/><div role="listbox" aria-label="Seznam objektů" className="inspectionbuildingoptions">{options.length?options.map(b=><button type="button" role="option" aria-selected={String(b.id)===String(value)} className={String(b.id)===String(value)?"chosen":""} key={b.id} onClick={()=>{onChange(String(b.id));setOpen(false)}}>{label(b)}</button>):<p>Žádné odpovídající objekty.</p>}</div></div>}</div>;
}
export default function BulkKeyLoan({supabase,buildings,onSaved,onCancel,defaultOffice="",officeOptions=[]}){
 const [borrower,setBorrower]=useState(""),[borrowerEmail,setBorrowerEmail]=useState(""),[office,setOffice]=useState(defaultOffice),[returnDueAt,setReturnDueAt]=useState("");
 useEffect(()=>{setOffice(defaultOffice)},[defaultOffice]);
 const offices=[...new Set(["312","313","314","315","316","317",...officeOptions,defaultOffice].filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),"cs",{numeric:true}));
 const [items,setItems]=useState([{building_id:"",description:""},{building_id:"",description:""}]),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const change=(i,field,value)=>setItems(old=>old.map((item,j)=>i===j?{...item,[field]:value}:item));
 const save=async e=>{e.preventDefault();setError("");
  if(items.some(x=>!x.building_id||x.description.trim().length<2)){setError("U každého objektu vyberte dům a popište klíče.");return}
  if(new Set(items.map(x=>x.building_id)).size!==items.length){setError("Stejný objekt je uveden vícekrát. Klíče od jednoho domu spojte do jednoho řádku.");return}
  setBusy(true);
  try{
   const {data,error:rpcError}=await supabase.rpc("foxa_bulk_key_loan_create",{p_borrower:borrower.trim(),p_phone:"",p_company:"",p_email:borrowerEmail.trim(),p_office:office.trim(),p_note:"",p_items:items.map(x=>({building_id:x.building_id,description:x.description.trim(),return_due_at:returnDueAt?new Date(returnDueAt).toISOString():null}))});
   if(rpcError)throw rpcError;
   onSaved?.({count:data?.length||items.length,groupId:data?.[0]?.group_id,loanIds:(data||[]).map(x=>x.loan_id)});
   if(borrowerEmail&&window.confirm("Otevřít e-mailové potvrzení hromadné výpůjčky v poštovní aplikaci? Odeslání ještě musíte potvrdit.")){
    const subject="FOXA – potvrzení výpůjčky klíčů";
    const body=["Dobrý den,","","potvrzujeme výpůjčku klíčů v systému FOXA.","Vypůjčitel: "+borrower,...items.map(x=>{const b=buildings.find(y=>String(y.id)===String(x.building_id));return "Objekt: "+[b?.object_number,b?.street||b?.name].filter(Boolean).join(" – ")+"; klíče: "+x.description}),returnDueAt?"Vrátit do: "+new Date(returnDueAt).toLocaleString("cs-CZ"):"","","S pozdravem","FOXA"].join("\\n");
    window.location.href="mailto:"+encodeURIComponent(borrowerEmail)+"?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(body);
   }
  }catch(err){setError(err.message||"Hromadnou výpůjčku se nepodařilo uložit.")}finally{setBusy(false)}
 };
 return <section className="keys-panel foxa-bulk-loan"><div className="foxa-bulk-heading"><div><h2>Hromadná výpůjčka klíčů</h2><p>Jeden vypůjčitel, více objektů. Každý dům se eviduje samostatně pro nezávislé vrácení klíčů.</p></div><button type="button" className="secondarybutton" onClick={onCancel}>Zrušit</button></div>
 <form onSubmit={save} className="foxa-bulk-form"><div className="foxa-bulk-fields">
 <label>Jméno a příjmení vypůjčitele<KeyBorrowerPicker supabase={supabase} value={borrower} onChange={name=>{setBorrower(name);setBorrowerEmail("")}} onEmailChange={setBorrowerEmail}/></label>
 <label>E-mail vypůjčitele<input type="email" value={borrowerEmail} onChange={e=>setBorrowerEmail(e.target.value)} placeholder="E-mail z kontaktů nebo ručně"/></label><label>VRÁTIT DO (nepovinné)<input type="datetime-local" value={returnDueAt} onChange={e=>setReturnDueAt(e.target.value)}/></label><label>Kancelář pro vrácení<select value={office} onChange={e=>setOffice(e.target.value)}><option value="">Vyberte kancelář</option>{offices.map(n=><option key={n} value={n}>{n}</option>)}</select></label></div>
 <h3>Vypůjčené klíče podle objektů</h3>
 <div className="foxa-bulk-items">{items.map((item,i)=><div className="foxa-bulk-item" key={i}><span className="foxa-bulk-number">{i+1}.</span><label>Objekt<BuildingSearch buildings={buildings} value={item.building_id} onChange={value=>change(i,"building_id",value)} excluded={items.filter((_,j)=>j!==i).map(x=>x.building_id)}/></label><label>Popis klíčů<input required minLength={2} maxLength={500} placeholder="Např. hlavní vchod, strojovna" value={item.description} onChange={e=>change(i,"description",e.target.value)}/></label><button type="button" className="secondarybutton" disabled={items.length<=2} onClick={()=>setItems(old=>old.filter((_,j)=>j!==i))}>Odebrat</button></div>)}</div>
 <div className="foxa-bulk-actions"><button type="button" className="secondarybutton" disabled={items.length>=30} onClick={()=>setItems(old=>[...old,{building_id:"",description:""}])}>+ Přidat další objekt</button><button type="submit" className="primary" disabled={busy}>{busy?"Ukládám…":`Zapsat hromadnou výpůjčku (${items.length} objektů)`}</button></div>
 {error&&<p role="alert" className="foxa-bulk-error">{error}</p>}
 <p className="foxa-bulk-note">Uložení proběhne najednou: buď se zapíší všechny objekty, nebo žádný. Každý objekt lze později vrátit samostatně v běžné evidenci.</p>
 </form></section>;
}