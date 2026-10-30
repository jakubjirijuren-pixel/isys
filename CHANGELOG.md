## 2026-10-28 – Postupné doplňování kontaktů na výbory\n\n- V evidenci objektů probíhá **postupné doplňování kontaktů na členy výborů SVJ a bytových družstev**. Kontaktní údaje proto zatím nemusí být vyplněné u všech objektů.\n- U jednotlivých kontaktů se eviduje jméno, funkce, telefon a e-mail. Telefonní čísla a e-mailové adresy jsou v detailu objektu proklikávací.\n\n## 2026-10-26 – Centrální registr klíčů

- Modul Evidence klíčů přejmenován v uživatelském rozhraní na **Centrální registr klíčů**.
- U aktivních výpůjček s předávacím protokolem lze potvrdit podpis. Zobrazuje se čas a potvrzující uživatel; výpůjčka se uzamkne proti úpravám a smazání, vrácení zůstává možné.
- Administrátor může výpůjčku odemknout. Odemčení se eviduje v databázové historii.
- **Záloha Excel** je dostupná všem uživatelům modulu, v rozsahu jejich databázových oprávnění. Obsahuje výpůjčky, částečná vrácení a svazky klíčů.
- Wiki doplněna o postupy potvrzení podpisu, odemčení a exportu.

## 2026-10-26 – Havarijní služby u objektů

- **Bytoservis:** U středisek 320, 327, 335, 337, 355, 366, 373, 397, 398, 431, 442, 443, 445, 446, 449, 450, 452, 453, 454, 528, 530, 536 a 538 se zobrazuje sjednaná havarijní služba **Bytoservis**, tel. **+420 241 414 141**.
- **Cigdus:** U objektu č. **333** se zobrazuje havarijní služba **Cigdus**, tel. **+420 733 642 111**.
- **Web i mobil:** Označení je viditelné bez rozkliknutí detailu – v kartách objektů, tabulkovém seznamu i rychlém seznamu mobilního terminálu; zůstává i v detailu.
- **Zvýraznění:** Kontrastní oranžový panel, větší písmo a výrazně označené telefonní číslo.
- Změny jsou přiřazovány podle čísla střediska a nemění ostatní objekty.

## 2026-10-25 – Zkratka Evidence klíčů na terminálu

