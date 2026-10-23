import RedphoneContact from "./RedphoneContact.jsx";
import React,{useEffect,useState} from "react";
import "./foxa-module-terminal.css";

const MODULES={
 "Objekty":{icon:"▤",subtitle:"Evidence a identifikace objektů",links:["Technické kontroly","Kontroly","Úkoly","Evidence klíčů"]},
 "Technické kontroly":{icon:"☑",subtitle:"Kontrolní výkazy a fotodokumentace",links:["Objekty","Úkoly"]},
 "Kontroly":{icon:"☑",subtitle:"Kontroly referenta",links:["Objekty","Úkoly"]},
 "Evidence klíčů":{icon:"⚿",subtitle:"Výpůjčky, vrácení a identifikace",links:["Objekty","Úkoly"]},
 "Úkoly":{icon:"☷",subtitle:"Pracovní požadavky a jejich řešení",links:["Objekty","Technické kontroly","Kontroly"]},
 "Docházka":{icon:"◷",subtitle:"Evidence pracovní doby",links:["Dovolené"]},
 "Vozidla a kniha jízd":{icon:"▣",subtitle:"Rezervace vozidel a pracovní jízdy",links:["Úkoly"]},
 "Dovolené":{icon:"▦",subtitle:"Plánování nepřítomnosti",links:["Docházka"]},
 "Tiskopisy":{icon:"▤",subtitle:"Vyplnění a příprava dokumentů",links:["Objekty"]},
 "Kniha odchozí pošty":{icon:"✉",subtitle:"Evidence odeslané korespondence",links:["Objekty"]},
 "Wiki":{icon:"▧",subtitle:"Pracovní postupy a návody",links:[]},
 "Správa uživatelů":{icon:"♙",subtitle:"Správa účtů a přístupových práv",links:["Wiki"]},
 "Zpětná vazba":{icon:"✎",subtitle:"Nahlášení podnětů a problémů",links:["Wiki"]}
};
export default function FoxaModuleTerminal({page,availablePages=[],onNavigate}){
 const [online,setOnline]=useState(()=>typeof navigator==="undefined"||navigator.onLine);
 useEffect(()=>{const update=()=>setOnline(navigator.onLine);window.addEventListener("online",update);window.addEventListener("offline",update);return()=>{window.removeEventListener("online",update);window.removeEventListener("offline",update)}},[]);
 if(page==="Přehled")return null;
 const info=MODULES[page]||{icon:"▦",subtitle:"Pracovní modul",links:[]};
 const links=page==="Objekty"?[]:info.links.filter(name=>availablePages.includes(name));
 return <div className="foxa-field-module-tools" aria-label={"Terminálové ovládání: "+page}>
  <div className="foxa-field-module-topline">{page!=="Objekty"&&<button type="button" className="foxa-field-module-back" onClick={()=>onNavigate("Přehled")} aria-label="Zpět na úvodní terminál">‹ Terminál</button>}<span className={"foxa-field-module-network "+(online?"is-online":"is-offline")} role="status"><span aria-hidden="true">●</span> {online?"Připojeno":"Bez připojení"}</span></div>
  <div className="foxa-field-module-header">
   <div className="foxa-field-module-icon" aria-hidden="true">{info.icon}</div>
   <div className="foxa-field-module-title"><span>FOXA FIELD / PRACOVNÍ MODUL</span><h1>{page}</h1><p>{info.subtitle}</p></div>
   <span className="foxa-field-module-ready" aria-label="Pracovní modul">●</span>
  </div>
  {links.length>0&&<div className="foxa-field-module-links" aria-label="Související moduly">{links.slice(0,3).map(name=><button type="button" key={name} onClick={()=>onNavigate(name)}><span>{name}</span><span aria-hidden="true">›</span></button>)}</div>}
  <RedphoneContact compact />
 </div>
}
