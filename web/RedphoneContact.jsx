import React from "react";
import "./RedphoneContact.css";

export default function RedphoneContact({compact=false}){
 return <aside className={"foxa-redphone"+(compact?" foxa-redphone-compact":"")} aria-label="Redphone – telefonická pomoc">
  <span className="foxa-redphone-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.5 3a2 2 0 0 1-.6 1.8L7.1 10a16 16 0 0 0 6.9 6.9l1.5-1.9a2 2 0 0 1 1.8-.6l3 .5a2 2 0 0 1 1.7 2Z"/></svg></span>
  <span className="foxa-redphone-copy"><strong>REDPHONE</strong><small>Telefonická podpora</small></span>
  <a className="foxa-redphone-call" href="tel:+420910129908" aria-label="Zavolat na Redphone +420 910 129 908"><span>+420 910 129 908</span><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg></a>
 </aside>
}
