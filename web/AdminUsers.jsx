import React,{useEffect,useState} from "react";
import QRCode from "qrcode";
import html2pdf from "html2pdf.js";
import "./admin-users.css";
const roleLabels={admin:"Administrátor",technician:"Technik",referent:"Referent"};
export default function AdminUsers({supabase,currentUserId}){
 const [users,setUsers]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState(""),[saving,setSaving]=useState(""),[search,setSearch]=useState(""),[editing,setEditing]=useState(null),[draftRoles,setDraftRoles]=useState([]),[draftName,setDraftName]=useState("");
 const load=async()=>{setLoading(true);setError("");const {data,error}=await supabase.rpc("isys_list_users");if(error)setError("Načtení uživatelů selhalo: "+error.message+" — Zkontroluj spuštění SQL skriptu admin-user-roles.sql.");else setUsers(data||[]);setLoading(false)};
 useEffect(()=>{load()},[]);
 const change=async(u,role)=>{if(u.role===role||saving)return;if(!window.confirm("Změnit roli uživatele "+u.email+" z "+(roleLabels[u.role]||u.role)+" na "+roleLabels[role]+"?"))return;setSaving(u.id);setError("");setNotice("");const {error}=await supabase.rpc("isys_set_user_role",{target_user:u.id,new_role:role});if(error)setError("Změna role selhala: "+error.message);else{setNotice("Role uživatele "+u.email+" byla změněna na "+roleLabels[role]+".");await load()}setSaving("")};
 const openEdit=u=>{setEditing(u.id);setDraftRoles(u.roles?.length?u.roles:[u.role||"technician"]);setDraftName(u.display_name||"");setError("");setNotice("")};
 const saveProfile=async u=>{
  if(!draftRoles.length){setError("Vyber alespoň jednu roli.");return}
  if(!window.confirm("Uložit profil a role uživatele "+u.email+"?"))return;
  setSaving(u.id);setError("");setNotice("");
  const {error}=await supabase.rpc("isys_update_user",{target_user:u.id,new_roles:draftRoles,new_display_name:draftName.trim()});
  if(error)setError("Uložení profilu selhalo: "+error.message+" — Zkontroluj migraci admin-multiple-roles.sql.");
  else{setNotice("Profil uživatele "+u.email+" byl uložen.");setEditing(null);await load()}
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
 const generatePasswordPdf=async u=>{
  if(!u.email||saving)return;
  if(!window.confirm("Vytvořit citlivý jednorázový odkaz pro nastavení hesla uživatele "+u.email+"? Předávací list předej pouze této osobě."))return;
  setSaving(u.id);setError("");setNotice("");
  try{
   const {data,error}=await supabase.functions.invoke("isys-password-handover",{body:{user_id:u.id}});
   if(error||!data?.link)throw Error(error?.message||"Server nevrátil odkaz.");
   const qr=await QRCode.toDataURL(data.link,{width:420,margin:2,errorCorrectionLevel:"M"});
   const escape=s=>String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
   const html=`<div style="font-family:Arial,sans-serif;color:#19364a;padding:18mm 17mm;background:white;min-height:250mm;box-sizing:border-box"><div style="border-bottom:3px solid #146c9c;padding-bottom:15px"><div style="display:flex;align-items:center;gap:14px"><img src="${window.location.origin}/isys/icon.svg" alt="Logo iSYS" style="width:54px;height:54px;object-fit:contain"/><div><div style="font-size:31px;font-weight:bold;color:#146c9c">iSYS</div><div style="font-size:10px;letter-spacing:1.4px;color:#64788b">PROPERTY MANAGEMENT</div></div></div><div style="font-size:13px;color:#64788b">Interní systém správy bytových domů</div></div><h1 style="font-size:24px;margin:30px 0 10px">Nastavení nového hesla</h1><p>Tento osobní předávací list je určen pouze uvedenému zaměstnanci.</p><p style="font-size:16px"><strong>Uživatelský účet:</strong> ${escape(data.email)}</p><div style="text-align:center;margin:25px 0"><img src="${qr}" style="width:75mm;height:75mm" alt="QR kód pro nastavení hesla"/></div><div style="margin:0 0 22px;padding:12px 14px;border:1px solid #d6e9f1;border-radius:8px;background:#f4f9fc"><strong style="font-size:13px">Přímý odkaz na nastavení hesla:</strong><div style="margin-top:8px;font-size:10px;line-height:1.5;overflow-wrap:anywhere;word-break:break-all;color:#146c9c">${escape(data.link)}</div></div><h2 style="font-size:16px">Postup</h2><ol style="font-size:14px;line-height:1.9"><li>Naskenujte QR kód telefonem nebo otevřete přímý odkaz uvedený pod ním.</li><li>Otevřete zobrazený odkaz pro obnovení přístupu.</li><li>Zadejte nové heslo (minimálně 12 znaků) a potvrďte ho.</li><li>Po dokončení se přihlaste do aplikace iSYS.</li></ol><div style="margin-top:25px;background:#e7f3f7;border:1px solid #d6e9f1;padding:15px;border-radius:8px;font-size:12px"><strong>DŮLEŽITÉ:</strong> QR kód obsahuje citlivý odkaz umožňující nastavit heslo. Nepředávejte tento list jiné osobě. Odkaz má omezenou platnost a může být použit pouze jednou. Pokud nefunguje, požádejte správce o nový list.</div><p style="margin-top:30px;font-size:11px;color:#64788b">Vystaveno: ${escape(new Date().toLocaleString("cs-CZ"))} · iSYS</p></div>`;
   await html2pdf().set({margin:0,filename:"isys-nastaveni-hesla-"+u.email.replace(/[^a-z0-9.-]/gi,"_")+".pdf",image:{type:"jpeg",quality:.98},html2canvas:{scale:2},jsPDF:{unit:"mm",format:"a4",orientation:"portrait"}}).from(html).save();
   setNotice("PDF pro "+u.email+" bylo vytvořeno. Vytiskni jej a bezpečně předej zaměstnanci.");
  }catch(e){setError("PDF se nepodařilo vytvořit: "+e.message+" Zkontroluj nasazení funkce isys-password-handover.")}
  finally{setSaving("")}
 };
 const filtered=users.filter(u=>(u.email||"").toLocaleLowerCase("cs").includes(search.toLocaleLowerCase("cs")));
 return <div className="adminusers"><div className="pageheading"><div><h1>Správa uživatelů a rolí</h1><p>Přiřazování rolí administrátorům, technikům a referentům.</p></div><button type="button" className="secondarybutton" onClick={load} disabled={loading}>Obnovit</button></div><p className="adminusershint">Změny oprávnění se uživateli projeví po opětovném načtení aplikace. Z bezpečnostních důvodů zde nemůžeš změnit vlastní roli.</p>{error&&<div className="error" role="alert">{error}</div>}{notice&&<div className="notice" role="status">{notice}</div>}<label className="adminuserssearch">Vyhledat podle e-mailu<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Zadej e-mail uživatele"/></label>{loading?<p>Načítám uživatele…</p>:<div className="adminuserslist">{filtered.length?filtered.map(u=><div className="adminuserrow" key={u.id}><div><strong>{u.email||"Bez e-mailu"}</strong><small>Role: {(u.roles?.length?u.roles:[u.role]).map(r=>roleLabels[r]||r).join(", ")}{u.id===currentUserId?" · Tvůj účet":""}{u.display_name?" · "+u.display_name:""}</small></div><button type="button" className="secondarybutton" disabled={Boolean(saving)} onClick={()=>editing===u.id?setEditing(null):openEdit(u)}>{editing===u.id?"Zrušit úpravy":"Upravit profil"}</button><button type="button" className="secondarybutton" disabled={Boolean(saving)||!u.email} onClick={()=>sendPasswordReset(u)}>Poslat reset hesla</button><button type="button" className="secondarybutton" disabled={Boolean(saving)||!u.email} onClick={()=>generatePasswordPdf(u)}>{saving===u.id?"Připravuji…":"PDF s QR pro heslo"}</button>{editing===u.id&&<div className="adminuseredit"><label>Zobrazované jméno<input value={draftName} maxLength={120} onChange={e=>setDraftName(e.target.value)} placeholder="Jméno uživatele"/></label><strong>Přiřazené role</strong><div className="adminrolechecks">{Object.entries(roleLabels).map(([id,label])=><label key={id}><input type="checkbox" checked={draftRoles.includes(id)} onChange={e=>setDraftRoles(prev=>e.target.checked?[...prev,id]:prev.filter(r=>r!==id))}/>{label}</label>)}</div><button type="button" className="primary" disabled={Boolean(saving)||!draftRoles.length} onClick={()=>saveProfile(u)}>Uložit profil</button></div>}</div>):<p>Žádní uživatelé neodpovídají hledání.</p>}</div>}</div>;
}
