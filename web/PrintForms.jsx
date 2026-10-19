import React,{useEffect,useMemo,useState} from "react";
import {SBD_LOGO} from "./SbdProtocolLogo.js";
import {stampImage} from "./SbdProtocolStamp.js";
import "./PrintForms.css";

const today=()=>new Date().toISOString().slice(0,10);
const templates={
 glazing:{title:"Podmínky k zasklení lodžie",subject:"Věc: Podmínky k zasklení lodžie",greeting:"",body:"Po předložení navrhované stavební úpravy vydává správce objektu SBD Praha 8 – podmínky,\nkteré se vlastník-stavebník zavazuje dodržet:\n\n1. Stavební úprava bude plně hrazena z prostředků vlastníka,\n   - jedná se o zasklení lodžie bezrámovým systémem firmou {{firma}} z {{sklo}}\n   - č.b. {{byt}}, ul. {{ulice}} č.p. {{cisloPopisne}}, {{mesto}}, {{psc}}, k.ú. {{katastr}}\n2. Úprava bude provedena dle schválené stavební technologie a způsobu zasklívání doložené certifikátem, pod odborným stavebním dozorem a bude zadána k provedení odborné firmě.\n3. Budou respektovány platné normy vč. předpisů o bezpečnosti práce a požární ochraně.\n4. Stav. úprava bude oznámena výboru SVJ objektu, zejména zahájení prací. Ukončení prací bude oznámeno TPÚ SBD 8 písemně.\n5. Práce budou probíhat s ohledem na ostatní bydlící za průběžného dodržování pořádku a čistoty v objektu v souladu s domovním řádem, resp. práce bude prováděna pouze ve všední dny od 7.00 do 19.00hod. /mimo SO+NE/ ! Případné škody vzniklé v souvislosti s úpravou budou vlastníkem bezprostředně na jeho náklady odstraněny. V případě rekonstrukce lodžií v objektu umožní vlastník bytu přístup a v příp. nutnosti demontáže zasklení zajistí na své náklady demontáž. Nebude skladován žádný materiál na veřej. prostranství, ani zeleni bez povolení ÚMČ P-8, rovněž tak v objektu bez povolení výboru SVJ.\n6. Horní díl bezrámového zasklení bude proveden z čirého skla, stávající základní rám bude ve shodném barevném provedení se stávajícími lodžiemi. V případě nátěrů lodžií /údržby, oprav apod./ zajistí vlastník bytu na své náklady demontáž. Rovněž zateplení spodní části nelze barevně ani materiálově odlišovat, pokud to nepovolí stavební odbor ÚMČ P-8. Lodžiové panely zůstanou v původní barevnosti, jsou součástí fasády, nikoli interiéru bytu.\n\nPozn.: Podmínky jsou platné pouze se souhlasem výboru SVJ.\n\nCo: TPÚ, SVJ",closing:"Za správce:"},
 letter:{title:"Dopis na hlavičkovém papíře",subject:"Věc: ",greeting:"Vážení,",body:"",closing:"S pozdravem"},
 notice:{title:"Oznámení vlastníkům / nájemcům",subject:"Oznámení",greeting:"Vážení vlastníci a nájemci,",body:"Dovolujeme si Vás informovat, že\n\nDěkujeme za pochopení.",closing:"S pozdravem"},
 request:{title:"Výzva / žádost o součinnost",subject:"Výzva k součinnosti",greeting:"Vážení,",body:"Žádáme Vás o poskytnutí součinnosti v následující záležitosti:\n\n",closing:"Děkujeme za spolupráci.\n\nS pozdravem"},
 blank:{title:"Volný tiskopis",subject:"",greeting:"",body:"",closing:""}
};
const esc=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const multiline=v=>esc(v).replace(/\r?\n/g,"<br>");
const dateCZ=v=>v?new Date(v+"T12:00:00").toLocaleDateString("cs-CZ"):"";
const formatCzechPhone=value=>{const raw=String(value??"").trim();if(!raw)return "";const digits=raw.replace(/\\D/g,"");let national=digits;if(digits.startsWith("00420")&&digits.length===14)national=digits.slice(5);else if(digits.startsWith("420")&&digits.length===12)national=digits.slice(3);if(national.length===9)return "+420 "+national.match(/.{3}/g).join(" ");return raw;};

