import React,{useEffect,useState} from "react";
import {createRoot} from "react-dom/client";
import {createClient} from "@supabase/supabase-js";
import "./vote-mobile.css";
const supabase=createClient("https://qcbyjxovnffdruiznlnt.supabase.co","sb_publishable_AFfvrodRnmBTOLjlFadYfQ_Foa4e_P1");
function MobileVote(){
 const token=new URLSearchParams(location.search).get("token")||"";
 const [state,setState]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const refresh=async()=>{if(!token){setError("Chybí hlasovací pozvánka.");return}const {data,error:e}=await supabase.rpc("foxa_live_mobile",{p_token:token});if(e)setError(e.message);else{setState(data);setError("")}};
 useEffect(()=>{refresh();const t=setInterval(refresh,5000);return()=>clearInterval(t)},[]);
 const cast=async choice=>{if(!window.confirm("Odeslat hlas "+choice+"? Po odeslání jej nelze z telefonu změnit."))return;setBusy(true);const {data,error:e}=await supabase.rpc("foxa_live_mobile",{p_token:token,p_choice:choice});if(e)setError(e.message);else{setState(data);setError("")}setBusy(false)};
 return <main className="foxa-mobile-vote"><div className="foxa-mobile-vote-card"><small>FOXA · SHROMÁŽDĚNÍ SVJ</small><h1>Elektronické hlasování</h1>{error&&<p className="error" role="alert">{error}</p>}{!state&&!error&&<p>Načítání…</p>}{state&&<><p>Jednotka <strong>{state.unit||"—"}</strong> · {state.owner}</p>{state.state==="closed"?<h2>Schůze byla ukončena.</h2>:state.state==="waiting"?<><h2>Čeká se na zahájení hlasování</h2><p>Stránka se aktualizuje automaticky.</p></>:<><h2>{state.motion}</h2>{!state.present?<p className="error">Účast zatím nebyla potvrzena pořadatelem.</p>:state.vote?<p className="success">Hlas zaznamenán: <strong>{state.vote}</strong></p>:<div className="vote-options"><button disabled={busy} onClick={()=>cast("PRO")}>PRO</button><button disabled={busy} onClick={()=>cast("PROTI")}>PROTI</button><button disabled={busy} onClick={()=>cast("ZDRŽEL SE")}>ZDRŽEL SE</button></div>}</>}</>}<button className="refresh" onClick={refresh}>Obnovit stav</button><p className="foot">Individuální odkaz nesdílejte s dalšími osobami.</p></div></main>
}
createRoot(document.getElementById("root")).render(<MobileVote/>);
