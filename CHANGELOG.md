# Historie změn FOXA

Tento soubor zaznamenává změny aplikace FOXA nasazené do produkční větve `web-supabase`. Nové funkce, opravy a úpravy uživatelského rozhraní se zapisují při každé další změně aplikace. Záznamy jsou řazeny od nejnovějšího.

> **Pravidlo pro další vývoj:** Každý pull request měnící chování FOXA musí současně aktualizovat tento soubor a soubor `web/foxaReleases.js` (nové vydání s unikátním ID pro zaměstnance). Uvádějte datum, oblast, stručný popis změny a číslo PR. Změny zapisujte až jako součást příslušného PR; nerozpracované návrhy se sem nezapisují.

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
