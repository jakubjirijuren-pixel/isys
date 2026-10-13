import React,{useEffect,useState} from "react";
import {createRoot} from "react-dom/client";
import {createClient} from "@supabase/supabase-js";
import "./style.css";
const supabase=createClient("https://qcbyjxovnf fdruiznlnt.supabase.co".replace(" ",""),"sb_publishable_AFfvrodRnmBTOLjlFadYfQ_Foa4e_P1");
function App(){
 const [session,setSession]=useState(null),[loading,setLoading]=useState(true),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{supabase.auth.getSession().then(({data,error})=>{if(error)setError(error.message);setSession(data?.session??null);setLoading(false)});const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>setSession(s));return()=>subscription.unsubscribe()},[]);
 async function login(e){e.preventDefault();setError("");setBusy(true);const {error}=await supabase.auth.signInWithPassword({email,password});if(error)setError("Přihlášení se nezdařilo. Zkontroluj e-mail, heslo a potvrzení účtu.");setBusy(false)}
 if(loading)return <main className="center">Načítání iSYS…</main>;
 if(!session)return <main className="center"><form className="login" onSubmit={login}><div className="mark">iSYS</div><h1>Přihlášení do systému</h1><p>Interní systém správy bytových domů</p><label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label><label>Heslo<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/></label>{error&&<div role="alert" className="error">{error}</div>}<button disabled={busy}>{busy?"Přihlašuji…":"Přihlásit se"}</button><small>Účty zakládá správce systému.</small></form></main>;
 return <div className="layout"><aside><div className="mark">iSYS</div><div className="sideTitle">SPRÁVA DOMŮ</div>{["Přehled","Objekty","Kontroly","Evidence klíčů","Úkoly"].map((x,i)=><div className={"nav "+(!i?"selected":"")} key={x}>{x}</div>)}</aside><section className="content"><header><strong>iSYS / Přehled</strong><button className="logout" onClick={()=>supabase.auth.signOut()}>Odhlásit se</button></header><div className="body"><h1>Vítej v iSYS</h1><p>Přihlášený účet: {session.user.email}</p><div className="tiles">{["Spravované objekty","Pravidelné kontroly","Evidence klíčů","Otevřené úkoly"].map(x=><article key={x}><h3>{x}</h3><p>Modul připravujeme</p></article>)}</div><div className="notice">Přihlášení přes Supabase funguje. Datové moduly zapojíme po ověření databázových oprávnění.</div></div></section></div>
}
createRoot(document.getElementById("root")).render(<App/>);
