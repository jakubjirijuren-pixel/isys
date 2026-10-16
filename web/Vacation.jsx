import React,{useEffect,useState} from "react";
import "./vacation.css";
export default function Vacation({supabase,userId,isAdmin=false}){
 const [requests,setRequests]=useState([]),[settings,setSettings]=useState([]),[users,setUsers]=useState([]); const [sick,setSick]=useState([]),[approvedDays,setApprovedDays]=useState([]),[sickDate,setSickDate]=useState(""),[year,setYear]=useState(new Date().getFullYear());
 const [start,setStart]=useState(""),[end,setEnd]=useState(""),[note,setNote]=useState("");
 const [error,setError]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 const [config,setConfig]=useState({user:"",manager:"",days:"20"});
 const load=async()=>{
  const [a,b,s,d]=await Promise.all([supabase.from("vacation_requests").select("*").order("created_at",{ascending:false}),supabase.from("vacation_settings").select("*"),supabase.from("sick_days").select("*").order("day",{ascending:false}),supabase.from("isys_vacation_attendance").select("user_id,day").gte("day",year+"-01-01").lte("day",year+"-12-31")]);
  if(a.error||b.error||s.error||d.error){setError((a.error||b.error||s.error||d.error).message);return}
  setRequests(a.data||[]);setSettings(b.data||[]);setSick(s.data||[]);setApprovedDays(d.data||[]);
  if(isAdmin){const u=await supabase.rpc("isys_list_users");if(!u.error)setUsers(u.data||[])}
 };
 useEffect(()=>{load()},[userId,isAdmin,year]);
 const perform=async(action)=>{
  setBusy(true);setError("");setMessage("");
  try{const {error}=await action();if(error)throw error;setMessage("Změna byla uložena.");await load()}
  catch(e){setError(e.message||"Operace se nezdařila.")}finally{setBusy(false)}
 };
 const submit=e=>{e.preventDefault();perform(async()=>{const r=await supabase.rpc("isys_vacation_submit",{p_start:start,p_end:end,p_note:note});if(!r.error){setStart("");setEnd("");setNote("")}return r})};
 const decide=(r,status)=>{if(!window.confirm("Opravdu změnit stav žádosti?"))return;perform(()=>supabase.rpc("isys_vacation_decide",{p_id:r.id,p_status:status,p_note:""}))};
 const save=e=>{e.preventDefault();perform(()=>supabase.rpc("isys_vacation_settings_save",{p_user:config.user,p_manager:config.manager||null,p_days:Number(config.days)}))};

 const printRequest=r=>{
  const escape=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const date=value=>value?new Date(value+"T12:00:00").toLocaleDateString("cs-CZ"):"—";
  const stamp=value=>value?new Date(value).toLocaleString("cs-CZ"):"—";
  const applicant=r.user_id===userId?(users.find(u=>u.id===userId)?.display_name||users.find(u=>u.id===userId)?.email||"Zaměstnanec"):(name(r.user_id));
  const html=`<!doctype html><html lang="cs"><head><meta charset="utf-8"><title>Dovolenka – ${escape(date(r.starts_on))}</title><style>
  @page{size:A4;margin:17mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111;font-size:12pt;margin:0}header{border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:28px}header small{display:block;color:#444;margin-bottom:12px}h1{font-size:22pt;margin:0}h2{font-size:12pt;margin:25px 0 10px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.field{border-bottom:1px solid #777;padding:9px 0;min-height:48px}.field label{display:block;font-size:9pt;color:#555;margin-bottom:6px}.wide{grid-column:1/-1}.status{font-weight:bold}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:36px;margin-top:75px}.signature{border-top:1px solid #111;text-align:center;padding-top:8px;font-size:10pt}footer{margin-top:38px;font-size:9pt;color:#555}button{padding:10px 16px;margin:20px 0;cursor:pointer}@media print{button{display:none}}
  </style></head><body><header><small>SBD Praha 8 · interní personální tiskopis</small><h1>ŽÁDOST O DOVOLENOU</h1></header>
  <div class="grid"><div class="field"><label>Zaměstnanec</label>${escape(applicant)}</div><div class="field"><label>Schvalující osoba</label>${escape(name(r.manager_id))}</div>
  <div class="field"><label>Datum od</label>${escape(date(r.starts_on))}</div><div class="field"><label>Datum do</label>${escape(date(r.ends_on))}</div>
  <div class="field"><label>Počet pracovních dnů</label>${escape(r.days)}</div><div class="field"><label>Stav žádosti</label><span class="status">${escape(labels[r.status]||r.status)}</span></div>
  <div class="field wide"><label>Poznámka zaměstnance</label>${escape(r.note||"—")}</div>
  <div class="field"><label>Podáno dne</label>${escape(stamp(r.created_at))}</div><div class="field"><label>Rozhodnuto dne</label>${escape(stamp(r.decided_at))}</div>
  <div class="field wide"><label>Vyjádření schvalujícího</label>${escape(r.decision_note||"—")}</div></div>
  <div class="signatures"><div class="signature">Podpis zaměstnance</div><div class="signature">Podpis schvalující osoby</div></div>
  <footer>Vygenerováno ze systému iSYS · Identifikátor žádosti: ${escape(r.id)}<p>Stav odpovídá elektronické evidenci v okamžiku exportu. Podpisová pole jsou určena pro listinné potvrzení.</p></footer>
  <button onclick="window.print()">Tisk / Uložit jako PDF</button></body></html>`;
  const win=window.open("","_blank");
  if(!win){setError("Prohlížeč zablokoval nové okno. Povolte vyskakovací okna pro iSYS.");return}
  win.document.open();win.document.write(html);win.document.close();win.focus();
 };
 const mySettings=settings.find(s=>s.user_id===userId);
 const entitlement=Number(mySettings?.annual_days||0);
 const vacationUsed=approvedDays.filter(x=>x.user_id===userId).length;
 const vacationPending=requests.filter(x=>x.user_id===userId&&x.status==="pending"&&x.starts_on?.startsWith(String(year))).reduce((n,x)=>n+Number(x.days||0),0);
 const sickUsed=sick.filter(x=>x.user_id===userId&&x.status==="used"&&x.day.startsWith(String(year))).length;
 const recordSick=e=>{e.preventDefault();perform(()=>supabase.rpc("isys_sick_day_use",{p_day:sickDate}))};
 const cancelSick=x=>{if(window.confirm("Opravdu zrušit sick day?"))perform(()=>supabase.rpc("isys_sick_day_cancel",{p_id:x.id}))};
 const Balance=({title,total,used,pending=0})=><section className="vacation-panel vacation-balance">
  <h2>{title}</h2><div className="vacation-balance-body"><div className="vacation-donut" role="img" aria-label={title+": "+used+" vyčerpáno z "+total} style={{background:total>0?`conic-gradient(var(--vacation-used,#377bd6) 0 ${Math.min(100,used/total*100)}%,var(--vacation-free,#dce7f3) ${Math.min(100,used/total*100)}% 100%)`:"var(--vacation-free,#dce7f3)"}}><div><strong>{Math.max(0,total-used).toLocaleString("cs-CZ")}</strong><small>zbývá</small></div></div><div className="vacation-stats"><p>Nárok <strong>{total.toLocaleString("cs-CZ")} dnů</strong></p><p>Vyčerpáno / schváleno <strong>{used.toLocaleString("cs-CZ")} dnů</strong></p><p>Zbývá <strong>{Math.max(0,total-used).toLocaleString("cs-CZ")} dnů</strong></p>{pending>0&&<p>Čeká na schválení <strong>{pending.toLocaleString("cs-CZ")} dnů</strong></p>}</div></div>
 </section>;
 const name=id=>users.find(u=>u.id===id)?.display_name||users.find(u=>u.id===id)?.email||id?.slice(0,8)||"—";
 const labels={pending:"Čeká na schválení",approved:"Schváleno",rejected:"Zamítnuto",cancelled:"Zrušeno"};
 return <div className="vacation"><div className="pageheading"><div><h1>Dovolené</h1><p>Žádosti, schvalování a přehled čerpání dovolené.</p></div><button className="secondarybutton" onClick={load}>Obnovit</button></div>
 <div className="vacation-year"><label>Rok <select value={year} onChange={e=>setYear(Number(e.target.value))}>{[year-1,year,year+1].map(y=><option key={y} value={y}>{y}</option>)}</select></label></div>
 <div className="vacation-grid"><Balance title="Dovolená" total={entitlement} used={vacationUsed} pending={vacationPending}/><Balance title="Sick days" total={3} used={sickUsed}/></div>
 {error&&<div className="error" role="alert">{error}</div>}{message&&<div className="notice" role="status">{message}</div>}
 <div className="vacation-grid"><section className="vacation-panel"><h2>Nová žádost</h2><p>Roční nárok: <strong>{mySettings?.annual_days??"nenastaven"} dnů</strong></p><p>Nadřízený: {mySettings?.manager_id?name(mySettings.manager_id):"nenastaven"}</p><form onSubmit={submit}><label>Od<input required type="date" value={start} onChange={e=>setStart(e.target.value)}/></label><label>Do<input required type="date" min={start||undefined} value={end} onChange={e=>setEnd(e.target.value)}/></label><label>Poznámka<textarea maxLength={2000} rows={3} value={note} onChange={e=>setNote(e.target.value)}/></label><button className="primary" disabled={busy||!mySettings?.manager_id}>Odeslat žádost</button></form><small>Počet dnů se počítá podle Po–Pá bez českých státních svátků. Individuální rozvrhy zatím nejsou zohledněny.</small></section>
 <section className="vacation-panel"><h2>Sick days – 3 dny ročně</h2><form onSubmit={recordSick}><label>Datum čerpání<input type="date" required value={sickDate} onChange={e=>setSickDate(e.target.value)}/></label><button className="primary" disabled={busy||sickUsed>=3||!sickDate||!sickDate.startsWith(String(year))}>Zaznamenat sick day</button></form><small>Sick day se eviduje jako nepřítomnost, nikoliv odpracované hodiny. Neplatí pro víkendy a státní svátky.</small><div className="vacation-list">{sick.filter(x=>x.user_id===userId&&x.day.startsWith(String(year))&&x.status==="used").map(x=><article key={x.id} className="vacation-item"><span>{x.day} · Sick day</span><button className="secondarybutton" disabled={busy} onClick={()=>cancelSick(x)}>Zrušit</button></article>)}</div></section>
 {isAdmin&&<section className="vacation-panel"><h2>Nastavení zaměstnance</h2><form onSubmit={save}><label>Zaměstnanec<select required value={config.user} onChange={e=>{const id=e.target.value,s=settings.find(x=>x.user_id===id);setConfig({user:id,manager:s?.manager_id||"",days:String(s?.annual_days??20)})}}><option value="">Vyber zaměstnance</option>{users.map(u=><option key={u.id} value={u.id}>{u.display_name||u.email}</option>)}</select></label><label>Nadřízený<select value={config.manager} onChange={e=>setConfig({...config,manager:e.target.value})}><option value="">Bez nadřízeného</option>{users.filter(u=>u.id!==config.user).map(u=><option key={u.id} value={u.id}>{u.display_name||u.email}</option>)}</select></label><label>Roční nárok (dny)<input type="number" min="0" max="366" step="0.5" required value={config.days} onChange={e=>setConfig({...config,days:e.target.value})}/></label><button className="primary" disabled={busy||!config.user}>Uložit nastavení</button></form></section>}
 </div><section className="vacation-panel"><h2>Žádosti</h2>{!requests.length?<p>Žádné žádosti.</p>:<div className="vacation-list">{requests.map(r=><article key={r.id} className="vacation-item"><div><strong>{r.starts_on} – {r.ends_on}</strong><span>{r.days} pracovních dnů · {labels[r.status]}</span><small>Žadatel: {r.user_id===userId?"Já":name(r.user_id)} · Schvaluje: {name(r.manager_id)}</small>{r.note&&<p>{r.note}</p>}{r.decision_note&&<small>Vyjádření: {r.decision_note}</small>}</div><div className="vacation-actions"><button type="button" onClick={()=>printRequest(r)}>Tiskopis / PDF</button>{r.status==="pending"&&<>{(r.manager_id===userId||isAdmin)&&r.user_id!==userId&&<><button disabled={busy} onClick={()=>decide(r,"approved")}>Schválit</button><button disabled={busy} onClick={()=>decide(r,"rejected")}>Zamítnout</button></>}{(r.user_id===userId||isAdmin)&&<button disabled={busy} onClick={()=>decide(r,"cancelled")}>Zrušit</button>}</>}</div></article>)}</div>}</section></div>
}
