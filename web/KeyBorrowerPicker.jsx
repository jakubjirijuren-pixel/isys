import React,{useEffect,useMemo,useState} from "react";
import "./key-borrower-picker.css";
const clean=v=>String(v||"").trim();
export default function KeyBorrowerPicker({supabase,value,onChange,onEmailChange}){
 const [contacts,setContacts]=useState([]),[open,setOpen]=useState(false);
 useEffect(()=>{let alive=true;Promise.all([
 supabase.from("foxa_staff_directory_contacts").select("full_name,phone,email"),
 supabase.from("foxa_supplier_directory_contacts").select("full_name,company,phone,email"),
 supabase.from("foxa_building_committee_contacts").select("full_name,phone")
 ]).then(results=>{if(!alive)return;const all=results.flatMap((r,i)=>(r.data||[]).map(x=>({name:clean(x.full_name),detail:clean(x.company)||(i===0?"Zaměstnanec":i===2?"Výbor objektu":"Dodavatel"),phone:clean(x.phone),email:clean(x.email)}))).filter(x=>x.name);setContacts([...new Map(all.map(x=>[x.name.toLocaleLowerCase("cs"),x])).values()])});return()=>{alive=false}},[supabase]);
 const matches=useMemo(()=>{const q=clean(value).toLocaleLowerCase("cs");return contacts.filter(x=>[x.name,x.detail,x.phone].some(v=>v.toLocaleLowerCase("cs").includes(q))).slice(0,12)},[contacts,value]);
 return <div className="foxa-key-borrower-picker"><input required maxLength={180} autoComplete="off" value={value} onChange={e=>{onChange(e.target.value);onEmailChange?.("");setOpen(true)}} onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),150)} placeholder="Vyhledat kontakt nebo zadat nové jméno" aria-label="Kdo si klíče půjčil"/>{open&&value.trim()&&<div className="foxa-key-borrower-results" role="listbox">{matches.map((x,i)=><button type="button" role="option" key={i} onMouseDown={e=>e.preventDefault()} onClick={()=>{onChange(x.name);onEmailChange?.(x.email);setOpen(false)}}><strong>{x.name}</strong><small>{[x.detail,x.phone,x.email].filter(Boolean).join(" · ")}</small></button>)}<div className="foxa-key-borrower-manual">Není v seznamu? Ponechte zadané jméno a pokračujte.</div></div>}</div>
}
