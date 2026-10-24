import React from "react";
import "./RedphoneContact.css";

const PhoneIcon=()=> <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.5 3a2 2 0 0 1-.6 1.8L7.1 10a16 16 0 0 0 6.9 6.9l1.5-1.9a2 2 0 0 1 1.8-.6l3 .5a2 2 0 0 1 1.7 2Z"/></svg>;

export default function RedphoneContact({compact=false}){
 return <aside className={"foxa-redphone"+(compact?" foxa-redphone-compact":"")} aria-label="Redphone – telefonická podpora">
  <div className="foxa-redphone-main">
   <span className="foxa-redphone-icon"><PhoneIcon/></span>
   <span className="foxa-redphone-copy"><strong>REDPHONE</strong><small>Telefonická podpora</small></span>
   <span className="foxa-redphone-tag">PŘÍMÁ LINKA</span>
  </div>
  <a className="foxa-redphone-call" href="tel:+420910129908" aria-label="Zavolat na Redphone +420 910 129 908">
   <span className="foxa-redphone-number">+420 <strong>910 129 908</strong></span>
   <span className="foxa-redphone-cta"><PhoneIcon/><span>Zavolat</span></span>
  </a>
 </aside>
}
