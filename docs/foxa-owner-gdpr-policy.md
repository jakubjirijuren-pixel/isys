# FOXA — pravidla ochrany údajů vlastníků (návrh k internímu schválení)

Stav: **technické výchozí omezení aktivní; právní a organizační pravidla čekají na schválení správce a pověřence / právníka**.

## Rozsah a účel
- Údaje vlastníků z katastru využívat výhradně pro správu konkrétních svěřených domů, ověření vlastnictví a související oprávněnou agendu SVJ/BD.
- U každé činnosti určit konkrétního správce údajů (SVJ, BD, případně jiný subjekt), postavení SBD Praha 8 (správce/zpracovatel), právní titul podle čl. 6 GDPR a příslušnou smlouvu / pokyny.
- Veřejnost katastru sama o sobě není neomezeným právním titulem pro ukládání, kopírování ani zveřejňování údajů.

## Minimalizace
- Předpokládaná povolená pole: identifikace jednotky, jméno/název vlastníka, spoluvlastnický podíl, odkaz/identifikátor zdroje, datum ověření. Kontaktní či doručovací adresa jen při doložené potřebě.
- Neshromažďovat rodná čísla, data narození, historické vlastníky ani úplné listiny automaticky. Každé rozšíření podléhá samostatnému posouzení.
- U změn z KN zobrazit návrh ke kontrole; nepřepisovat interní záznamy bez potvrzení oprávněné osoby.

## Přístup a bezpečnost
- Výchozí přístup odepřen; budoucí čtení pouze ověřeným rolím a výhradně k přiřazeným objektům. Samotná role admin neznamená automaticky účelový přístup k osobním údajům.
- Kontrola oprávnění musí probíhat na serveru (RLS / Edge Function), nikoli pouze skrytím tlačítek v Reactu.
- Zapisovat identitu uživatele, čas, akci, objekt a účel; nepřidávat plná osobní data do auditního logu.
- Zakázat veřejné odkazy, sdílení a hromadné exporty ve výchozím nastavení; chránit exporty a dočasné soubory.
- Přihlašovací údaje ČÚZK ukládat pouze v serverových tajemstvích, nikoli do GitHub Pages nebo klientského kódu.

## Transparentnost, práva a retence
- Před spuštěním doplnit informační povinnost dle čl. 13/14 GDPR, kontakty správce, účely, právní titul, příjemce, doby uchování a postup vyřizování práv.
- Retenci údajů vlastníků určit podle účelu a právních povinností; nevolit paušální neomezené uchovávání. Po ukončení správy objektu vyhodnotit výmaz/předání/archivaci.
- Konfigurace auditních logů má předběžně 180 dnů; **automatické mazání dosud není nasazeno** a před spuštěním je nutné schválit dobu i mechanismus.
- Incidenty dokumentovat, posuzovat riziko a případné oznámení ÚOOÚ do 72 hodin podle čl. 33 GDPR; při vysokém riziku také dotčeným osobám podle čl. 34.

## Podmínky pro spuštění
1. Určit správce/zpracovatele a ověřit smlouvy.
2. Schválit účely, právní tituly, informační texty a dobu uchování.
3. Ověřit licenční a přístupové podmínky ČÚZK/WSDP.
4. Implementovat serverové autorizace podle objektů, audit a retenci, testovat neoprávněný přístup a export.
5. Posoudit rizika a případnou potřebu DPIA.
6. Teprve pak povolit integraci a import.

Technický stav k 2026-11-03: v Supabase existují `foxa_owner_privacy_policy` (integrace/import/export vypnuty) a `foxa_owner_access_audit`. Obě tabulky mají RLS a odebraná přímá oprávnění rolím anon/authenticated. Zatím nejsou implementovány operace nad daty vlastníků ani automatická retence.