export default function PrintForms({buildings=[],currentAccountName="",reportSignature={},userEmail="",userPhone="",supabase,userId}){
 const [template,setTemplate]=useState("letter");
 const [fields,setFields]=useState({recipient:"",recipientAddress:"",apartmentNumber:"",subject:"",greeting:"Vážení,",body:"",closing:"S pozdravem",city:"Praha",date:today(),reference:"",incomingReference:"",email:"",phone:"",contact:currentAccountName,position:"Technik"});
 const [glazing,setGlazing]=useState({firma:"",sklo:"čirého skla",byt:"",ulice:"",cisloPopisne:"",mesto:"Praha 8",psc:"182 00",katastr:"Kobylisy"});
 const setGlazingField=(key,value)=>setGlazing(prev=>({...prev,[key]:value}));
 const fillGlazingBody=body=>body.replace(/\{\{(firma|sklo|byt|ulice|cisloPopisne|mesto|psc|katastr)\}\}/g,(_,key)=>(key==="byt"?(glazing.byt||fields.apartmentNumber):glazing[key])?.trim()||"…………");
 const [signerName,setSignerName]=useState("");
 const [signerPosition,setSignerPosition]=useState("");
 const [buildingQuery,setBuildingQuery]=useState("");
 const [buildingOpen,setBuildingOpen]=useState(false);
 const [selectedBuilding,setSelectedBuilding]=useState("");
 const [profilePhone,setProfilePhone]=useState(userPhone);
 useEffect(()=>{setFields(prev=>({...prev,contact:reportSignature?.name?.trim()||currentAccountName||prev.contact,email:userEmail||prev.email,phone:userPhone||prev.phone}))},[currentAccountName,reportSignature?.name,userEmail,userPhone]);
 useEffect(()=>{if(!supabase||!userId)return;let active=true;supabase.from("profiles").select("*").eq("id",userId).maybeSingle().then(({data,error})=>{if(!active||error||!data)return;const phone=data.phone||data.phone_number||data.telefon||"";const email=data.email||userEmail;const name=data.display_name||data.full_name||data.name||"";setProfilePhone(phone||userPhone);setFields(prev=>({...prev,phone:phone||prev.phone,email:email||prev.email,contact:reportSignature?.name?.trim()||name||prev.contact}))});return()=>{active=false}},[supabase,userId,userEmail,userPhone,reportSignature?.name]);
 const buildingOptions=useMemo(()=>buildings.filter(b=>[b.object_number,b.name,b.address,b.street,b.city].some(v=>String(v||"").toLocaleLowerCase("cs").includes(buildingQuery.toLocaleLowerCase("cs")))).sort((a,b)=>String(a.object_number||"").localeCompare(String(b.object_number||""),"cs",{numeric:true})).slice(0,35),[buildings,buildingQuery]);
 const [error,setError]=useState("");
 const [mailEnabled,setMailEnabled]=useState(false);
 const [mailMethod,setMailMethod]=useState("Pošta");
 const [mailSentOn,setMailSentOn]=useState(today());
 const [mailTracking,setMailTracking]=useState("");
 const [mailNotes,setMailNotes]=useState("");
 const [mailSaving,setMailSaving]=useState(false);
 const [mailSuccess,setMailSuccess]=useState("");
 const [mailSavedSnapshot,setMailSavedSnapshot]=useState("");
 const recipientAddressWithApartment=[fields.recipientAddress.trim(),fields.apartmentNumber.trim()?`Byt č. ${fields.apartmentNumber.trim()}`:""].filter(Boolean).join("\n");
 const mailSnapshot=JSON.stringify({recipient:fields.recipient,address:recipientAddressWithApartment,subject:fields.subject,reference:fields.reference,building_id:selectedBuilding,sent_on:mailSentOn,method:mailMethod,tracking_number:mailTracking,notes:mailNotes});
 const saveToOutgoingMail=async()=>{
  if(!supabase||!userId){setError("Pro zápis do knihy odchozí pošty je nutné přihlášení.");return}
  if(!fields.recipient.trim()||!fields.subject.trim()||!mailSentOn){setError("Pro zápis vyplňte příjemce, věc dokumentu a datum odeslání.");return}
  if(mailSavedSnapshot===mailSnapshot){setError("Tento záznam už byl uložen. Pro další zápis nejprve změňte údaje.");return}
  setMailSaving(true);setError("");setMailSuccess("");
  const payload={sent_on:mailSentOn,recipient:fields.recipient.trim(),address:recipientAddressWithApartment,subject:fields.subject.trim(),reference:fields.reference.trim(),method:mailMethod,tracking_number:mailTracking.trim(),notes:mailNotes.trim(),building_id:selectedBuilding||null,created_by:userId};
  const {data,error:insertError}=await supabase.from("outgoing_mail").insert(payload).select("record_number").single();
  if(insertError)setError("Zápis do knihy odchozí pošty se nezdařil: "+insertError.message);
  else{setMailSavedSnapshot(mailSnapshot);setMailSuccess("Dokument byl zapsán do knihy odchozí pošty"+(data?.record_number?" pod číslem "+data.record_number:"")+". Zápis neznamená automatické odeslání zásilky.")}
  setMailSaving(false);
 };
 const set=(key,value)=>setFields(prev=>({...prev,[key]:value}));
 const chooseTemplate=id=>{setTemplate(id);const t=templates[id];setFields(prev=>({...prev,subject:t.subject,greeting:t.greeting,body:t.body,closing:t.closing}));if(id==="glazing"){setAlternateSigner(true);setSignerName("Miroslav Švarc „pp“");setSignerPosition("ředitel družstva")}else{setAlternateSigner(false);setSignerName("");setSignerPosition("")}};
 const selectBuilding=id=>{setSelectedBuilding(id);setBuildingOpen(false);const b=buildings.find(x=>String(x.id)===id);if(b){setBuildingQuery([b.object_number,b.name||b.address].filter(Boolean).join(" – "));setFields(prev=>({...prev,recipient:b.legal_entity||b.name||"",recipientAddress:b.address||[b.street,b.city].filter(Boolean).join(", ")}));const street=String(b.street||b.address||"").trim();const match=street.match(/^(.*?)[, ]+([0-9]+(?:\/[0-9A-Za-z]+)?)(?:,|$)/);setGlazing(prev=>({...prev,ulice:match?.[1]||prev.ulice,cisloPopisne:match?.[2]||prev.cisloPopisne}))}else setBuildingQuery("")};
 const signatureImage=!alternateSigner&&typeof reportSignature?.image==="string"&&reportSignature.image.startsWith("data:image/")?reportSignature.image:"";
 const documentHTML=()=>`<div class="pf-paper${template==="glazing"?" pf-glazing":""}"><header class="pf-letterhead sbd-header"><div class="sbd-logo">${SBD_LOGO}</div><div class="sbd-info"><div class="sbd-name">Stavební bytové družstvo Praha 8</div><div>Horňátecká 1772/19, 182 00 Praha 8</div><div>IČO: 00034550, DIČ: CZ 00034550, Bankovní spojení: ČSOB a.s., č.ú. 746873/0300</div><div>Zapsané v Obchodním rejstříku vedeném Městským soudem v Praze v oddílu Dr XCVIII., vložka 254</div></div></header><div class="pf-top"><div class="pf-meta"><div>Váš dopis zn.: ${esc(fields.incomingReference)}</div><div>Naše značka: ${esc(fields.reference)}</div><div>Vyřizuje: ${esc(fields.contact)}</div><div>Email: ${esc(fields.email)}</div><div>Telefon: ${esc(formatCzechPhone(fields.phone))}</div><div>${esc(fields.city)}, dne: ${dateCZ(fields.date)}</div></div><div class="pf-recipient"><strong>Adresa</strong><div>${multiline(fields.recipient)}${fields.recipient&&recipientAddressWithApartment?"<br>":""}${multiline(recipientAddressWithApartment)}</div></div></div>${fields.subject?`<h2 class="pf-subject">${multiline(fields.subject)}</h2>`:""}<main class="pf-letterbody">${fields.greeting?`<p>${multiline(fields.greeting)}</p>`:""}<div class="pf-bodytext">${multiline(template==="glazing"?fillGlazingBody(fields.body):fields.body)||'<span class="pf-placeholder">Zde bude text tiskopisu…</span>'}</div>${fields.closing?`<p>${multiline(fields.closing)}</p>`:""}<div class="pf-signature">${!alternateSigner?`<img class="pf-stamp-image" src="${stampImage}" alt="Razítko SBD Praha 8">`:""}${signatureImage?`<img class="pf-signature-image" src="${esc(signatureImage)}" alt="Podpis uživatele">`:""}<span class="pf-signature-line">................................................</span><strong>${multiline(alternateSigner?signerName:fields.contact)}</strong>${(alternateSigner?signerPosition:fields.position)?`<small>${multiline(alternateSigner?signerPosition:fields.position)}</small>`:""}</div></main><footer class="pf-footer"><strong>Stavební bytové družstvo Praha 8</strong><div><span>Tel.: 284 682 814, 284 682 046</span><span>E-mail: info@sbd8.cz</span><span>Web: www.sbd8.cz</span></div></footer></div>`;
 const print=()=>{
  setError("");
  const popup=window.open("","_blank");
  if(!popup){setError("Prohlížeč zablokoval tiskové okno. Povolte vyskakovací okna pro FOXA.");return}
  const styles=document.querySelector('link[href*="PrintForms.css"]');
  const css=`@page{size:A4 portrait;margin:0}html,body{margin:0;padding:0;background:white}body{font-family:Arial,Helvetica,sans-serif;color:#222}.pf-paper{width:210mm;min-height:297mm;padding:18mm 20mm 18mm;box-sizing:border-box;position:relative;background:white}.sbd-header{display:flex;align-items:center;gap:10px;padding-bottom:8px;border-bottom:0;break-inside:avoid;color:#000}.sbd-logo{flex:0 0 49px;width:49px}.sbd-logo svg{display:block;width:49px;height:65px}.sbd-info{flex:1;min-width:0;font-size:8px;line-height:1.3;color:#000}.sbd-name{font-weight:800;font-size:11px;line-height:1.2;margin-bottom:3px}.pf-top{display:grid;grid-template-columns:1fr 45%;gap:18px;margin-top:13mm;align-items:start;min-height:34mm}.pf-meta{font-size:10px;line-height:1.65}.pf-recipient{border:1px solid #111;padding:7px 8px;min-height:32mm;box-sizing:border-box;font-size:11px;line-height:1.5}.pf-recipient strong{display:block;font-weight:400;margin-bottom:4px}.pf-subject{font-size:12px;font-weight:700;margin:10mm 0 5mm;line-height:1.4}.pf-letterbody{font-size:11px;line-height:1.6}.pf-letterbody p{margin:0 0 9mm}.pf-bodytext{min-height:20mm;overflow-wrap:anywhere}.pf-placeholder{color:#aaa}.pf-signature{margin:15mm 0 0 auto;width:55mm;text-align:center;display:flex;flex-direction:column;font-weight:400;position:relative;padding-top:14mm}.pf-stamp-image{position:absolute;width:48mm;max-height:21mm;object-fit:contain;top:-7mm;left:4mm;opacity:.9}.pf-signature-image{display:block;max-width:55mm;max-height:25mm;object-fit:contain;margin:0 auto 1mm;position:relative;z-index:1}.pf-signature-line{font-size:10px}.pf-signature strong{font-weight:400}.pf-signature small{font-size:11px}.pf-footer{position:absolute;bottom:12mm;left:20mm;right:20mm;border-top:1px solid #555;padding-top:3mm;color:#444;font-size:9px}.pf-footer strong{display:block;font-size:10px;margin-bottom:2mm}.pf-footer>div{display:flex;justify-content:space-between;gap:10px}.pf-glazing{height:auto;min-height:297mm}.pf-glazing .pf-bodytext{white-space:normal;line-height:1.42}.pf-glazing .pf-signature{break-inside:avoid;page-break-inside:avoid}.pf-glazing .pf-footer{position:relative;left:auto;right:auto;bottom:auto;margin-top:18mm}@media print{.pf-placeholder{display:none}.pf-glazing{min-height:0}.pf-glazing .pf-footer{break-inside:avoid}}`;
  popup.document.open();popup.document.write('<!doctype html><html lang="cs"><head><meta charset="utf-8"><title>'+esc(fields.subject||templates[template].title)+'</title><style>'+css+'</style></head><body>'+documentHTML()+'</body></html>');popup.document.close();
  popup.addEventListener("load",()=>{popup.focus();popup.print()},{once:true});
 };
 return <div className="printforms"><div className="pageheading"><div><h1>Generátor tiskopisů</h1><p>Vytvořte dopis nebo oznámení na hlavičkovém papíře SBD Praha 8 a vytiskněte jej nebo uložte jako PDF.</p></div></div>
  <div className="pf-workspace"><section className="pf-editor"><h2>Nastavení dokumentu</h2>
   <label>Typ tiskopisu<select value={template} onChange={e=>chooseTemplate(e.target.value)}>{Object.entries(templates).map(([id,t])=><option key={id} value={id}>{t.title}</option>)}</select></label>
   <label className="pf-building-search">Vyplnit příjemce z objektu<input value={buildingQuery} onChange={e=>{setBuildingQuery(e.target.value);setBuildingOpen(true);setSelectedBuilding("")}} onFocus={()=>setBuildingOpen(true)} onBlur={()=>window.setTimeout(()=>setBuildingOpen(false),160)} placeholder="Začněte psát číslo objektu nebo adresu…" autoComplete="off" role="combobox" aria-expanded={buildingOpen} aria-autocomplete="list"/>{buildingOpen&&<div className="pf-building-options" role="listbox">{buildingOptions.length?buildingOptions.map(b=><button type="button" role="option" aria-selected={String(selectedBuilding)===String(b.id)} key={b.id} onMouseDown={e=>e.preventDefault()} onClick={()=>selectBuilding(String(b.id))}><strong>{b.object_number?"Objekt "+b.object_number:"Objekt"}</strong><span>{b.name||b.address}</span></button>):<div className="pf-building-empty">Žádný odpovídající objekt</div>}</div>}</label>
   <div className="pf-two"><label>Příjemce<input value={fields.recipient} onChange={e=>set("recipient",e.target.value)} placeholder="Jméno / SVJ / společnost"/></label><label>Adresa příjemce<textarea rows={2} value={fields.recipientAddress} onChange={e=>set("recipientAddress",e.target.value)} placeholder="Ulice, číslo, PSČ, město"/></label></div>
   <label>Číslo bytu (nepovinné)<input value={fields.apartmentNumber} onChange={e=>set("apartmentNumber",e.target.value)} placeholder="Např. 12" maxLength={30}/></label>
   <div className="pf-two"><label>Místo vystavení<input value={fields.city} onChange={e=>set("city",e.target.value)}/></label><label>Datum<input type="date" value={fields.date} onChange={e=>set("date",e.target.value)}/></label></div>
   <label>Váš dopis zn.<input value={fields.incomingReference} onChange={e=>set("incomingReference",e.target.value)}/></label>
   <label>Naše značka / číslo jednací<input value={fields.reference} onChange={e=>set("reference",e.target.value)}/></label>

   <label>Věc / nadpis<input value={fields.subject} onChange={e=>set("subject",e.target.value)}/></label>
   <label>Oslovení<input value={fields.greeting} onChange={e=>set("greeting",e.target.value)}/></label>
   {template==="glazing"&&<fieldset className="pf-glazing-fields"><legend>Údaje k zasklení lodžie</legend><p>Vyplněné údaje se automaticky propíší do podmínek. Text podmínek lze dále upravovat níže.</p><div className="pf-two">
    <label>Dodavatelská firma<input value={glazing.firma} onChange={e=>setGlazingField("firma",e.target.value)} placeholder="Název firmy"/></label>
    <label>Typ skla<input value={glazing.sklo} onChange={e=>setGlazingField("sklo",e.target.value)} placeholder="čirého skla"/></label>
    <label>Číslo bytu<input value={glazing.byt||fields.apartmentNumber} onChange={e=>{setGlazingField("byt",e.target.value);set("apartmentNumber",e.target.value)}} placeholder="Např. 12"/></label>
    <label>Ulice<input value={glazing.ulice} onChange={e=>setGlazingField("ulice",e.target.value)} placeholder="Ulice objektu"/></label>
    <label>Číslo popisné<input value={glazing.cisloPopisne} onChange={e=>setGlazingField("cisloPopisne",e.target.value)} placeholder="Např. 1234"/></label>
    <label>Městská část / obec<input value={glazing.mesto} onChange={e=>setGlazingField("mesto",e.target.value)}/></label>
    <label>PSČ<input value={glazing.psc} onChange={e=>setGlazingField("psc",e.target.value)}/></label>
    <label>Katastrální území<input value={glazing.katastr} onChange={e=>setGlazingField("katastr",e.target.value)}/></label>
   </div></fieldset>}
   <label>Text dokumentu<textarea rows={11} value={fields.body} onChange={e=>set("body",e.target.value)} placeholder="Napište obsah dopisu…"/></label>
   <label>Závěr<textarea rows={2} value={fields.closing} onChange={e=>set("closing",e.target.value)}/></label>

   <div className="pf-signer-settings"><label className="pf-signer-toggle"><input type="checkbox" checked={alternateSigner} onChange={e=>setAlternateSigner(e.target.checked)}/> Dokument podepisuje jiná osoba</label>{alternateSigner&&<div className="pf-two"><label>Jméno podepisující osoby<input value={signerName} onChange={e=>setSignerName(e.target.value)} placeholder="Jméno a příjmení"/></label><label>Funkce podepisující osoby<input value={signerPosition} onChange={e=>setSignerPosition(e.target.value)} placeholder="Např. předseda představenstva"/></label></div>}<small>{alternateSigner?"V dokumentu se zobrazí pouze řádek pro vlastnoruční podpis, bez automatického podpisu a razítka.":"Použije se podpis a razítko přihlášeného uživatele."}</small></div>
   <div className="pf-outmail">
    <label className="pf-outmail-toggle"><input type="checkbox" checked={mailEnabled} onChange={e=>{setMailEnabled(e.target.checked);setMailSuccess("");setError("")}}/> Zapsat dokument také do knihy odchozí pošty</label>
    {mailEnabled&&<div className="pf-outmail-details">
      <div className="pf-two"><label>Datum odeslání<input type="date" value={mailSentOn} onChange={e=>setMailSentOn(e.target.value)}/></label><label>Způsob odeslání<select value={mailMethod} onChange={e=>setMailMethod(e.target.value)}>{["Pošta","Doporučeně","Datová schránka","E-mail","Osobní předání","Jiné"].map(method=><option key={method} value={method}>{method}</option>)}</select></label></div>
      <label>Podací číslo / ID zprávy (nepovinné)<input value={mailTracking} maxLength={150} onChange={e=>setMailTracking(e.target.value)}/></label>
      <label>Poznámka (nepovinné)<textarea rows={2} value={mailNotes} maxLength={2000} onChange={e=>setMailNotes(e.target.value)}/></label>
      <button type="button" className="secondarybutton" onClick={saveToOutgoingMail} disabled={mailSaving||mailSavedSnapshot===mailSnapshot}>{mailSaving?"Ukládám…":mailSavedSnapshot===mailSnapshot?"Zapsáno v knize odchozí pošty":"Uložit do knihy odchozí pošty"}</button>
      <small>Příjemce, adresa, věc, naše značka a vybraný objekt se převezmou z tiskopisu. Zápis zásilku automaticky neodešle.</small>
    </div>}
   </div>
   {mailSuccess&&mailSavedSnapshot===mailSnapshot&&<p className="pf-outmail-success" role="status">{mailSuccess}</p>}
   {error&&<p className="error" role="alert">{error}</p>}
   <button type="button" className="primary" onClick={print}>Tisk / Uložit jako PDF</button>
   <small>PDF uložíte v tiskovém dialogu volbou „Uložit jako PDF“. Text se při úpravách nikam automaticky neukládá.</small>
  </section><section className="pf-preview"><h2>Náhled A4</h2><div className="pf-preview-scroll"><div className="pf-preview-paper" dangerouslySetInnerHTML={{__html:documentHTML()}}/></div></section></div>
 </div>;
}
