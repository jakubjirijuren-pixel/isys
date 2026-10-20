// Aktualizovat při každé změně aplikace společně s CHANGELOG.md.
// Nové vydání = nový jedinečný id; přečtená vydání se znovu nezobrazují.
export const foxaReleases=[
 {id:"2026-10-20-navigation-ticketing",date:"2026-10-20",title:"Přehlednější navigace a opravy ticketů",changes:[
  {area:"Přehled",description:"Tlačítko Novinky a aktualizace je nově přímo v uvítacím banneru; z hlavního menu bylo odstraněno."},
  {area:"Objekty a kontroly",description:"Kontroly objektů se otevírají tlačítkem v horním banneru Evidence objektů místo samostatné položky v menu."},
  {area:"Evidence objektů",description:"Čísla středisek na kartách objektů jsou výraznější a lépe čitelná."},
  {area:"Oznamovací centrum",description:"Nová vydání FOXA se zobrazují mezi oznámeními a stav přečtení se synchronizuje s changelogem."},
  {area:"Zpětná vazba",description:"Opravena databázová chyba, která bránila změně stavu ticketu na Uzavřený."},
  {area:"Vzhled aktualizací",description:"Changelog je sladěný s designem aplikace a upravený pro mobilní obrazovky."}
 ]},
 {id:"2026-10-20-foxa-updates",date:"2026-10-20",title:"Novinky ve FOXA – říjen 2026",changes:[
  {area:"Kontroly",description:"Rozpracované kontroly se automaticky ukládají do Supabase. Po vygenerování PDF se koncept odstraní."},
  {area:"Kontroly referentů",description:"Přehlednější ovládání s tlačítky Nová kontrola a Generovat PDF."},
  {area:"PDF na iPhonu",description:"Upraveno stránkování výkazů a zpracování fotografií pro mobilní zařízení."},
  {area:"Evidence klíčů",description:"Nově lze zaznamenat částečné vrácení, upravovat aktivní výpůjčky a řadit je podle čísla střediska."},
  {area:"Evidence objektů",description:"Do filtrů technika a referenta přibyla možnost Nepřiřazen."},
  {area:"Zpětná vazba",description:"Zaměstnanci mohou sledovat stav svých ticketů."},
  {area:"Novinky FOXA",description:"Nový přehled aktualizací s potvrzením přečtení při přihlášení."}
 ]}
];
