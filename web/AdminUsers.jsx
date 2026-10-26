import React,{useEffect,useState} from "react";
import QRCode from "qrcode";
import html2pdf from "html2pdf.js";
import "./admin-users.css";
import ModuleAvailability from "./ModuleAvailability.jsx";
const roleLabels={admin:"Administrátor",technician:"Technik",referent:"Referent"};
export default function AdminUsers({supabase,currentUserId}){
 const [bulkOpen,setBulkOpen]=useState(false),[bulkRecipients,setBulkRecipients]=useState([]),[bulkTitle,setBulkTitle]=useState("Oznámení FOXA"),[bulkBody,setBulkBody]=useState(""),[bulkRole,setBulkRole]=useState("all");
 const [notifyUser,setNotifyUser]=useState(null),[notifyTitle,setNotifyTitle]=useState("Zpráva od správce FOXA"),[notifyBody,setNotifyBody]=useState("");
 const [users,setUsers]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState(""),[saving,setSaving]=useState(""),[search,setSearch]=useState(""),[editing,setEditing]=useState(null),[draftRoles,setDraftRoles]=useState([]),[draftName,setDraftName]=useState(""),[draftOffice,setDraftOffice]=useState("");
 const load=async()=>{setLoading(true);setError("");const {data,error}=await supabase.rpc("isys_list_users");if(error)setError("Načtení uživatelů selhalo: "+error.message+" — Zkontroluj spuštění SQL skriptu admin-user-roles.sql.");else setUsers(data||[]);setLoading(false)};
 useEffect(()=>{load()},[]);
 const change=async(u,role)=>{if(u.role===role||saving)return;if(!window.confirm("Změnit roli uživatele "+u.email+" z "+(roleLabels[u.role]||u.role)+" na "+roleLabels[role]+"?"))return;setSaving(u.id);setError("");setNotice("");const {error}=await supabase.rpc("isys_set_user_role",{target_user:u.id,new_role:role});if(error)setError("Změna role selhala: "+error.message);else{setNotice("Role uživatele "+u.email+" byla změněna na "+roleLabels[role]+".");await load()}setSaving("")};
 const openEdit=async u=>{setEditing(u.id);setDraftOffice("");const {data,error}=await supabase.rpc("foxa_get_return_office",{p_user:u.id});if(!error)setDraftOffice(data||"");setDraftRoles(u.roles?.length?u.roles:[u.role||"technician"]);setDraftName(u.display_name||"");setError("");setNotice("")};
 const saveProfile=async u=>{
  if(!draftRoles.length){setError("Vyber alespoň jednu roli.");return}
  if(!window.confirm("Uložit profil a role uživatele "+u.email+"?"))return;
  setSaving(u.id);setError("");setNotice("");
  const {error}=await supabase.rpc("isys_update_user",{target_user:u.id,new_roles:draftRoles,new_display_name:draftName.trim()});
  if(error)setError("Uložení profilu selhalo: "+error.message+" — Zkontroluj migraci admin-multiple-roles.sql.");
  else{const officeResult=await supabase.rpc("foxa_set_return_office",{p_user:u.id,p_office:draftOffice.trim()});if(officeResult.error)setError("Profil uložen, ale kancelář nelze nastavit: "+officeResult.error.message);else{setNotice("Profil a výchozí kancelář uživatele "+u.email+" byly uloženy.");setEditing(null);await load()}}
  setSaving("");
 };
 const sendPasswordReset=async u=>{
  if(!u.email||saving)return;
  if(!window.confirm("Odeslat e-mail pro obnovení hesla uživateli "+u.email+"?"))return;
  setSaving(u.id);setError("");setNotice("");
  const {error}=await supabase.auth.resetPasswordForEmail(u.email);
  if(error)setError("Odeslání odkazu pro obnovení hesla selhalo: "+error.message);
  else setNotice("Požadavek na odeslání e-mailu pro obnovení hesla byl přijat pro "+u.email+". Doručení závisí na nastavení e-mailů v Supabase.");
  setSaving("");
 };
 const generatePasswordPdf=async(u,sendEmail=false)=>{
  if(!u.email||saving)return;
  if(!window.confirm(sendEmail?"Vygenerovat nové PDF s odkazem pro nastavení hesla a odeslat jej jako přílohu na "+u.email+"?":"Vytvořit citlivý jednorázový odkaz pro nastavení hesla uživatele "+u.email+"? Předávací list předej pouze této osobě."))return;
  setSaving(u.id);setError("");setNotice("");
  try{
   const {data,error}=await supabase.functions.invoke("isys-password-handover",{body:{user_id:u.id}});
   if(error||!data?.link)throw Error(error?.message||"Server nevrátil odkaz.");
   const qr=await QRCode.toDataURL(data.link,{width:420,margin:2,errorCorrectionLevel:"M"});
   const escape=s=>String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
   const html=`<div style="font-family:Arial,sans-serif;color:#19364a;padding:18mm 17mm;background:white;min-height:250mm;box-sizing:border-box"><div style="border-bottom:3px solid #146c9c;padding-bottom:15px"><div style="display:flex;align-items:center;gap:14px"><img src="${window.location.origin}/isys/icon.svg" alt="Logo FOXA" style="width:54px;height:54px;object-fit:contain"/><div><div style="font-size:31px;font-weight:bold;color:#146c9c">FOXA</div><div style="font-size:10px;letter-spacing:1.4px;color:#64788b">SYSTÉM BUDOUCNOSTI</div></div></div><div style="font-size:13px;color:#64788b">Interní systém správy bytových domů</div></div><h1 style="font-size:24px;margin:30px 0 10px">Nastavení nového hesla</h1><p>Tento osobní předávací list je určen pouze uvedenému zaměstnanci.</p><p style="font-size:16px"><strong>Uživatelský účet:</strong> ${escape(data.email)}</p><div style="text-align:center;margin:25px 0"><img src="${qr}" style="width:75mm;height:75mm" alt="QR kód pro nastavení hesla"/></div><div style="margin:0 0 22px;padding:12px 14px;border:1px solid #d6e9f1;border-radius:8px;background:#f4f9fc"><strong style="font-size:13px">Přímý odkaz na nastavení hesla:</strong><div style="margin-top:8px;font-size:10px;line-height:1.5;overflow-wrap:anywhere;word-break:break-all;color:#146c9c">${escape(data.link)}</div></div><h2 style="font-size:16px">Postup</h2><ol style="font-size:14px;line-height:1.9"><li>Naskenujte QR kód telefonem nebo otevřete přímý odkaz uvedený pod ním.</li><li>Otevřete zobrazený odkaz pro obnovení přístupu.</li><li>Zadejte nové heslo (minimálně 12 znaků) a potvrďte ho.</li><li>Po dokončení se přihlaste do aplikace FOXA.</li></ol><div style="margin-top:25px;background:#e7f3f7;border:1px solid #d6e9f1;padding:15px;border-radius:8px;font-size:12px"><strong>DŮLEŽITÉ:</strong> QR kód obsahuje citlivý odkaz umožňující nastavit heslo. Nepředávejte tento list jiné osobě. Odkaz má omezenou platnost a může být použit pouze jednou. Pokud nefunguje, požádejte správce o nový list.</div><p style="margin-top:30px;font-size:11px;color:#64788b">Vystaveno: ${escape(new Date().toLocaleString("cs-CZ"))} · FOXA</p></div>`;
   const filename="isys-nastaveni-hesla-"+u.email.replace(/[^a-z0-9.-]/gi,"_")+".pdf";
   const pdf=html2pdf().set({margin:0,filename,image:{type:"jpeg",quality:.98},html2canvas:{scale:2,useCORS:true},jsPDF:{unit:"mm",format:"a4",orientation:"portrait"}}).from(html);
   if(sendEmail){
    const pdfBase64=(await pdf.outputPdf("datauristring")).split(",")[1];
    const {error:mailError}=await supabase.functions.invoke("isys-send-password-pdf",{body:{user_id:u.id,pdf_base64:pdfBase64,filename}});
    if(mailError)throw Error("Odeslání e-mailu selhalo: "+mailError.message);
    setNotice("PDF bylo odesláno na "+u.email+".");
   }else{
    await pdf.save();
    setNotice("PDF pro "+u.email+" bylo vytvořeno. Vytiskni jej a bezpečně předej zaměstnanci.");
   }
  }catch(e){setError("PDF se nepodařilo "+(sendEmail?"odeslat":"vytvořit")+": "+e.message)}
  finally{setSaving("")}
 };
 const sendNotification=async e=>{
  e.preventDefault();
  if(!notifyUser||saving)return;
  const title=notifyTitle.trim(),body=notifyBody.trim();
  if(!title||!body){setError("Vyplň předmět i text oznámení.");return}
  setSaving(notifyUser.id);setError("");setNotice("");
  try{
   const {error}=await supabase.rpc("isys_admin_send_notification",{target_user:notifyUser.id,notification_title:title,notification_body:body});
   if(error)throw error;
   setNotice("Oznámení pro "+(notifyUser.display_name||notifyUser.email)+" bylo vytvořeno a předáno systému oznámení.");
   setNotifyUser(null);setNotifyBody("");
  }catch(error){setError("Odeslání oznámení selhalo: "+error.message+" — Zkontroluj spuštění admin-send-notification.sql.")}
  finally{setSaving("")}
 };
 const bulkCandidates=users.filter(u=>bulkRole==="all"||(u.roles?.length?u.roles:[u.role]).includes(bulkRole));
 const sendBulk=async e=>{
  e.preventDefault();
  const ids=[...new Set(bulkRecipients)].filter(id=>users.some(u=>u.id===id));
  if(!ids.length||!bulkTitle.trim()||!bulkBody.trim()){setError("Vyber příjemce a vyplň předmět i text.");return}
  if(!window.confirm("Odeslat oznámení "+ids.length+" uživatelům?"))return;
  setSaving("bulk");setError("");setNotice("");
  try{
   const {data,error}=await supabase.rpc("isys_admin_send_bulk_notification",{target_users:ids,notification_title:bulkTitle.trim(),notification_body:bulkBody.trim()});
   if(error)throw error;
   setNotice("Hromadné oznámení bylo vytvořeno pro "+data+" uživatelů.");
   setBulkOpen(false);setBulkRecipients([]);setBulkBody("");
  }catch(err){setError("Hromadné oznámení se nepodařilo odeslat: "+err.message)}
  finally{setSaving("")}
 };
 const [roleFilter,setRoleFilter]=useState("all"),[section,setSection]=useState("users"),[menuUser,setMenuUser]=useState(null);
 const filtered=users.filter(u=>{const term=search.trim().toLocaleLowerCase("cs");const matchesText=!term||[u.email,u.display_name].some(x=>(x||"").toLocaleLowerCase("cs").includes(term));const roles=u.roles?.length?u.roles:[u.role];return matchesText&&(roleFilter==="all"||roles.includes(roleFilter))});
 const countRole=role=>users.filter(u=>(u.roles?.length?u.roles:[u.role]).includes(role)).length;
 const initials=u=>(u.display_name||u.email||"?").split(/[\\s@._-]+/).filter(Boolean).slice(0,2).map(x=>x[0].toLocaleUpperCase("cs")).join("");
 return <div className="adminusers">
  <header className="adminusers-hero"><div><div className="adminusers-eyebrow">ADMINISTRACE FOXA</div><h1>Správa uživatelů</h1><p>Účty, přístupová oprávnění a komunikace se zaměstnanci na jednom místě.</p></div><button className="secondarybutton" type="button" disabled={loading} onClick={load}>↻ Obnovit seznam</button></header>
  <div className="adminusers-stats"><div><span>Celkem uživatelů</span><strong>{users.length}</strong></div>{Object.entries(roleLabels).map(([role,label])=><div key={role}><span>{label}</span><strong>{countRole(role)}</strong></div>)}</div>
  <nav className="adminusers-tabs" aria-label="Správa uživatelů"><button type="button" className={section==="users"?"active":""} onClick={()=>setSection("users")}>Uživatelé a role</button><button type="button" className={section==="messages"?"active":""} onClick={()=>setSection("messages")}>Hromadná oznámení</button><button type="button" className={section==="modules"?"active":""} onClick={()=>setSection("modules")}>Dostupnost modulů</button></nav>
  {error&&<div className="error" role="alert">{error}</div>}{notice&&<div className="notice" role="status">{notice}</div>}
  {section==="modules"&&<section className="adminusers-panel"><h2>Dostupnost modulů</h2><p>Zapínej nebo dočasně omezuj jednotlivé moduly pro zaměstnance.</p><ModuleAvailability supabase={supabase}/></section>}
  {section==="messages"&&<section className="adminusers-panel"><div className="adminusers-section-heading"><div><h2>Hromadná oznámení</h2><p>Vyber příjemce a odešli zprávu do Oznamovacího centra.</p></div></div><form className="adminusers-message-form" onSubmit={sendBulk}><label>Filtrovat podle role<select value={bulkRole} onChange={e=>setBulkRole(e.target.value)}><option value="all">Všichni uživatelé</option>{Object.entries(roleLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><div className="adminusers-message-actions"><button type="button" className="secondarybutton" onClick={()=>setBulkRecipients(prev=>[...new Set([...prev,...bulkCandidates.map(u=>u.id)])])}>Vybrat všechny zobrazené</button><button type="button" className="secondarybutton" onClick={()=>setBulkRecipients(prev=>prev.filter(id=>!bulkCandidates.some(u=>u.id===id)))}>Odznačit</button></div><div className="adminusers-recipient-list">{bulkCandidates.map(u=><label key={u.id}><input type="checkbox" checked={bulkRecipients.includes(u.id)} onChange={e=>setBulkRecipients(prev=>e.target.checked?[...new Set([...prev,u.id])]:prev.filter(id=>id!==u.id))}/><span>{u.display_name||u.email}</span></label>)}</div><p className="adminusers-selection-count">Vybráno příjemců: <strong>{bulkRecipients.length}</strong></p><label>Předmět<input required maxLength={120} value={bulkTitle} onChange={e=>setBulkTitle(e.target.value)}/></label><label>Text oznámení<textarea required rows={5} maxLength={2000} value={bulkBody} onChange={e=>setBulkBody(e.target.value)}/></label><button className="primary" type="submit" disabled={Boolean(saving)||!bulkRecipients.length||!bulkTitle.trim()||!bulkBody.trim()}>Odeslat oznámení ({bulkRecipients.length})</button></form></section>}
  {section==="users"&&<section className="adminusers-panel"><div className="adminusers-section-heading"><div><h2>Seznam zaměstnanců</h2><p>Vyhledej zaměstnance a otevři jeho profil nebo další akce.</p></div><span className="adminusers-count">{filtered.length} z {users.length}</span></div><div className="adminusers-toolbar"><label><span>Hledat zaměstnance</span><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Jméno nebo e-mail…"/></label><label><span>Pracovní role</span><select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}><option value="all">Všechny role</option>{Object.entries(roleLabels).map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label></div>
  {loading?<p>Načítám uživatele…</p>:<div className="adminuserslist">{filtered.length?filtered.map(u=><article className="adminuserrow" key={u.id}><div className="adminuserrow-main"><span className="adminuser-avatar" aria-hidden="true">{initials(u)}</span><div className="adminuser-identity"><strong>{u.display_name||u.email||"Bez jména"}</strong><small>{u.email||"Bez e-mailu"}{u.id===currentUserId?" · Tvůj účet":""}</small><div className="adminuser-badges">{(u.roles?.length?u.roles:[u.role]).map(role=><span key={role}>{roleLabels[role]||role}</span>)}</div></div></div><div className="adminuserrow-actions"><button type="button" className="primary" disabled={Boolean(saving)} onClick={()=>{setMenuUser(null);editing===u.id?setEditing(null):openEdit(u)}}>{editing===u.id?"Zavřít profil":"Upravit profil"}</button><button type="button" className="secondarybutton" aria-expanded={menuUser===u.id} onClick={()=>setMenuUser(menuUser===u.id?null:u.id)}>Další akce ▾</button></div>
  {menuUser===u.id&&<div className="adminuser-more"><button type="button" className="secondarybutton" disabled={Boolean(saving)} onClick={()=>{setNotifyUser(u);setNotifyTitle("Zpráva od správce FOXA");setNotifyBody("");setMenuUser(null);setError("");setNotice("")}}>Poslat oznámení</button><button type="button" className="secondarybutton" disabled={Boolean(saving)||!u.email} onClick={()=>sendPasswordReset(u)}>Obnovit heslo e-mailem</button><button type="button" className="secondarybutton" disabled={Boolean(saving)||!u.email} onClick={()=>generatePasswordPdf(u)}>Vygenerovat QR/PDF</button><button type="button" className="secondarybutton" disabled={Boolean(saving)||!u.email} onClick={()=>generatePasswordPdf(u,true)}>Odeslat QR/PDF e-mailem</button></div>}
  {notifyUser?.id===u.id&&<form className="adminuseredit" onSubmit={sendNotification}><h3>Oznámení pro {u.display_name||u.email}</h3><label>Předmět<input required maxLength={120} value={notifyTitle} onChange={e=>setNotifyTitle(e.target.value)}/></label><label>Text oznámení<textarea required rows={4} maxLength={2000} value={notifyBody} onChange={e=>setNotifyBody(e.target.value)}/></label><div className="adminuser-edit-actions"><button type="submit" className="primary" disabled={Boolean(saving)||!notifyTitle.trim()||!notifyBody.trim()}>Odeslat</button><button type="button" className="secondarybutton" onClick={()=>setNotifyUser(null)}>Zrušit</button></div></form>}
  {editing===u.id&&<div className="adminuseredit"><h3>Upravit uživatelský profil</h3><label>Zobrazované jméno<input value={draftName} maxLength={120} onChange={e=>setDraftName(e.target.value)} placeholder="Jméno zaměstnance"/></label><label>Výchozí kancelář pro vrácení klíčů<input value={draftOffice} maxLength={30} onChange={e=>setDraftOffice(e.target.value)} placeholder="Např. 214"/></label><strong>Přidělené role</strong><div className="adminrolechecks">{Object.entries(roleLabels).map(([id,label])=><label key={id}><input type="checkbox" checked={draftRoles.includes(id)} disabled={u.id===currentUserId} onChange={e=>setDraftRoles(prev=>e.target.checked?[...prev,id]:prev.filter(r=>r!==id))}/>{label}</label>)}</div>{u.id===currentUserId&&<small>Vlastní role nelze z bezpečnostních důvodů upravit.</small>}<div className="adminuser-edit-actions"><button type="button" className="primary" disabled={Boolean(saving)||!draftRoles.length} onClick={()=>saveProfile(u)}>Uložit změny</button><button type="button" className="secondarybutton" onClick={()=>setEditing(null)}>Zrušit</button></div></div>}</article>):<p className="adminusers-empty">Žádný uživatel neodpovídá vyhledávání.</p>}</div>}</section>}
 </div>;
}
