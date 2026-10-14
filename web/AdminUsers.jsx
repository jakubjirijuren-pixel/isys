import React,{useEffect,useState} from "react";
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
 const filtered=users.filter(u=>(u.email||"").toLocaleLowerCase("cs").includes(search.toLocaleLowerCase("cs")));
 return <div className="adminusers"><div className="pageheading"><div><h1>Správa uživatelů a rolí</h1><p>Přiřazování rolí administrátorům, technikům a referentům.</p></div><button type="button" className="secondarybutton" onClick={load} disabled={loading}>Obnovit</button></div><p className="adminusershint">Změny oprávnění se uživateli projeví po opětovném načtení aplikace. Z bezpečnostních důvodů zde nemůžeš změnit vlastní roli.</p>{error&&<div className="error" role="alert">{error}</div>}{notice&&<div className="notice" role="status">{notice}</div>}<label className="adminuserssearch">Vyhledat podle e-mailu<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Zadej e-mail uživatele"/></label>{loading?<p>Načítám uživatele…</p>:<div className="adminuserslist">{filtered.length?filtered.map(u=><div className="adminuserrow" key={u.id}><div><strong>{u.email||"Bez e-mailu"}</strong><small>Role: {(u.roles?.length?u.roles:[u.role]).map(r=>roleLabels[r]||r).join(", ")}{u.id===currentUserId?" · Tvůj účet":""}{u.display_name?" · "+u.display_name:""}</small></div><button type="button" className="secondarybutton" disabled={Boolean(saving)} onClick={()=>editing===u.id?setEditing(null):openEdit(u)}>{editing===u.id?"Zrušit úpravy":"Upravit profil"}</button><button type="button" className="secondarybutton" disabled={Boolean(saving)||!u.email} onClick={()=>sendPasswordReset(u)}>Poslat reset hesla</button>{editing===u.id&&<div className="adminuseredit"><label>Zobrazované jméno<input value={draftName} maxLength={120} onChange={e=>setDraftName(e.target.value)} placeholder="Jméno uživatele"/></label><strong>Přiřazené role</strong><div className="adminrolechecks">{Object.entries(roleLabels).map(([id,label])=><label key={id}><input type="checkbox" checked={draftRoles.includes(id)} onChange={e=>setDraftRoles(prev=>e.target.checked?[...prev,id]:prev.filter(r=>r!==id))}/>{label}</label>)}</div><button type="button" className="primary" disabled={Boolean(saving)||!draftRoles.length} onClick={()=>saveProfile(u)}>Uložit profil</button></div>}</div>):<p>Žádní uživatelé neodpovídají hledání.</p>}</div>}</div>;
}
