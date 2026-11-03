import "./OfferApprovals.css";
import React,{useEffect,useRef,useState} from "react";
const invoke=async(supabase,fields)=>{
 const {data:{session}}=await supabase.auth.getSession();
 if(!session)throw Error("Přihlaste se znovu.");
 const form=new FormData();
 Object.entries(fields).forEach(([k,v])=>form.append(k,v));
 const response=await fetch("https://qcbyjxovnffdruiznlnt.supabase.co/functions/v1/foxa-offer-approval",{method:"POST",headers:{Authorization:"Bearer "+session.access_token,apikey:"sb_publishable_AFfvrodRnmBTOLjlFadYfQ_Foa4e_P1"},body:form});
 const result=await response.json();
 if(!response.ok)throw Error(result.error||"Operace selhala");
 return result;
};
function OfferSearchPicker({label,value,items,onChange,placeholder,disabled=false}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState("");
 const root=useRef(null),search=useRef(null);
 useEffect(()=>{if(!open)return;const close=e=>{if(!root.current?.contains(e.target))setOpen(false)};const escape=e=>{if(e.key==="Escape")setOpen(false)};document.addEventListener("pointerdown",close);document.addEventListener("keydown",escape);return()=>{document.removeEventListener("pointerdown",close);document.removeEventListener("keydown",escape)}},[open]);
 useEffect(()=>{if(open)search.current?.focus();else setQuery("")},[open]);
 const selected=items.find(item=>item.id===value);
 const matches=items.filter(item=>item.name.toLocaleLowerCase("cs").includes(query.toLocaleLowerCase("cs")));
 return <div className="offer-picker"><div className="filterdropdown" ref={root}>
 <button type="button" disabled={disabled} className="filtertrigger" aria-label={label} aria-haspopup="listbox" aria-expanded={open} onClick={()=>setOpen(v=>!v)}><span>{selected?.name||placeholder}</span><span className="filterchevron" aria-hidden="true">⌄</span></button>
 {open&&<div className="filtermenu offer-picker-menu" role="listbox" aria-label={label}>
 <input ref={search} type="search" placeholder={"Hledat "+label.toLocaleLowerCase("cs")+"…"} value={query} onChange={e=>setQuery(e.target.value)}/>
 <div className="offer-picker-results"><button type="button" role="option" aria-selected={!value} onClick={()=>{onChange("");setOpen(false)}}>— Bez výběru —</button>
 {matches.map(item=><button key={item.id} type="button" role="option" aria-selected={item.id===value} className={item.id===value?"chosen":""} onClick={()=>{onChange(item.id);setOpen(false)}}>{item.name}</button>)}
 {!matches.length&&<p>Žádné odpovídající položky.</p>}</div></div>}</div></div>;
}
function SignatureCanvas({onChange}){
 const canvas=useRef(null),active=useRef(false),last=useRef(null);
 useEffect(()=>{
  const el=canvas.current,ctx=el.getContext("2d");
  const resize=()=>{const rect=el.getBoundingClientRect();el.width=Math.round(rect.width*devicePixelRatio);el.height=Math.round(180*devicePixelRatio);ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);ctx.lineWidth=2.4;ctx.lineCap="round";ctx.strokeStyle="#132b45"};
  resize();
 },[]);
 const pos=e=>{const r=canvas.current.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top]};
 const down=e=>{e.currentTarget.setPointerCapture(e.pointerId);active.current=true;last.current=pos(e)};
 const move=e=>{if(!active.current)return;const ctx=canvas.current.getContext("2d"),p=pos(e);ctx.beginPath();ctx.moveTo(...last.current);ctx.lineTo(...p);ctx.stroke();last.current=p;onChange(canvas.current.toDataURL("image/png"))};
 const up=()=>{active.current=false};
 return <div><canvas ref={canvas} style={{width:"100%",height:180,touchAction:"none",background:"#fff",border:"1px solid #aeb8c2",borderRadius:10}} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-label="Podepište se prstem, myší nebo stylusem"/><button type="button" onClick={()=>{const c=canvas.current;c.getContext("2d").clearRect(0,0,c.width,c.height);onChange("")}}>Vymazat podpis</button></div>;
}
export default function OfferApprovals({supabase,buildings=[],userId,roles=[]}){
 const [rows,setRows]=useState([]),[profiles,setProfiles]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [buildingId,setBuildingId]=useState(""),[title,setTitle]=useState(""),[supplier,setSupplier]=useState(""),[amount,setAmount]=useState(""),[file,setFile]=useState(null),[selected,setSelected]=useState(null),[signature,setSignature]=useState("");
 const refresh=async()=>{const [{data,error:e},{data:people}]=await Promise.all([supabase.from("foxa_offer_approvals").select("*").is("deleted_at",null).order("created_at",{ascending:false}),supabase.from("profiles").select("id,display_name,full_name")]);if(e)throw e;setRows(data||[]);setProfiles(people||[])};
 useEffect(()=>{refresh().catch(e=>setError(e.message))},[]);
 const selectedBuilding=buildings.find(b=>b.id===buildingId);
 const assignedReferent=profiles.find(p=>p.id===selectedBuilding?.referent_user_id);
 const submit=async e=>{e.preventDefault();setError("");setNotice("");setBusy(true);try{const result=await invoke(supabase,{action:"create",building_id:buildingId,title,supplier,amount,file});setTitle("");setSupplier("");setAmount("");setFile(null);setNotice(result.notification_created?"Nabídka byla odeslána referentovi a oznámení bylo vytvořeno.":"Nabídka byla odeslána, ale oznámení se nepodařilo vytvořit. Kontaktujte administrátora.");await refresh()}catch(e){setError(e.message)}finally{setBusy(false)}};
 const sign=async()=>{if(!signature)return setError("Nejprve se podepište.");setBusy(true);setError("");try{await invoke(supabase,{action:"sign",id:selected.id,signature});setSelected(null);setSignature("");setNotice("Nabídka byla interně schválena. Certifikát je připojen jako poslední stránka PDF.");await refresh()}catch(e){setError(e.message)}finally{setBusy(false)}};
 const download=async id=>{setBusy(true);setError("");try{const result=await invoke(supabase,{action:"download",id});window.open(result.url,"_blank","noopener,noreferrer")}catch(e){setError(e.message)}finally{setBusy(false)}};
 const removeOffer=async offer=>{
  const approved=offer.status==="approved";
  const message=approved?"Odstranit schválenou nabídku ze seznamu? Podepsané PDF a auditní historie zůstanou bezpečně uložené.":"Odstranit odeslanou cenovou nabídku? Referent ji už nebude moci schválit.";
  if(!window.confirm(message))return;
  setBusy(true);setError("");setNotice("");
  try{await invoke(supabase,{action:"delete",id:offer.id});if(selected?.id===offer.id)setSelected(null);setNotice("Cenová nabídka byla odstraněna ze seznamu. Auditní historie zůstala zachována.");await refresh()}
  catch(e){setError(e.message)}finally{setBusy(false)}
 };
 const isCreator=roles.some(r=>["admin","technician"].includes(r));
 return <div className="offer-approvals">
 <header className="offer-heading"><div><h1>Elektronické podpisy</h1><p>Interní schvalování cenových nabídek referentem. Schválení není objednávkou ani závazným přijetím nabídky dodavatele.</p></div></header>
 {error&&<p role="alert" style={{color:"#c53030"}}>{error}</p>}{notice&&<p role="status">{notice}</p>}
 {isCreator&&<form onSubmit={submit} className="offer-panel offer-form">
 <h2>Nová cenová nabídka</h2>
 <div className="offer-field"><span className="offer-field-label">Objekt</span><OfferSearchPicker label="Objekt" value={buildingId} onChange={v=>{setBuildingId(v)}} placeholder="Vyberte objekt…" items={buildings.filter(b=>roles.includes("admin")||b.manager_user_id===userId).map(b=>({id:b.id,name:[b.object_number,b.name||b.address].filter(Boolean).join(" – ")}))}/></div>
 
 <label>Název nabídky<input required minLength={3} maxLength={200} value={title} onChange={e=>setTitle(e.target.value)}/></label>
 <label>Dodavatel<input required value={supplier} onChange={e=>setSupplier(e.target.value)}/></label>
 <label>Cena v Kč<input required type="number" min="0" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
 <label>Cenová nabídka PDF (max. 20 MB)<input required type="file" accept="application/pdf,.pdf" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
 <button className="offer-primary" disabled={busy||!file||!buildingId} type="submit">Odeslat referentovi ke schválení</button></form>}
 <div className="offer-list-heading"><h2>Evidence nabídek</h2><span>{rows.length} dokumentů</span></div>
 <div className="offer-list">{rows.map(r=><div key={r.id} className="offer-panel offer-row">
 <div><strong>{r.title}</strong><div>{r.supplier} · {Number(r.amount).toLocaleString("cs-CZ")} Kč</div><small>{r.status==="approved"?"Interně schváleno":"Čeká na podpis"} · {new Date(r.created_at).toLocaleString("cs-CZ")}</small></div>
 <div className="offer-actions"><button type="button" disabled={busy} onClick={()=>download(r.id)}>Zobrazit PDF</button>{r.status==="pending"&&r.approver_id===userId&&<button className="offer-primary" type="button" onClick={()=>{setSelected(r);setSignature("")}}>Schválit podpisem</button>}{(r.creator_id===userId||roles.includes("admin"))&&<button className="offer-delete" type="button" disabled={busy} onClick={()=>removeOffer(r)}>Odstranit</button>}</div>
 </div>)}</div>
 {selected&&<div className="offer-panel offer-sign-panel"><h2>Podpis referenta – {selected.title}</h2><p>Potvrzuji pouze interní souhlas s touto cenovou nabídkou.</p><SignatureCanvas onChange={setSignature}/><div className="offer-actions offer-sign-actions"><button className="offer-primary" disabled={busy||!signature} onClick={sign}>Podepsat a vytvořit certifikát</button><button type="button" onClick={()=>setSelected(null)}>Zrušit</button></div></div>}
 </div>;
}