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
 const [buildingId,setBuildingId]=useState(""),[approverId,setApproverId]=useState(""),[title,setTitle]=useState(""),[supplier,setSupplier]=useState(""),[amount,setAmount]=useState(""),[file,setFile]=useState(null),[selected,setSelected]=useState(null),[signature,setSignature]=useState("");
 const refresh=async()=>{const [{data,error:e},{data:people}]=await Promise.all([supabase.from("foxa_offer_approvals").select("*").order("created_at",{ascending:false}),supabase.from("profiles").select("id,display_name,full_name")]);if(e)throw e;setRows(data||[]);setProfiles(people||[])};
 useEffect(()=>{refresh().catch(e=>setError(e.message))},[]);
 const selectedBuilding=buildings.find(b=>b.id===buildingId);
 const availableReferents=profiles.filter(p=>p.id===selectedBuilding?.referent_user_id);
 const submit=async e=>{e.preventDefault();setError("");setNotice("");setBusy(true);try{await invoke(supabase,{action:"create",building_id:buildingId,approver_id:approverId,title,supplier,amount,file});setTitle("");setSupplier("");setAmount("");setFile(null);setNotice("Nabídka byla odeslána referentovi.");await refresh()}catch(e){setError(e.message)}finally{setBusy(false)}};
 const sign=async()=>{if(!signature)return setError("Nejprve se podepište.");setBusy(true);setError("");try{await invoke(supabase,{action:"sign",id:selected.id,signature});setSelected(null);setSignature("");setNotice("Nabídka byla interně schválena. Certifikát je připojen jako poslední stránka PDF.");await refresh()}catch(e){setError(e.message)}finally{setBusy(false)}};
 const download=async id=>{setBusy(true);setError("");try{const result=await invoke(supabase,{action:"download",id});window.open(result.url,"_blank","noopener,noreferrer")}catch(e){setError(e.message)}finally{setBusy(false)}};
 const isCreator=roles.some(r=>["admin","technician"].includes(r));
 return <div className="offer-approvals">
 <h1>Elektronické podpisy – cenové nabídky</h1><p>Interní souhlas referenta. Schválení není objednávkou ani závazným přijetím nabídky dodavatele.</p>
 {error&&<p role="alert" style={{color:"#c53030"}}>{error}</p>}{notice&&<p role="status">{notice}</p>}
 {isCreator&&<form onSubmit={submit} className="card" style={{padding:20,display:"grid",gap:12,maxWidth:760}}>
 <h2>Nová cenová nabídka</h2>
 <label>Objekt<select required value={buildingId} onChange={e=>{setBuildingId(e.target.value);setApproverId("")}}><option value="">Vyberte objekt</option>{buildings.filter(b=>roles.includes("admin")||b.manager_user_id===userId).map(b=><option key={b.id} value={b.id}>{b.object_number} – {b.name||b.address}</option>)}</select></label>
 <label>Referent<select required value={approverId} onChange={e=>setApproverId(e.target.value)}><option value="">Vyberte referenta</option>{availableReferents.map(p=><option key={p.id} value={p.id}>{p.display_name||p.full_name}</option>)}</select></label>
 <label>Název nabídky<input required minLength={3} maxLength={200} value={title} onChange={e=>setTitle(e.target.value)}/></label>
 <label>Dodavatel<input required value={supplier} onChange={e=>setSupplier(e.target.value)}/></label>
 <label>Cena v Kč<input required type="number" min="0" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
 <label>Cenová nabídka PDF (max. 20 MB)<input required type="file" accept="application/pdf,.pdf" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
 <button disabled={busy||!file||!approverId} type="submit">Odeslat referentovi ke schválení</button></form>}
 <h2>Evidence nabídek</h2>
 <div style={{display:"grid",gap:12}}>{rows.map(r=><div key={r.id} className="card" style={{padding:16,display:"flex",gap:12,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}>
 <div><strong>{r.title}</strong><div>{r.supplier} · {Number(r.amount).toLocaleString("cs-CZ")} Kč</div><small>{r.status==="approved"?"Interně schváleno":"Čeká na podpis"} · {new Date(r.created_at).toLocaleString("cs-CZ")}</small></div>
 <div style={{display:"flex",gap:8}}><button type="button" disabled={busy} onClick={()=>download(r.id)}>Zobrazit PDF</button>{r.status==="pending"&&r.approver_id===userId&&<button type="button" onClick={()=>{setSelected(r);setSignature("")}}>Schválit podpisem</button>}</div>
 </div>)}</div>
 {selected&&<div className="card" style={{padding:20,maxWidth:760,marginTop:20}}><h2>Podpis referenta – {selected.title}</h2><p>Potvrzuji pouze interní souhlas s touto cenovou nabídkou.</p><SignatureCanvas onChange={setSignature}/><div style={{display:"flex",gap:12,marginTop:12}}><button disabled={busy||!signature} onClick={sign}>Podepsat a vytvořit certifikát</button><button type="button" onClick={()=>setSelected(null)}>Zrušit</button></div></div>}
 </div>;
}