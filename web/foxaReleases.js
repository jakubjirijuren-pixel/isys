// Aktualizovat při každé změně aplikace společně s CHANGELOG.md.
// Nové vydání = nový jedinečný id; přečtená vydání se znovu nezobrazují.
export const foxaReleases=[
 {id:"2026-10-26-emergency-services",date:"2026-10-26",title:"Havarijní služby přímo v přehledu objektů",changes:[
  {area:"Evidence objektů",description:"U 23 vybraných středisek je nově přímo na kartách a v seznamu viditelná sjednaná havarijní služba Bytoservis s telefonem +420 241 414 141, bez otevírání detailu objektu."},
  {area:"Objekt 333",description:"U objektu č. 333 je uvedena havarijní služba Cigdus s telefonem +420 733 642 111."},
  {area:"Mobilní terminál",description:"Havarijní kontakty jsou viditelné také v rychlém seznamu objektů na telefonu."},
  {area:"Vzhled",description:"Havarijní služba má výrazné oranžové označení s kontrastně zvýrazněným telefonním číslem."}
 ]},
 {id:"2026-10-21-mobile-terminal",date:"2026-10-21",title:"Nové mobilní pracovní prostředí FOXA",changes:[{area:"Mobilní terminál",description:"Nová domovská obrazovka s rychlými pracovními akcemi, přehledem připojení a velkými dotykovými prvky."},{area:"NFC a QR",description:"Mobilní skener identifikátorů s možností ručního zadání, podle podpory zařízení a prohlížeče."},{area:"Terénní koncepty",description:"Poznámky lze uchovávat lokálně i bez internetu. Automatická cloudová synchronizace těchto konceptů zatím není dostupná."},{area:"Oprávnění",description:"Mobilní terminál respektuje dostupnost modulů a uživatelské role; desktopový přehled zůstává zachován."}]},
 {id:"2026-10-21-keys-excel-backup",date:"2026-10-21",title:"Excelová záloha evidence klíčů",changes:[{area:"Evidence klíčů",roles:["admin"],description:"Administrátor může stáhnout kompletní Excelovou zálohu výpůjček, historie částečných vrácení a svazků klíčů, nezávisle na nastavených filtrech."}]},
 {id:"2026-10-20-fleet-forms-inspections",date:"2026-10-20",title:"Vozidla, tiskopisy a přehlednější kontroly",changes:[
  {area:"Rezervace vozidel",roles:["admin","technician","referent"],description:"Rezervace služebních vozidel se zobrazují ve společném kalendáři s přepínáním dne, týdne a měsíce a filtrem vozidel."},
  {area:"Outlook",roles:["admin","technician","referent"],description:"Každý zaměstnanec si může vytvořit soukromý odkaz pro odběr kalendáře rezervací v Outlooku. Změny se synchronizují podle intervalu Outlooku."},
  {area:"Kniha jízd",roles:["admin","technician","referent"],description:"Do vozového parku přibyla evidence jízd a rezervace služebních aut."},
  {area:"Tiskopisy",roles:["admin","technician","referent"],description:"Vybrané údaje se předvyplňují z evidence objektů. U zasklení lodžie se příslušný ÚMČ odvozuje z městské části v adrese."},
  {area:"Kontroly",roles:["admin","technician","referent"],description:"Přepínač Technické kontroly / Kontroly referenta je přímo v banneru kontrol."},
  {area:"Technické kontroly",roles:["admin","technician"],description:"Horní ovládání sjednoceno s kontrolami referenta: Nová kontrola a Generovat PDF; další akce jsou pod bannerem."},
  {area:"Správa uživatelů",roles:["admin"],description:"Upraven vzhled administrace uživatelů, hlavičky, statistických karet a seznamu zaměstnanců."},
  {area:"Evidence objektů",roles:["admin","technician","referent"],description:"Tlačítko Kontroly objektů je kompaktnější a odpovídá vzhledu ostatních ovládacích prvků."},
  {area:"Wiki",description:"Doplněny návody ke kalendáři vozidel, Outlooku, tiskopisům, docházce a technickým kontrolám."}
 ]},
 {id:"2026-10-20-navigation-ticketing",date:"2026-10-20",title:"Přehlednější navigace a opravy ticketů",changes:[
  {area:"Přehled",description:"Tlačítko Novinky a aktualizace je nově přímo v uvítacím banneru; z hlavního menu bylo odstraněno."},
  {area:"Objekty a kontroly",roles:["admin","technician","referent"],description:"Kontroly objektů se otevírají tlačítkem v horním banneru Evidence objektů místo samostatné položky v menu."},
  {area:"Evidence objektů",description:"Čísla středisek na kartách objektů jsou výraznější a lépe čitelná."},
  {area:"Oznamovací centrum",description:"Nová vydání FOXA se zobrazují mezi oznámeními a stav přečtení se synchronizuje s changelogem."},
  {area:"Zpětná vazba",roles:["admin"],description:"Opravena databázová chyba, která bránila změně stavu ticketu na Uzavřený."},
  {area:"Vzhled aktualizací",description:"Changelog je sladěný s designem aplikace a upravený pro mobilní obrazovky."}
 ]},
 {id:"2026-10-20-foxa-updates",date:"2026-10-20",title:"Novinky ve FOXA – říjen 2026",changes:[
  {area:"Kontroly",roles:["admin","technician","referent"],description:"Rozpracované kontroly se automaticky ukládají do Supabase. Po vygenerování PDF se koncept odstraní."},
  {area:"Kontroly referentů",roles:["admin","referent"],description:"Přehlednější ovládání s tlačítky Nová kontrola a Generovat PDF."},
  {area:"PDF na iPhonu",roles:["admin","referent"],description:"Upraveno stránkování výkazů a zpracování fotografií pro mobilní zařízení."},
  {area:"Evidence klíčů",description:"Nově lze zaznamenat částečné vrácení, upravovat aktivní výpůjčky a řadit je podle čísla střediska."},
  {area:"Evidence objektů",description:"Do filtrů technika a referenta přibyla možnost Nepřiřazen."},
  {area:"Zpětná vazba",description:"Zaměstnanci mohou sledovat stav svých ticketů."},
  {area:"Novinky FOXA",description:"Nový přehled aktualizací s potvrzením přečtení při přihlášení."}
 ]}
];

// A release is relevant only if it contains at least one change visible to the user's roles.
export function getVisibleReleases(roles=[]){
 const roleSet=new Set(roles);
 return foxaReleases.map(release=>({...release,changes:release.changes.filter(change=>!change.roles||change.roles.some(role=>roleSet.has(role)))})).filter(release=>release.changes.length>0);
}
