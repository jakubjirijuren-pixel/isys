import React,{useState} from "react";
const label=b=>[b.object_number,b.street||b.name||b.address,b.city].filter(Boolean).join(" – ");
export default function BulkKeyLoan({supabase,buildings,onSaved,onCancel,defaultOffice=""}){
 const [borrower,setBorrower]=useState(""),[phone,setPhone]=useState(""),[company,setCompany]=useState(""),[email,setEmail]=useState(""),[office,setOffice]=useState(defaultOffice),[note,setNote]=useState("");
 const [items,setItems]=useState([{building_id:"",description:""},{building_id:"",description:""}]),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const sorted=[...buildings].sort((a,b)=>String(a.object_number||"").localeCompare(String(b.object_number||""),"cs",{numeric:true}));
 const change=(i,field,value)=>setItems(old=>old.map((item,j)=>i===j?{...item,[field]:value}:item));
 const save=async e=>{e.preventDefault();setError("");
  if(items.some(x=>!x.building_id||x.description.trim().length<2)){setError("U každého objektu vyberte dům a popište klíče.");return}
  if(new Set(items.map(x=>x.building_id)).size!==items.length){setError("Stejný objekt je uveden vícekrát. Klíče od jednoho domu spojte do jednoho řádku.");return}
  setBusy(true);
  try{
   const {data,error:rpcError}=await supabase.rpc("foxa_bulk_key_loan_create",{p_borrower:borrower.trim(),p_phone:phone.trim(),p_company:company.trim(),p_email:email.trim(),p_office:office.trim(),p_note:note.trim(),p_items:items.map(x=>({building_id:x.building_id,description:x.description.trim()}))});
   if(rpcError)throw rpcError;
   onSaved?.({count:data?.length||items.length,groupId:data?.[0]?.group_id});
  }catch(err){setError(err.message||"Hromadnou výpůjčku se nepodařilo uložit.")}finally{setBusy(false)}
 };
 return <section className="keys-panel foxa-bulk-loan"><div className="foxa-bulk-heading"><div><h2>Hromadná výpůjčka klíčů</h2><p>Jeden vypůjčitel, více objektů. Každý dům se eviduje samostatně pro nezávislé vrácení klíčů.</p></div><button type="button" className="secondarybutton" onClick={onCancel}>Zrušit</button></div>
 <form onSubmit={save} className="foxa-bulk-form"><div className="foxa-bulk-fields">
 <label>Jméno a příjmení vypůjčitele<input required minLength={2} maxLength={200} value={borrower} onChange={e=>setBorrower(e.target.value)} placeholder="Jméno řemeslníka"/></label>
 <label>Firma<input maxLength={200} value={company} onChange={e=>setCompany(e.target.value)}/></label>
 <label>Telefon<input type="tel" value={phone} onChange={e=>setPhone(e.target.value)}/></label>
 <label>E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
 <label>Kancelář pro vrácení<input value={office} onChange={e=>setOffice(e.target.value)}/></label>
 <label>Poznámka<input value={note} onChange={e=>setNote(e.target.value)}/></label></div>
 <h3>Vypůjčené klíče podle objektů</h3>
 <div className="foxa-bulk-items">{items.map((item,i)=><div className="foxa-bulk-item" key={i}><span className="foxa-bulk-number">{i+1}.</span><label>Objekt<select required value={item.building_id} onChange={e=>change(i,"building_id",e.target.value)}><option value="">Vyberte objekt</option>{sorted.map(b=><option key={b.id} value={b.id} disabled={items.some((x,j)=>j!==i&&x.building_id===b.id)}>{label(b)}</option>)}</select></label><label>Popis klíčů<input required minLength={2} maxLength={500} placeholder="Např. hlavní vchod, strojovna" value={item.description} onChange={e=>change(i,"description",e.target.value)}/></label><button type="button" className="secondarybutton" disabled={items.length<=2} onClick={()=>setItems(old=>old.filter((_,j)=>j!==i))}>Odebrat</button></div>)}</div>
 <div className="foxa-bulk-actions"><button type="button" className="secondarybutton" disabled={items.length>=30} onClick={()=>setItems(old=>[...old,{building_id:"",description:""}])}>+ Přidat další objekt</button><button type="submit" className="primary" disabled={busy}>{busy?"Ukládám…":`Zapsat hromadnou výpůjčku (${items.length} objektů)`}</button></div>
 {error&&<p role="alert" className="foxa-bulk-error">{error}</p>}
 <p className="foxa-bulk-note">Uložení proběhne najednou: buď se zapíší všechny objekty, nebo žádný. Každý objekt lze později vrátit samostatně v běžné evidenci.</p>
 </form></section>;
}