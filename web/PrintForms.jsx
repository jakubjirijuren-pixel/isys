import React,{useEffect,useMemo,useState} from "react";
import html2pdf from "html2pdf.js";
import {SBD_LOGO} from "./SbdProtocolLogo.js";
import {stampImage} from "./SbdProtocolStamp.js";
import "./PrintForms.css";

const today=()=>new Date().toISOString().slice(0,10);
const draftKey=id=>id?"foxa-printforms-draft-v2-"+id:null;
const readDraft=id=>{try{const key=draftKey(id);return key?JSON.parse(localStorage.getItem(key)||"null"):null}catch{return null}};
const pdfFileName=value=>String(value||"Tiskopis").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9 _-]/g,"").trim().replace(/\s+/g,"_").slice(0,80)+".pdf";

// Municipal office is derived from the selected building, never from SBD's fixed letterhead.
const pragueDistrict=value=>{const match=String(value||"").match(/(?:praha|prague|p)\s*[-.]?\s*(1[0-9]|2[0-2]|[1-9])\b/i);return match?Number(match[1]):null};
const municipalOffice=value=>{const district=pragueDistrict(value);return district?"ÚMČ Praha "+district:"příslušného úřadu městské části"};
const addressParts=building=>{
 const raw=[building?.address,building?.street,building?.city].filter(Boolean).join(", ");
 const district=pragueDistrict(raw);
 const street=String(building?.street||building?.address||"").split(",")[0].trim();
 const match=street.match(/^(.*?)\s+(\d+(?:\/\d+[a-z]?)?)$/i);
 const postcode=raw.match(/\b\d{3}\s?\d{2}\b/);
 return {street:match?.[1]||street.replace(/\s+\d+(?:\/\d+[a-z]?)?$/i,""),number:match?.[2]||"",city:district?"Praha "+district:String(building?.city||"").trim(),postcode:postcode?.[0]||""};
};
const templates={
 building_works:{title:"Podmínky ke stavebním úpravám v bytě",subject:"Stavební úpravy",greeting:"",body:"K Vašemu sdělení ze dne {{oznameniDatum}} o provedení {{popisPraci}} v bytové jednotce č. {{byt}}, v domě {{dum}} zasílá správce objektu seznam podmínek, které je nutno dodržet:\n\n- práce budou plně hrazeny z prostředků žadatele\n- stavební úprava nesmí narušit nosné konstrukce, ohrozit bezpečnost a stabilitu objektu\n- budou respektovány platné ČSN, vč. předpisů o bezpečnosti práce a požární ochraně\n- dokončení práce oznámíte písemně TPÚ, aby mohla být provedena změna v pasportu bytu\n- budou dodržovány platné Stanovy SVJ\n- práce budou prováděny pouze v pracovních dnech od 8.00–18.00 hod., o víkendech od 10.00–17.00 hod. (mimo SVÁTKY)!\n- vybouraný materiál nebude skladován v objektu bez souhlasu výboru SVJ ani nebude ukládán do kontejnerů na domovní odpad\n- veškeré prováděcí i přípravné práce musí být vykonávány v bytě a nikoli ve společných prostorách domu\n- nebude prováděn zásah do nosné konstrukce při provádění el. instalace pod omítku, nesmí být porušena výztuž panelů /zdí, stropu, podlah/\n- při rekonstrukci elektrorozvodů je nutné předložit revizní zprávu\n- po provedení zaslepení plynu je nutné předložit doklad od odborně způsobilé osoby o provedeném zásahu a jeho bezpečnosti/těsnosti\n- při úpravách rozvodů vodovodního potrubí a kanalizace (odpady) je nutné předložit tlakovou zkoušku vodovodního potrubí a zkoušku o těsnosti kanalizace\n- při porušení plomb bytových vodoměrů TUV a SV nutno zajistit nové zaplombování\n- případné škody vzniklé v souvislosti s úpravou musí být bezprostředně odstraněny na Vaše náklady\n- při výměně původní podlahové krytiny za plovoucí podlahy je nutné provést protihlukové kročejové izolace\n- při výměně původní podlahové krytiny za keramické dlažby je nutné provést izolace proti vodě (v koupelně) a protihlukovou izolaci\n- při úpravě povrchu podlahy je nutno zachovat průchody pro dilatace topení (nesmí být zalito stěrkou nebo lepidlem)\n- dvířka do instalační šachty na WC je nutno osadit v původních rozměrech s odnímatelnou stěnou, aby byl umožněn přístup v případě havárie nebo výměny stoupaček (pokud budou zadní části zazděny, demontáž hradí uživatel bytu)\n- při výměně sprchového koutu je nutné provést uzemnění\n- nutno zachovat funkčnost odvětrání koupelny a WC, tj. nezazdívat otvory do instalační šachty – napojit do stávající vzduchotechniky\n- nelze připojovat digestoře v kuchyních na společnou vzduchotechniku, jedinou možností je instalace recirkulační digestoře bez odtahu\n\nUpozorňujeme na povinnost zabránit zničení (poškrábání výtahu) v průběhu navážení materiálu a zejména při odvozu vzniklého odpadu! Je nutné ochránit stěny a podlahu výtahové kabiny.\nV případě, že dojde ke znečištění společných prostor, je bezpodmínečně nutné zajistit okamžitý úklid.\n\n----------------------------------------------------------------------------------\nPozn.:\nVýše uvedené podmínky se vztahují pouze na oznámené stavební úpravy v bytě. V případě dalších stavebních zásahů je vlastník bytové jednotky povinen tyto práce předem oznámit výboru SVJ. Na základě tohoto oznámení budou vlastníkovi stanoveny další podmínky pro jejich provedení.\n\nCo: TPÚ",closing:""},
 key_handover:{title:"Předávací protokol klíčů – trvalé předání",subject:"Předávací protokol o předání klíčů",greeting:"",body:"",closing:""},
 glazing:{title:"Podmínky k zasklení lodžie",subject:"Věc: Podmínky k zasklení lodžie",greeting:"",body:"Po předložení navrhované stavební úpravy vydává správce objektu SBD Praha 8 – podmínky,\nkteré se vlastník-stavebník zavazuje dodržet:\n\n1. Stavební úprava bude plně hrazena z prostředků vlastníka,\n   - jedná se o zasklení lodžie bezrámovým systémem firmou {{firma}} z {{sklo}}\n   - č.b. {{byt}}, ul. {{ulice}} č.p. {{cisloPopisne}}, {{mesto}}, {{psc}}, k.ú. {{katastr}}\n2. Úprava bude provedena dle schválené stavební technologie a způsobu zasklívání doložené certifikátem, pod odborným stavebním dozorem a bude zadána k provedení odborné firmě.\n3. Budou respektovány platné normy vč. předpisů o bezpečnosti práce a požární ochraně.\n4. Stav. úprava bude oznámena výboru SVJ objektu, zejména zahájení prací. Ukončení prací bude oznámeno TPÚ SBD 8 písemně.\n5. Práce budou probíhat s ohledem na ostatní bydlící za průběžného dodržování pořádku a čistoty v objektu v souladu s domovním řádem, resp. práce bude prováděna pouze ve všední dny od 7.00 do 19.00hod. /mimo SO+NE/ ! Případné škody vzniklé v souvislosti s úpravou budou vlastníkem bezprostředně na jeho náklady odstraněny. V případě rekonstrukce lodžií v objektu umožní vlastník bytu přístup a v příp. nutnosti demontáže zasklení zajistí na své náklady demontáž. Nebude skladován žádný materiál na veřej. prostranství, ani zeleni bez povolení {{uradMestskeCasti}}, rovněž tak v objektu bez povolení výboru SVJ.\n6. Horní díl bezrámového zasklení bude proveden z čirého skla, stávající základní rám bude ve shodném barevném provedení se stávajícími lodžiemi. V případě nátěrů lodžií /údržby, oprav apod./ zajistí vlastník bytu na své náklady demontáž. Rovněž zateplení spodní části nelze barevně ani materiálově odlišovat, pokud to nepovolí stavební odbor {{uradMestskeCasti}}. Lodžiové panely zůstanou v původní barevnosti, jsou součástí fasády, nikoli interiéru bytu.\n\nPozn.: Podmínky jsou platné pouze se souhlasem výboru SVJ.\n\nCo: TPÚ, SVJ",closing:"Za správce:"},
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
 const savedDraft=useMemo(()=>readDraft(userId),[userId]);
 const [template,setTemplate]=useState(()=>savedDraft?.template&&templates[savedDraft.template]?savedDraft.template:"letter");
 const [fields,setFields]=useState(()=>({...{recipient:"",recipientAddress:"",apartmentNumber:"",subject:"",greeting:"Vážení,",body:"",closing:"S pozdravem",city:"Praha",date:today(),reference:"",incomingReference:"",email:"",phone:"",contact:currentAccountName,position:"Technik"},...(savedDraft?.fields||{})}));
 const [keyHandover,setKeyHandover]=useState(()=>({recipientName:"",recipientCompany:"",recipientPhone:"",recipientEmail:"",keyList:"",objectDescription:"",handoverDate:today(),handoverPlace:"Praha",note:"",...(savedDraft?.keyHandover||{})}));
 const setKeyHandoverField=(key,value)=>setKeyHandover(prev=>({...prev,[key]:value}));
 const [buildingWorks,setBuildingWorks]=useState(()=>({oznameniDatum:today(),popisPraci:"rekonstrukce bytové jednotky",dum:"",...(savedDraft?.buildingWorks||{})}));
 const setBuildingWorksField=(key,value)=>setBuildingWorks(prev=>({...prev,[key]:value}));
 const fillBuildingWorksBody=body=>body.replace(/\{\{(oznameniDatum|popisPraci|dum|byt)\}\}/g,(_,key)=>key==="byt"?(fields.apartmentNumber||"…………"):key==="oznameniDatum"?dateCZ(buildingWorks.oznameniDatum):(buildingWorks[key]?.trim()||"…………"));
 const [glazing,setGlazing]=useState(()=>({firma:"",sklo:"čirého skla",byt:"",ulice:"",cisloPopisne:"",mesto:"",psc:"",katastr:"",...(savedDraft?.glazing||{})}));
 const setGlazingField=(key,value)=>setGlazing(prev=>({...prev,[key]:value}));
 const fillGlazingBody=body=>body.replace(/\{\{(firma|sklo|byt|ulice|cisloPopisne|mesto|psc|katastr)\}\}/g,(_,key)=>(key==="byt"?(glazing.byt||fields.apartmentNumber):glazing[key])?.trim()||"…………");
 const [alternateSigner,setAlternateSigner]=useState(savedDraft?.alternateSigner||false);
 const [signerName,setSignerName]=useState(savedDraft?.signerName||"");
 const [signerPosition,setSignerPosition]=useState(savedDraft?.signerPosition||"");
 const [buildingQuery,setBuildingQuery]=useState(savedDraft?.buildingQuery||"");
 const [buildingOpen,setBuildingOpen]=useState(false);
 const [selectedBuilding,setSelectedBuilding]=useState(savedDraft?.selectedBuilding||"");
 const [profilePhone,setProfilePhone]=useState(userPhone);
 useEffect(()=>{setFields(prev=>savedDraft?prev:({...prev,contact:reportSignature?.name?.trim()||currentAccountName||prev.contact,email:userEmail||prev.email,phone:userPhone||prev.phone}))},[currentAccountName,reportSignature?.name,userEmail,userPhone]);
 useEffect(()=>{if(!supabase||!userId)return;let active=true;supabase.from("profiles").select("*").eq("id",userId).maybeSingle().then(({data,error})=>{if(!active||error||!data)return;const phone=data.phone||data.phone_number||data.telefon||"";const email=data.email||userEmail;const name=data.display_name||data.full_name||data.name||"";setProfilePhone(phone||userPhone);setFields(prev=>savedDraft?prev:({...prev,phone:phone||prev.phone,email:email||prev.email,contact:reportSignature?.name?.trim()||name||prev.contact}))});return()=>{active=false}},[supabase,userId,userEmail,userPhone,reportSignature?.name]);
 const buildingOptions=useMemo(()=>buildings.filter(b=>[b.object_number,b.name,b.address,b.street,b.city].some(v=>String(v||"").toLocaleLowerCase("cs").includes(buildingQuery.toLocaleLowerCase("cs")))).sort((a,b)=>String(a.object_number||"").localeCompare(String(b.object_number||""),"cs",{numeric:true})).slice(0,35),[buildings,buildingQuery]);
 const [error,setError]=useState("");
 const [mailEnabled,setMailEnabled]=useState(savedDraft?.mailEnabled||false);
 const [mailMethod,setMailMethod]=useState(savedDraft?.mailMethod||"Pošta");
 const [mailSentOn,setMailSentOn]=useState(savedDraft?.mailSentOn||today());
 const [mailTracking,setMailTracking]=useState(savedDraft?.mailTracking||"");
 const [mailNotes,setMailNotes]=useState(savedDraft?.mailNotes||"");
 const [mailSaving,setMailSaving]=useState(false);
 const [mailSuccess,setMailSuccess]=useState("");
 const [mailSavedSnapshot,setMailSavedSnapshot]=useState("");
 const [draftStatus,setDraftStatus]=useState(savedDraft?"Rozpracovaný dokument byl obnoven.":"");
 const [pdfSaving,setPdfSaving]=useState(false);
 useEffect(()=>{const key=draftKey(userId);if(!key)return;const timer=setTimeout(()=>{try{localStorage.setItem(key,JSON.stringify({template,fields,glazing,buildingWorks,keyHandover,alternateSigner,signerName,signerPosition,buildingQuery,selectedBuilding,mailEnabled,mailMethod,mailSentOn,mailTracking,mailNotes,updatedAt:new Date().toISOString()}));setDraftStatus("Rozpracovaný dokument automaticky uložen v tomto prohlížeči.")}catch{setDraftStatus("Automatické ukládání není v tomto prohlížeči dostupné.")}},450);return()=>clearTimeout(timer)},[userId,template,fields,glazing,buildingWorks,keyHandover,alternateSigner,signerName,signerPosition,buildingQuery,selectedBuilding,mailEnabled,mailMethod,mailSentOn,mailTracking,mailNotes]);

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
 const chooseTemplate=id=>{setTemplate(id);const t=templates[id];setFields(prev=>({...prev,subject:t.subject,greeting:t.greeting,body:t.body,closing:t.closing}));if(id==="key_handover"){setMailEnabled(false);setAlternateSigner(false);setSignerName("");setSignerPosition("")}else if(id==="glazing"){setAlternateSigner(true);setSignerName("Miroslav Švarc „pp“");setSignerPosition("ředitel družstva")}else{setAlternateSigner(false);setSignerName("");setSignerPosition("")}};
 const selectBuilding=id=>{setSelectedBuilding(id);setBuildingOpen(false);const b=buildings.find(x=>String(x.id)===id);if(b){setBuildingQuery([b.object_number,b.name||b.address].filter(Boolean).join(" – "));setFields(prev=>({...prev,recipient:b.legal_entity||b.name||"",recipientAddress:b.address||[b.street,b.city].filter(Boolean).join(", ")}));const address=addressParts(b);setGlazing(prev=>({...prev,ulice:address.street,cisloPopisne:address.number,mesto:address.city,psc:address.postcode,katastr:""}));setKeyHandover(prev=>({...prev,objectDescription:[b.object_number?"Objekt "+b.object_number:"",b.name||b.address||b.street,b.city].filter(Boolean).join(" – ")}));setBuildingWorks(prev=>({...prev,dum:[b.name||b.address||b.street,b.city].filter(Boolean).join(", ")}))}else setBuildingQuery("")};
 const signatureImage=!alternateSigner&&typeof reportSignature?.image==="string"&&reportSignature.image.startsWith("data:image/")?reportSignature.image:"";
 const handoverHTML=()=>`<div class="pf-paper pf-key-handover"><header class="pf-letterhead sbd-header"><div class="sbd-logo">${SBD_LOGO}</div><div class="sbd-info"><div class="sbd-name">Stavební bytové družstvo Praha 8</div><div>Horňátecká 1772/19, 182 00 Praha 8</div><div>IČO: 00034550, DIČ: CZ00034550</div><div>ČSOB a.s., č. ú. 746873/0300</div></div></header><h1>PŘEDÁVACÍ PROTOKOL KLÍČŮ</h1><p class="pf-handover-subtitle">Trvalé předání klíčů bez povinnosti vrácení</p><div class="pf-handover-grid"><section><h3>Předávající</h3><strong>Stavební bytové družstvo Praha 8</strong><div>Horňátecká 1772/19, 182 00 Praha 8</div><div>Pověřená osoba: ${esc(fields.contact)}</div></section><section><h3>Přebírající</h3><strong>${esc(keyHandover.recipientName)||"............................................"}</strong>${keyHandover.recipientCompany?`<div>Firma: ${esc(keyHandover.recipientCompany)}</div>`:""}${keyHandover.recipientPhone?`<div>Telefon: ${esc(formatCzechPhone(keyHandover.recipientPhone))}</div>`:""}${keyHandover.recipientEmail?`<div>E-mail: ${esc(keyHandover.recipientEmail)}</div>`:""}</section></div><div class="pf-handover-block"><h3>Objekt, ke kterému jsou klíče předávány</h3><p>${esc(keyHandover.objectDescription)||"............................................"}</p></div><div class="pf-handover-block"><h3>Seznam předávaných klíčů / čipů a jejich množství</h3><div class="pf-handover-keys">${multiline(keyHandover.keyList)||"............................................"}</div></div><div class="pf-handover-declaration">Předávající potvrzuje, že výše uvedené klíče nebo přístupové čipy předal přebírajícímu. Přebírající potvrzuje jejich převzetí. Jedná se o <strong>trvalé předání bez povinnosti vrácení</strong>; tímto protokolem nevzniká výpůjčka klíčů v evidenci FOXA.</div>${keyHandover.note?`<div class="pf-handover-block"><h3>Poznámka</h3><p>${multiline(keyHandover.note)}</p></div>`:""}<p class="pf-handover-date">V ${esc(keyHandover.handoverPlace)}, dne ${esc(dateCZ(keyHandover.handoverDate))}</p><div class="pf-handover-signatures"><div><div class="pf-handover-signmark">${signatureImage?`<img class="pf-handover-sign-image" src="${esc(signatureImage)}" alt="Podpis předávajícího">`:""}${!alternateSigner?`<img class="pf-handover-stamp" src="${stampImage}" alt="Razítko SBD Praha 8">`:""}</div><div class="pf-handover-line"></div><strong>${esc(alternateSigner?signerName:fields.contact)||"Předávající"}</strong><small>Předal za SBD Praha 8${(alternateSigner?signerPosition:fields.position)?" – "+esc(alternateSigner?signerPosition:fields.position):""}</small></div><div><div class="pf-handover-signmark"></div><div class="pf-handover-line"></div><strong>${esc(keyHandover.recipientName)||"Přebírající"}</strong><small>Podpis přebírajícího</small></div></div><footer class="pf-footer"><strong>Stavební bytové družstvo Praha 8</strong><div><span>Tel.: 284 682 814, 284 682 046</span><span>E-mail: info@sbd8.cz</span><span>Web: www.sbd8.cz</span></div></footer></div>`;
 const conditionsHTML=body=>{
  const content=template==="building_works"?fillBuildingWorksBody(body):fillGlazingBody(body);
  const match=/(?:^|\n)(Pozn\.:)/i.exec(content);
  if(!match)return multiline(content);
  const noteStart=match.index+match[0].length-match[1].length;
  const afterNote=content.slice(noteStart);
  const nextSection=/\n\s*(?:Co:|Za správce:|Přílohy:)/i.exec(afterNote);
  const noteEnd=nextSection?noteStart+nextSection.index:content.length;
  return multiline(content.slice(0,noteStart))+'<div class="pf-conditions-note">'+multiline(content.slice(noteStart,noteEnd).trimEnd())+'</div>'+multiline(content.slice(noteEnd));
 };
 const documentHTML=()=>template==="key_handover"?handoverHTML():`<div class="pf-paper${template==="glazing"?" pf-glazing":template==="building_works"?" pf-building-works":""}"><header class="pf-letterhead sbd-header"><div class="sbd-logo">${SBD_LOGO}</div><div class="sbd-info"><div class="sbd-name">Stavební bytové družstvo Praha 8</div><div>Horňátecká 1772/19, 182 00 Praha 8</div><div>IČO: 00034550, DIČ: CZ 00034550, Bankovní spojení: ČSOB a.s., č.ú. 746873/0300</div><div>Zapsané v Obchodním rejstříku vedeném Městským soudem v Praze v oddílu Dr XCVIII., vložka 254</div></div></header><div class="pf-top"><div class="pf-meta"><div>Váš dopis zn.: ${esc(fields.incomingReference)}</div><div>Naše značka: ${esc(fields.reference)}</div><div>Vyřizuje: ${esc(fields.contact)}</div><div>Email: ${esc(fields.email)}</div><div>Telefon: ${esc(formatCzechPhone(fields.phone))}</div><div>${esc(fields.city)}, dne: ${dateCZ(fields.date)}</div></div><div class="pf-recipient"><strong>Adresa</strong><div>${multiline(fields.recipient)}${fields.recipient&&recipientAddressWithApartment?"<br>":""}${multiline(recipientAddressWithApartment)}</div></div></div>${fields.subject?`<h2 class="pf-subject">${multiline(fields.subject)}</h2>`:""}<main class="pf-letterbody">${fields.greeting?`<p>${multiline(fields.greeting)}</p>`:""}<div class="pf-bodytext">${((template==="building_works"||template==="glazing")?conditionsHTML(fields.body):multiline(fields.body))||'<span class="pf-placeholder">Zde bude text tiskopisu…</span>'}</div>${fields.closing?`<p>${multiline(fields.closing)}</p>`:""}<div class="pf-signature">${!alternateSigner?`<img class="pf-stamp-image" src="${stampImage}" alt="Razítko SBD Praha 8">`:""}${signatureImage?`<img class="pf-signature-image" src="${esc(signatureImage)}" alt="Podpis uživatele">`:""}<span class="pf-signature-line">................................................</span><strong>${multiline(alternateSigner?signerName:fields.contact)}</strong>${(alternateSigner?signerPosition:fields.position)?`<small>${multiline(alternateSigner?signerPosition:fields.position)}</small>`:""}</div></main><footer class="pf-footer"><strong>Stavební bytové družstvo Praha 8</strong><div><span>Tel.: 284 682 814, 284 682 046</span><span>E-mail: info@sbd8.cz</span><span>Web: www.sbd8.cz</span></div></footer></div>`;
 const downloadPDF=async()=>{
  if(pdfSaving)return;
  setPdfSaving(true);setError("");
  // Capture the actual, already-rendered preview instead of constructing an
  // invisible duplicate. html2pdf clones this element internally.
  const preview=document.querySelector(".pf-preview-paper");
  if(!preview?.querySelector(".pf-paper")){setError("Náhled tiskopisu není dostupný.");setPdfSaving(false);return}
  const previousZoom=preview.style.zoom;
  const previousOverflow=preview.style.overflow;
  try{
   preview.style.zoom="1";
   preview.style.overflow="visible";
   if(document.fonts?.ready)await document.fonts.ready;
   await Promise.all([...preview.querySelectorAll("img")].map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.addEventListener("load",resolve,{once:true});img.addEventListener("error",resolve,{once:true})})));
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   const filename=pdfFileName(template==="key_handover"?"Predavaci_protokol_klicu_"+(keyHandover.objectDescription||keyHandover.recipientName):fields.subject||templates[template].title);
   // The direct save pipeline is the supported html2pdf.js API. The previous
   // custom .toCanvas().get("canvas") pipeline returned no canvas in production.
   preview.classList.add("pf-exporting");
   // The fixed PDF header/footer occupy 37 + 22 mm. Keep the signature
   // on the preceding page whenever a modest reduction of vertical spacing fits.
   const paper=preview.querySelector(".pf-paper");
   const signature=paper?.querySelector(".pf-signature");
   let compacted=false;
   if(signature&&(template==="glazing"||template==="building_works")){
    const pxPerMm=preview.getBoundingClientRect().width/210;
    const pageContentPx=(297-37-22)*pxPerMm;
    const paperTop=paper.getBoundingClientRect().top;
    const signatureBottom=signature.getBoundingClientRect().bottom-paperTop;
    const overflow=signatureBottom-pageContentPx;
    if(overflow>0&&overflow<35*pxPerMm){
     preview.classList.add("pf-compact-signature");
     compacted=true;
    }
   }
   const pdf=await html2pdf().set({
    margin:[37,0,22,0],
    filename,
    image:{type:"jpeg",quality:.98},
    html2canvas:{scale:2,useCORS:true,backgroundColor:"#ffffff",logging:false,scrollX:0,scrollY:0},
    jsPDF:{unit:"mm",format:"a4",orientation:"portrait"},
    pagebreak:{mode:["css","legacy"],avoid:[".pf-signature",".pf-top",".pf-subject",".pf-building-works-note",".pf-building-works-ending"]}
   }).from(preview).toPdf().get("pdf");
   const headerCanvas=document.createElement("canvas");
   headerCanvas.width=1700;headerCanvas.height=240;
   const hc=headerCanvas.getContext("2d");
   if(!hc)throw new Error("Nelze vykreslit hlavičku.");
   hc.fillStyle="#fff";hc.fillRect(0,0,1700,240);
   const logo=preview.querySelector(".sbd-header svg");
   if(logo){
    const svgText=new XMLSerializer().serializeToString(logo);
    const img=new Image();
    const src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svgText);
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error("Nepodařilo se načíst logo."));img.src=src});
    hc.drawImage(img,0,8,155,206);
   }
   hc.fillStyle="#111";hc.textBaseline="top";
   hc.font="bold 29px Arial";hc.fillText("Stavební bytové družstvo Praha 8",185,35);
   hc.font="20px Arial";
   hc.fillText("Horňátecká 1772/19, 182 00 Praha 8",185,80);
   hc.fillText("IČO: 00034550, DIČ: CZ 00034550, Bankovní spojení: ČSOB a.s., č.ú. 746873/0300",185,111);
   hc.font="18px Arial";
   hc.fillText("Zapsané v Obchodním rejstříku vedeném Městským soudem v Praze",185,145);
   hc.fillText("v oddílu Dr XCVIII., vložka 254",185,172);
   const headerImage=headerCanvas.toDataURL("image/png");
   const footerCanvas=document.createElement("canvas");
   footerCanvas.width=1700;footerCanvas.height=160;
   const ctx=footerCanvas.getContext("2d");
   if(!ctx)throw new Error("Nelze vykreslit zápatí.");
   ctx.fillStyle="#fff";ctx.fillRect(0,0,1700,160);
   ctx.strokeStyle="#9da8b1";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,10);ctx.lineTo(1700,10);ctx.stroke();
   ctx.fillStyle="#263746";ctx.font="bold 27px Arial";
   ctx.fillText("Stavební bytové družstvo Praha 8",0,58);
   ctx.fillStyle="#536676";ctx.font="24px Arial";
   ctx.fillText("Tel.: 284 682 814, 284 682 046",0,115);
   ctx.textAlign="center";ctx.fillText("E-mail: info@sbd8.cz",850,115);
   ctx.textAlign="right";ctx.fillText("www.sbd8.cz",1700,115);
   const footerImage=footerCanvas.toDataURL("image/png");
   for(let page=1;page<=pdf.internal.getNumberOfPages();page++){
    pdf.setPage(page);
    pdf.addImage(headerImage,"PNG",20,8,170,24);
    pdf.addImage(footerImage,"PNG",20,275,170,16);
   }
   pdf.save(filename);
  }catch(e){setError("PDF se nepodařilo vytvořit: "+(e?.message||"Neznámá chyba"))}
  finally{preview.classList.remove("pf-exporting","pf-compact-signature");preview.style.zoom=previousZoom;preview.style.overflow=previousOverflow;setPdfSaving(false)}
 };
 return <div className="printforms"><div className="pageheading"><div><h1>Generátor tiskopisů</h1><p>Vytvořte dopis nebo oznámení na hlavičkovém papíře SBD Praha 8 a vytiskněte jej nebo uložte jako PDF.</p></div></div>
  <div className="pf-workspace"><section className="pf-editor"><h2>Nastavení dokumentu</h2>
   <label>Typ tiskopisu<select value={template} onChange={e=>chooseTemplate(e.target.value)}>{Object.entries(templates).map(([id,t])=><option key={id} value={id}>{t.title}</option>)}</select></label>
   <label className="pf-building-search">Vyplnit příjemce z objektu<input value={buildingQuery} onChange={e=>{setBuildingQuery(e.target.value);setBuildingOpen(true);setSelectedBuilding("")}} onFocus={()=>setBuildingOpen(true)} onBlur={()=>window.setTimeout(()=>setBuildingOpen(false),160)} placeholder="Začněte psát číslo objektu nebo adresu…" autoComplete="off" role="combobox" aria-expanded={buildingOpen} aria-autocomplete="list"/>{buildingOpen&&<div className="pf-building-options" role="listbox">{buildingOptions.length?buildingOptions.map(b=><button type="button" role="option" aria-selected={String(selectedBuilding)===String(b.id)} key={b.id} onMouseDown={e=>e.preventDefault()} onClick={()=>selectBuilding(String(b.id))}><strong>{b.object_number?"Objekt "+b.object_number:"Objekt"}</strong><span>{b.name||b.address}</span></button>):<div className="pf-building-empty">Žádný odpovídající objekt</div>}</div>}</label>
   {template==="key_handover"&&<div className="pf-key-fields"><h3>Údaje předávacího protokolu</h3><p>Jednorázové trvalé předání klíčů. Protokol se pouze stáhne jako PDF a <strong>nevytváří žádný záznam v evidenci klíčů.</strong></p><div className="pf-two">
    <label>Jméno a příjmení přebírajícího<input value={keyHandover.recipientName} onChange={e=>setKeyHandoverField("recipientName",e.target.value)} placeholder="Jméno a příjmení"/></label>
    <label>Společnost / organizace (nepovinné)<input value={keyHandover.recipientCompany} onChange={e=>setKeyHandoverField("recipientCompany",e.target.value)}/></label>
    <label>Telefon (nepovinné)<input type="tel" value={keyHandover.recipientPhone} onChange={e=>setKeyHandoverField("recipientPhone",e.target.value)} placeholder="+420 123 456 789"/></label>
    <label>E-mail (nepovinné)<input type="email" value={keyHandover.recipientEmail} onChange={e=>setKeyHandoverField("recipientEmail",e.target.value)}/></label>
   </div><label>Objekt / místo použití klíčů<input value={keyHandover.objectDescription} onChange={e=>setKeyHandoverField("objectDescription",e.target.value)} placeholder="Objekt a adresa"/></label>
   <label>Předávané klíče a množství<textarea rows={5} value={keyHandover.keyList} onChange={e=>setKeyHandoverField("keyList",e.target.value)} placeholder={"Např. 2× klíč od hlavního vchodu\n1× klíč od technické místnosti"}/></label>
   <div className="pf-two"><label>Místo předání<input value={keyHandover.handoverPlace} onChange={e=>setKeyHandoverField("handoverPlace",e.target.value)}/></label><label>Datum předání<input type="date" value={keyHandover.handoverDate} onChange={e=>setKeyHandoverField("handoverDate",e.target.value)}/></label></div>
   <label>Poznámka (nepovinné)<textarea rows={3} value={keyHandover.note} onChange={e=>setKeyHandoverField("note",e.target.value)}/></label></div>}
   {template!=="key_handover"&&<>
   <div className="pf-two"><label>Příjemce<input value={fields.recipient} onChange={e=>set("recipient",e.target.value)} placeholder="Jméno / SVJ / společnost"/></label><label>Adresa příjemce<textarea rows={2} value={fields.recipientAddress} onChange={e=>set("recipientAddress",e.target.value)} placeholder="Ulice, číslo, PSČ, město"/></label></div>
   <label>Číslo bytu (nepovinné)<input value={fields.apartmentNumber} onChange={e=>{set("apartmentNumber",e.target.value);setGlazingField("byt",e.target.value)}} placeholder="Např. 12" maxLength={30}/></label>
   <div className="pf-two"><label>Místo vystavení<input value={fields.city} onChange={e=>set("city",e.target.value)}/></label><label>Datum<input type="date" value={fields.date} onChange={e=>set("date",e.target.value)}/></label></div>
   <label>Váš dopis zn.<input value={fields.incomingReference} onChange={e=>set("incomingReference",e.target.value)}/></label>
   <label>Naše značka / číslo jednací<input value={fields.reference} onChange={e=>set("reference",e.target.value)}/></label>

   <label>Věc / nadpis<input value={fields.subject} onChange={e=>set("subject",e.target.value)}/></label>
   <label>Oslovení<input value={fields.greeting} onChange={e=>set("greeting",e.target.value)}/></label>
   {template==="building_works"&&<fieldset className="pf-glazing-fields"><legend>Údaje ke stavebním úpravám</legend><div className="pf-two"><label>Datum oznámení stavebních úprav<input type="date" value={buildingWorks.oznameniDatum} onChange={e=>setBuildingWorksField("oznameniDatum",e.target.value)}/></label><label>Adresa domu / označení objektu<input value={buildingWorks.dum} onChange={e=>setBuildingWorksField("dum",e.target.value)} placeholder="Jahodová 2706, Praha 10"/></label></div><label>Popis oznámených stavebních úprav<textarea rows={3} value={buildingWorks.popisPraci} onChange={e=>setBuildingWorksField("popisPraci",e.target.value)} placeholder="Např. kompletní rekonstrukce bytové jednotky včetně výměny rozvodů"/></label><p>Číslo bytu se přebírá z pole „Číslo bytu“. Podmínky a upozornění lze dále upravit v poli obsahu dokumentu.</p></fieldset>}
   {template==="glazing"&&<fieldset className="pf-glazing-fields"><legend>Údaje k zasklení lodžie</legend><p>Údaje se převezmou z vybraného objektu. Příslušný ÚMČ se automaticky odvodí z městské části (např. Praha 9 → ÚMČ Praha 9). Údaje lze ručně opravit; neznámé katastrální území je nutné doplnit.</p><p><strong>Úřad uvedený v dokumentu:</strong> {municipalOffice(glazing.mesto||fields.recipientAddress)}</p><div className="pf-two">
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

   </>}
   <div className="pf-signer-settings"><label className="pf-signer-toggle"><input type="checkbox" checked={alternateSigner} onChange={e=>setAlternateSigner(e.target.checked)}/> Dokument podepisuje jiná osoba</label>{alternateSigner&&<div className="pf-two"><label>Jméno podepisující osoby<input value={signerName} onChange={e=>setSignerName(e.target.value)} placeholder="Jméno a příjmení"/></label><label>Funkce podepisující osoby<input value={signerPosition} onChange={e=>setSignerPosition(e.target.value)} placeholder="Např. předseda představenstva"/></label></div>}<small>{alternateSigner?"V dokumentu se zobrazí pouze řádek pro vlastnoruční podpis, bez automatického podpisu a razítka.":"Použije se podpis a razítko přihlášeného uživatele."}</small></div>
   {template!=="key_handover"&&<div className="pf-outmail">
    <label className="pf-outmail-toggle"><input type="checkbox" checked={mailEnabled} onChange={e=>{setMailEnabled(e.target.checked);setMailSuccess("");setError("")}}/> Zapsat dokument také do knihy odchozí pošty</label>
    {mailEnabled&&<div className="pf-outmail-details">
      <div className="pf-two"><label>Datum odeslání<input type="date" value={mailSentOn} onChange={e=>setMailSentOn(e.target.value)}/></label><label>Způsob odeslání<select value={mailMethod} onChange={e=>setMailMethod(e.target.value)}>{["Pošta","Doporučeně","Datová schránka","E-mail","Osobní předání","Jiné"].map(method=><option key={method} value={method}>{method}</option>)}</select></label></div>
      <label>Podací číslo / ID zprávy (nepovinné)<input value={mailTracking} maxLength={150} onChange={e=>setMailTracking(e.target.value)}/></label>
      <label>Poznámka (nepovinné)<textarea rows={2} value={mailNotes} maxLength={2000} onChange={e=>setMailNotes(e.target.value)}/></label>
      <button type="button" className="secondarybutton" onClick={saveToOutgoingMail} disabled={mailSaving||mailSavedSnapshot===mailSnapshot}>{mailSaving?"Ukládám…":mailSavedSnapshot===mailSnapshot?"Zapsáno v knize odchozí pošty":"Uložit do knihy odchozí pošty"}</button>
      <small>Příjemce, adresa, věc, naše značka a vybraný objekt se převezmou z tiskopisu. Zápis zásilku automaticky neodešle.</small>
    </div>}
   </div>}
   {mailSuccess&&template!=="key_handover"&&mailSavedSnapshot===mailSnapshot&&<p className="pf-outmail-success" role="status">{mailSuccess}</p>}
   {error&&<p className="error" role="alert">{error}</p>}
   <button type="button" className="primary" onClick={downloadPDF} disabled={pdfSaving}>{pdfSaving?"Vytvářím PDF…":"Stáhnout PDF"}</button>
   <small role="status">{draftStatus||"Rozpracovaný tiskopis se automaticky ukládá do tohoto prohlížeče."} Údaje zůstávají jen v tomto zařízení a v tomto prohlížeči.</small>
  </section><section className="pf-preview"><h2>Náhled A4</h2><div className="pf-preview-scroll"><div className="pf-preview-paper" dangerouslySetInnerHTML={{__html:documentHTML()}}/></div></section></div>
 </div>;
}