- Na úvodní obrazovku mobilního terminálu FOXA FIELD vrácena rychlá akce **Evidence klíčů** pro otevření výpůjček a vrácení. Zobrazuje se pouze uživatelům s přístupem k modulu. [PR #103](https://github.com/jakubjirijuren-pixel/isys/pull/103)

## 2026-10-21 – Sjednocení pracovních modulů FOXA FIELD

- Všechny mobilní pracovní moduly dostaly jednotnou terminálovou navigaci s návratem na hlavní obrazovku a živým indikátorem připojení.
- Sjednoceny terminálové panely, ovládací prvky, dotykové plochy, záhlaví, tabulky, filtry a navigace formulářů; změny jsou omezené na mobilní šířky do 650 px.
- Zachována oprávnění jednotlivých rolí, stávající funkce modulů a desktopové zobrazení.
- Opraveno zobrazení tlačítka pro odeslání úkolu na desktopu.
- **Poznámka:** Jde o plošnou úpravu rozhraní, nikoli kompletní přepsání veškeré interní logiky jednotlivých modulů. Před označením za produkčně ověřené je nutné úspěšné sestavení a mobilní regresní testy.

## 2026-10-21 – Zjednodušení úvodního terminálu FOXA FIELD

- Z úvodního mobilního terminálu odstraněny sekce **Terénní koncept** a **Všechny pracovní moduly**.
- Zachovány rychlé akce, přehled připojení a času a tlačítko Novinky a aktualizace.
- Odstraněna související logika lokálního konceptu pouze z úvodního terminálu; evidence a formuláře v jednotlivých modulech zůstávají zachované.

## 2026-10-21 – Dočasné skrytí skeneru v terminálu

- Odstraněno tlačítko NFC/QR skeneru z mobilní úvodní obrazovky FOXA FIELD a z mobilního terminálu Evidence klíčů.
- Z úvodní komponenty odstraněna i nepoužívaná logika skenování; ostatní funkce evidence klíčů, interní NFC evidence a desktopové funkce zůstávají zachovány.

## 2026-10-21 – Evidence klíčů jako samostatný mobilní terminál

- Mobilní úvodní obrazovka evidence klíčů nově odpovídá konceptu FOXA FIELD: dvě výrazné akční karty Půjčit klíče / Vrátit klíče, počet aktuálních výpůjček a rychlý vstup do NFC / čárového terminálu.
- Výpůjčka a vrácení mají oddělené pracovní pohledy, navigace Zpět na terminál klíčů.
- Stávající logika Supabase, PDF protokolů, částečného vracení a desktopové zobrazení zůstává zachována.
- Změna je určena pro šířky obrazovky do 650 px; vyžaduje kontrolu sestavení a funkční test na telefonu.

## 2026-10-21 – Terminálové průvodce v dalších modulech

- Zavedena sdílená komponenta `FieldWizardForm` s průběhem kroků, kontrolou povinných polí a závěrečným potvrzením; původní události odeslání a ukládání zůstávají.
- Mobilní formuláře výpůjčky klíčů, rezervace vozidel, záznamu jízdy, správy vozidel, žádosti o dovolenou, sick day, nastavení zaměstnance a odchozí pošty převedeny na průvodce.
- Kontroly referenta mají čtyřkrokové zobrazení existujících sekcí; technické kontroly a úkoly byly převedeny dříve.
- Desktopová podoba formulářů a úvodní stránka FOXA FIELD zůstávají zachovány.
- **Nedokončeno:** tiskopisy bez standardního HTML formuláře, některé administrátorské a servisní dialogy a kompletní offline synchronizace s idempotentní frontou. Potřebné jsou testy buildů a jednotlivých mobilních formulářů.

## 2026-10-21 – Vícekrokové mobilní formuláře FOXA FIELD

- **Úkoly:** Nový mobilní formulář ve třech krocích (objekt a přiřazení, podrobnosti, kontrola a odeslání). Průběžný lokální koncept navázaný na přihlášeného uživatele; odeslání se provede pouze při připojení a výslovném potvrzení.
- **Technické kontroly:** Šestikrokový mobilní průvodce: uložené reporty, základní údaje, revize, technický stav, fotografie a podpisy. Stávající ukládání konceptů a generování PDF zachováno.
- **Desktop:** Původní celostránkové formuláře zůstávají zobrazené. Úvodní mobilní obrazovka FOXA FIELD zůstává beze změny.
- **Omezení:** Lokální koncepty úkolů nejsou automaticky synchronizovány do Supabase; bezpečná fronta s deduplikací a potvrzením zápisu vyžaduje další implementaci a testy. Ostatní formuláře zatím nebyly převedeny na průvodce.

## 2026-10-21 – FOXA FIELD v jednotlivých modulech

- Nová společná komponenta `FoxaModuleTerminal` pro všechny mobilní pracovní moduly kromě úvodní obrazovky Přehled, která zůstala beze změny.
- Terminálová hlavička s ikonou, názvem a popisem modulu; kontextové zkratky do souvisejících modulů respektují dostupnost modulů podle oprávnění.
- Funkční formuláře, tlačítka, přepínače a workflow stávajících modulů zůstávají zachované; úpravy se aktivují jen do šířky 650 px.
- Sjednocené pracovní karty a ovládání využívají dříve přidané mobilní terminálové styly.
- Vyžaduje ověření sestavení a test na fyzickém telefonu.

## 2026-10-21 – Sjednocení mobilních modulů FOXA FIELD

- Mobilní zobrazení všech modulů používá jednotné tmavě modré terminálové panely, kontrastní formuláře, větší dotykové akce a stálou spodní navigaci.
- Sjednocena horní kompaktní lišta bez duplicitního nápisu FOXA a drobečkové navigace také mimo domovskou obrazovku.
- Úprava je pouze prezentační pro obrazovky do 650 px; existující moduly, role a desktopové rozhraní zůstávají zachovány.
- **Ověření:** GitHub Actions build a praktické testy všech modulů na telefonu je třeba provést.

# Historie změn FOXA

Tento soubor zaznamenává změny aplikace FOXA nasazené do produkční větve `web-supabase`. Nové funkce, opravy a úpravy uživatelského rozhraní se zapisují při každé další změně aplikace. Záznamy jsou řazeny od nejnovějšího.

> **Pravidlo pro další vývoj:** Každý pull request měnící chování FOXA musí současně aktualizovat tento soubor a soubor `web/foxaReleases.js` (nové vydání s unikátním ID pro zaměstnance). Uvádějte datum, oblast, stručný popis změny a číslo PR. Změny zapisujte až jako součást příslušného PR; nerozpracované návrhy se sem nezapisují.

## 2026-10-21 – Mobilní pracovní terminál

- **Mobilní domovská obrazovka:** Samostatný pracovní terminál FOXA FIELD se stavovým panelem, časem, rychlými akcemi a přístupem k dostupným modulům.
- **Skener:** NFC (Web NFC na podporovaných zařízeních) a QR/čárové kódy (BarcodeDetector, pokud jej prohlížeč podporuje), včetně ručního zadání.
- **Offline koncept:** Lokální formulář pro identifikátor objektu a terénní poznámku; uchovává se v prohlížeči a lze jej zkopírovat. **Automatická synchronizace do Supabase zatím není implementována.**
- **Přístupová práva:** Navigace se řídí dostupnými moduly a rolemi; desktopový dashboard zůstává beze změny.

## 2026-10-21

- **Evidence klíčů:** Administrátor může stáhnout úplnou zálohu XLSX se třemi listy (výpůjčky, částečná vrácení, svazky). Export načítá data po stránkách přímo ze Supabase a nepodléhá filtrům zobrazení. Soubor obsahuje osobní údaje a vyžaduje zabezpečené uložení.
- **Wiki:** Přidán administrátorský návod pro Excelovou zálohu evidence klíčů.

## 2026-10-20 – Vozidla, tiskopisy a kontroly (aktualizace)

- **Vozový park:** Modul rezervací vozidel a knihy jízd; společný kalendář pro zaměstnance s denním, týdenním a měsíčním pohledem a filtrováním podle auta.
- **Outlook:** Soukromý iCalendar odkaz na odběr společných rezervací. Aktualizace probíhají při synchronizaci Outlooku, nikoli okamžitě; odběr je jednosměrný.
- **Supabase:** Upraveny RLS politiky pro správu vozidel a vytváření rezervací; přidána tabulka odběrů kalendáře a Edge Function poskytující ICS.
- **Tiskopisy:** Automatické doplnění dostupných údajů z objektu a odvození příslušného ÚMČ z adresy u podmínek zasklení lodžie; neznámé katastrální území zůstává k ručnímu ověření.
- **Kontroly:** Přepínač technických kontrol a kontrol referenta přesunut do banneru. Horní akce technických kontrol sjednoceny s referentskými; další akce jsou pod bannerem.
- **Správa uživatelů:** Sjednocen vzhled hlavičky, statistik, záložek a seznamu zaměstnanců.
- **Objekty:** Zmenšeno a sjednoceno tlačítko Kontroly objektů.
- **Wiki:** Nové návody k rezervacím, kalendáři, Outlooku, knize jízd, tiskopisům, docházce a technickým kontrolám.
- **AI asistent (rozpracováno):** Nasazena serverová funkce a vytvořen návrh chatovacího rozhraní. Plnohodnotná integrace do FOXA ani konfigurace AI klíče nejsou potvrzeny; zaměstnancům zatím není prezentován jako hotová funkce.

## 2026-10-20

- **Navigace:** Novinky a aktualizace přesunuty do uvítacího banneru Přehledu. Kontroly objektů se otevírají z banneru Evidence objektů.
- **Objekty:** Zvětšena čísla středisek na kartách.
- **Oznamovací centrum:** Changelog propojen s oznámeními a potvrzením přečtení.
- **Changelog:** Sjednocen vzhled a opraveno rozložení hlavičky.
- **Zpětná vazba:** Databáze nově povoluje uzavření ticketu.
- **Wiki:** Doplněny návody k navigaci, aktualizacím a ticketům.


- **Novinky a aktualizace:** Po přihlášení se zaměstnancům zobrazí nepřečtené změny FOXA; přečtení potvrdí tlačítkem a potvrzení se ukládá ke konkrétnímu účtu do Supabase. Historie je dostupná i z navigace. Při dalších změnách je potřeba aktualizovat také `web/foxaReleases.js`, přidat nové jedinečné ID vydání a doplnit tento soubor. [PR #102](https://github.com/jakubjirijuren-pixel/isys/pull/102)

- **Kontroly referentů – PDF na iPhonu:** Opraven způsob rozdělování výkazu na stránky A4, aby nevznikaly velké prázdné mezery a oddělené záhlaví tabulek. [PR #100](https://github.com/jakubjirijuren-pixel/isys/pull/100)
- **Kontroly referentů – nová kontrola:** Přidáno tlačítko „Nová kontrola“ do horní lišty. [PR #99](https://github.com/jakubjirijuren-pixel/isys/pull/99)
- **Kontroly referentů – přehlednější formulář:** Odstraněna duplicitní spodní lišta akcí. [PR #98](https://github.com/jakubjirijuren-pixel/isys/pull/98)
- **Kontroly referentů – nápověda:** Odstraněn zastaralý text o ukládání pouze do prohlížeče. [PR #97](https://github.com/jakubjirijuren-pixel/isys/pull/97)
- **Kontroly referentů – ovládání:** V horní liště ponecháno generování PDF; odstraněna tlačítka pro ruční uložení, tisk a odeslání e-mailem. [PR #96](https://github.com/jakubjirijuren-pixel/isys/pull/96)
- **Kontroly referentů a techniků – úklid konceptů:** Po úspěšném vytvoření PDF se odstraní rozpracovaný koncept ze Supabase a místní záloha. [PR #95](https://github.com/jakubjirijuren-pixel/isys/pull/95)
- **Kontroly referentů a techniků – cloudové koncepty:** Automatické ukládání a obnova rozpracovaných kontrol ze Supabase s místní zálohou. [PR #94](https://github.com/jakubjirijuren-pixel/isys/pull/94)
- **Kontroly referentů a techniků – automatické ukládání:** Doplněno průběžné ukládání formuláře a informace o stavu uložení. [PR #93](https://github.com/jakubjirijuren-pixel/isys/pull/93)

## 2026-10-19 a dříve

- **Kontroly referentů – iPhone:** Omezení paměťové náročnosti práce s fotografiemi a odložené načítání PDF knihovny. [PR #92](https://github.com/jakubjirijuren-pixel/isys/pull/92)
- **Evidence objektů:** Filtry technika a referenta obsahují možnost „Nepřiřazen“. [PR #91](https://github.com/jakubjirijuren-pixel/isys/pull/91)
- **Evidence klíčů:** Částečné vrácení klíčů při zachování aktivní výpůjčky. [PR #90](https://github.com/jakubjirijuren-pixel/isys/pull/90)
- **Evidence klíčů:** Zobrazení autora výpůjčky, úpravy aktivních výpůjček a administrátorské mazání. [PR #89](https://github.com/jakubjirijuren-pixel/isys/pull/89)
- **Evidence klíčů:** Řazení výpůjček podle čísla střediska. [PR #88](https://github.com/jakubjirijuren-pixel/isys/pull/88)
- **Zpětná vazba:** Zaměstnanci mohou sledovat stav svých ticketů. [PR #87](https://github.com/jakubjirijuren-pixel/isys/pull/87)
- **Zpětná vazba:** Administrátorská správa ticketů včetně priorit, přiřazení, termínů a interních poznámek. [PR #86](https://github.com/jakubjirijuren-pixel/isys/pull/86)

---

*Historie před PR #86 není zpětně podrobně rekonstruována. Případné starší změny lze doplnit z historie GitHubu.*
