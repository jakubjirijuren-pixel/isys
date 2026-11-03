import React,{useEffect,useState} from "react";
import {createRoot} from "react-dom/client";
import {createClient} from "@supabase/supabase-js";
import "./svj-board.css";
const db=createClient("https://qcbyjxovnffdruiznlnt.supabase.co","sb_publishable_AFfvrodRnmBTOLjlFadYfQ_Foa4e_P1");
const fmt=n=>Number(n||0).toLocaleString("cs-CZ",{maximumFractionDigits:2});
const percent=(n,d)=>d?Math.max(0,Math.min(100,Number(n)/Number(d)*100)):0;
function Board(){
 const token=new URLSearchParams(location.search).get("board")||"";
 const [data,setData]=useState(null),[error,setError]=useState(""),[updated,setUpdated]=useState(null),[fullscreen,setFullscreen]=useState(false);
 const refresh=async()=>{if(!token){setError("Chybí odkaz na informační tabuli.");return}const {data:d,error:e}=await db.rpc("foxa_live_board",{p_token:token});if(e)setError(e.message);else{setData(d);setError("");setUpdated(new Date())}};
 useEffect(()=>{refresh();const id=setInterval(refresh,3000);return()=>clearInterval(id)},[token]);
 const motion=data?.motion;const total=Number(data?.total_share||0);const present=Number(data?.present_share||0);const votes=[{label:"PRO",amount:Number(motion?.pro||0),color:"green"},{label:"PROTI",amount:Number(motion?.against||0),color:"red"},{label:"ZDRŽEL SE",amount:Number(motion?.abstain||0),color:"amber"}];
 return <main className="svj-board"><header className="board-header"><div className="board-brand"><span className="board-symbol">F</span><div><strong>FOXA</strong><small>INFORMAČNÍ TABULE · SHROMÁŽDĚNÍ SVJ</small></div></div><div className="board-head-right"><span className={"board-live "+(data?.state==="closed"?"ended":"")}>{data?.state==="closed"?"SCHŮZE UKONČENA":motion?.state==="open"?"PROBÍHÁ HLASOVÁNÍ":"INFORMAČNÍ REŽIM"}</span><button onClick={()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.();setFullscreen(!fullscreen)}}>{fullscreen?"Ukončit celou obrazovku":"Celá obrazovka"}</button></div></header>
 {error?<section className="board-error" role="alert">{error}</section>:!data?<section className="board-loading">Načítání informační tabule…</section>:<>
 <section className="board-intro"><div><div className="board-kicker">STŘEDISKO {data.center||"—"} · {data.date}</div><h1>{data.title}</h1><p>{data.building}</p></div><div className="board-clock"><time>{new Date().toLocaleDateString("cs-CZ")}</time><small>Aktualizace automaticky každé 3 sekundy</small></div></section>
 <section className="board-stats"><div><small>ÚČAST NA SHROMÁŽDĚNÍ</small><strong>{percent(present,total).toLocaleString("cs-CZ",{maximumFractionDigits:2})} %</strong><div className="board-progress"><span style={{width:percent(present,total)+"%"}}/></div><p>{fmt(present)} z {fmt(total)} podílů</p></div><div><small>PREZENTOVANÉ HLASOVACÍ ZÁZNAMY</small><strong>{data.present_count} <em>/ {data.total_count}</em></strong><p>Počet záznamů v prezenční listině</p></div></section>
 <section className="board-voting"><div className="board-section-head"><div><small>AKTUÁLNÍ BOD JEDNÁNÍ</small><h2>{motion?.title||"Čeká se na zahájení hlasování"}</h2></div><span>{motion?.state==="open"?"HLASOVÁNÍ OTEVŘENO":motion?.state==="closed"?"POSLEDNÍ UZAVŘENÉ HLASOVÁNÍ":"PŘIPRAVENO"}</span></div>
 {motion?<><div className="board-votes">{votes.map(v=><div className={"board-vote "+v.color} key={v.label}><small>{v.label}</small><strong>{percent(v.amount,present).toLocaleString("cs-CZ",{maximumFractionDigits:2})} %</strong><div className="board-progress"><span style={{width:percent(v.amount,present)+"%"}}/></div><p>{fmt(v.amount)} podílů</p></div>)}</div><div className="board-unvoted">Dosud nehlasovalo: <strong>{fmt(motion.not_voted)} podílů</strong> · Výsledky jsou počítány z přítomných podílů.</div></>:<p className="board-waiting">Po zahájení hlasování se zde automaticky zobrazí průběžné výsledky.</p>}</section>
 <footer><span>FOXA · ELEKTRONICKÉ HLASOVÁNÍ SVJ</span><span>Poslední aktualizace: {updated?.toLocaleTimeString("cs-CZ")||"—"}</span></footer>
 </>}</main>;
}
createRoot(document.getElementById("root")).render(<Board/>);
