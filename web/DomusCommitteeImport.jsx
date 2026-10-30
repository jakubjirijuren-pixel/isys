import React,{useState} from "react";
import * as XLSX from "xlsx";

const norm=v=>String(v??"").trim();
const code=v=>{const s=norm(v);return /^\d+$/.test(s)?String(Number(s)):s.toLocaleLowerCase("cs")};
const key=x=>[x.building_id,norm(x.full_name).toLocaleLowerCase("cs"),norm(x.position).toLocaleLowerCase("cs")].join("|");

export default function DomusCommitteeImport({supabase,buildings,onImported}){
 const [preview,setPreview]=useState(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 async function readFile(e){
  const file=e.target.files?.[0];e.target.value="";
  if(!file)return;
  setError("");setNotice("");setPreview(null);
  try{
   const wb=XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:true});
   const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:"",raw:false});
   if(!rows.length||!("Kód objektu" in rows[0])||!("Funkce" in rows[0])||!("Příjmení" in rows[0]))throw Error("Soubor nemá očekávanou strukturu exportu Domus.");
   const lookup=new Map();
   for(const b of buildings){const k=code(b.object_number);if(k)lookup.set(k,[...(lookup.get(k)||[]),b])}
   const planned=[],skipped=[],seen=new Set();
   rows.forEach((r,i)=>{
    const position=norm(r["Funkce"]),full_name=[r["Titul"],r["Jméno"],r["Příjmení"]].map(norm).filter(Boolean).join(" ");
    const organization=[r["Firma"],r["Příjmení"],r["Jméno"]].map(norm).join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
    const isSbdPraha8=/stavebni\s+bytove\s+druzstvo\s+praha\s*8/.test(organization);
    const excludedRole=/spravce|správce/i.test(position);
    if(excludedRole||(isSbdPraha8&&!/referent/i.test(position))){skipped.push({row:i+2,reason:isSbdPraha8?"Správce Stavební bytové družstvo Praha 8 – neimportuje se":"Správce objektu – neimportuje se"});return}
    if(!/referent|výbor|předsed|kontrolní komise|kontrolni komise|domovník|domovnik|bytové družstvo|bytove druzstvo|\\bBD\\b|družstv/i.test(position)||!norm(r["Jméno"])||!norm(r["Příjmení"])){skipped.push({row:i+2,reason:"Nepodporovaná funkce nebo neúplné jméno"});return}
    const matches=lookup.get(code(r["Kód objektu"]))||[];
    if(matches.length!==1){skipped.push({row:i+2,reason:matches.length?"Nejednoznačný kód objektu":"Objekt nenalezen: "+norm(r["Kód objektu"])});return}
    const phone=norm(r["Mobil"]||r["Telefon"]||r["Mobil (portál)"]||r["Telefon (portál)"]);
    const email=norm(r[" E-mail (portál)"]||r["E-mail (portál)"]||r["E-mail"]);
    const item={building_id:matches[0].id,object_number:matches[0].object_number,full_name,position,phone,email};
    if(seen.has(key(item)))return;
    seen.add(key(item));planned.push(item);
   });
   setPreview({filename:file.name,planned,skipped});
  }catch(err){setError("Import Domus: "+err.message)}
 }
 async function confirm(){
  if(!preview||busy)return;
  setBusy(true);setError("");
  try{
   const ids=[...new Set(preview.planned.map(x=>x.building_id))];
   const existing=[];
   for(let i=0;i<ids.length;i+=100){
    const {data,error}=await supabase.from("foxa_building_committee_contacts").select("building_id,full_name,position").in("building_id",ids.slice(i,i+100));
    if(error)throw error;
    existing.push(...(data||[]));
   }
   const known=new Set(existing.map(key));
   const additions=preview.planned.filter(x=>!known.has(key(x)));
   let count=0;
   for(let i=0;i<additions.length;i+=50){
    const batch=additions.slice(i,i+50).map(({building_id,full_name,position,phone,email})=>({building_id,full_name,position,phone:phone||null,email:email||null}));
    const {error}=await supabase.from("foxa_building_committee_contacts").insert(batch);
    if(error)throw Error("Uloženo "+count+" kontaktů. Další dávka selhala: "+error.message);
    count+=batch.length;
   }
   setNotice("Importováno "+count+" nových kontaktů; "+(preview.planned.length-count)+" existujících přeskočeno. Žádné kontakty nebyly přepsány.");
   setPreview(null);onImported?.();
  }catch(err){setError(err.message)}
  finally{setBusy(false)}
 }
 return <div>
  <label className="secondarybutton filebutton">↑ Kontakty z Domusu<input type="file" accept=".xlsx,.xls" onChange={readFile}/></label>
  {error&&<p className="error" role="alert">{error}</p>}
  {notice&&<p className="notice" role="status">{notice}</p>}
  {preview&&<div className="importpanel"><h3>Import domovních funkcionářů – {preview.filename}</h3>
   <p>Připraveno {preview.planned.length} kontaktů, přeskočeno {preview.skipped.length} řádků. Stávající záznamy nebudou přepsány. Importují se i kontaktní údaje referentů pro export. Přiřazení referentů a techniků k objektům se nemění.</p>
   <p>{preview.planned.slice(0,8).map(x=>x.object_number+" – "+x.full_name+" ("+x.position+")").join("; ")}</p>
   {preview.skipped.length>0&&<details><summary>Přeskočené řádky</summary>{preview.skipped.map((x,i)=><p key={i}>Řádek {x.row}: {x.reason}</p>)}</details>}
   <div className="actions"><button type="button" className="secondarybutton" onClick={()=>setPreview(null)}>Zrušit</button><button type="button" className="primary" disabled={busy||!preview.planned.length} onClick={confirm}>{busy?"Importuji…":"Potvrdit import kontaktů"}</button></div>
  </div>}
 </div>
}