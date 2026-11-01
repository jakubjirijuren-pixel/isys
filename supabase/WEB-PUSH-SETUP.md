# iSYS – nastavení skutečných mobilních Web Push notifikací

Tento návod navazuje na již nasazené centrum oznámení (tabulka `public.notifications`).

## 1. Databáze
V Supabase Dashboard > SQL Editor nejdříve spusť `supabase/notifications.sql` (pokud dosud nebyl spuštěn), potom `supabase/web-push.sql`.

## 2. VAPID klíče (bez instalace do počítače)
Otevři GitHub Codespaces pro tento repozitář a v terminálu spusť:

```sh
npx --yes web-push generate-vapid-keys --json
```

Vypíše `publicKey` a `privateKey`. Soukromý klíč nikam necommituj ani nesdílej. Vytvoř ještě náhodné heslo webhooku (alespoň 32 náhodných bajtů):

```sh
openssl rand -hex 32
```

## 3. Supabase Secrets
Supabase > Edge Functions > Secrets nastav:
- `VAPID_PUBLIC_KEY`: publicKey
- `VAPID_PRIVATE_KEY`: privateKey
- `VAPID_SUBJECT`: `mailto:TVUJ-SKUTECNY-EMAIL` (platná kontaktní adresa)
- `ISYS_WEBHOOK_SECRET`: výstup `openssl rand -hex 32`

Klíče `SUPABASE_URL` a `SUPABASE_SERVICE_ROLE_KEY` Supabase Edge Functions obvykle poskytuje automaticky. Service role klíč nikdy nevkládej do frontendového kódu.

## 4. Nasazení Edge Function
V GitHub Codespaces terminálu spusť:

```sh
npx --yes supabase login
npx --yes supabase functions deploy isys-web-push --project-ref qcbyjxovnffdruiznlnt --no-verify-jwt
```

Nasazení spouštěj z kořene repozitáře. Funkce musí mít vypnuté gateway JWT ověřování, protože databázový webhook se autentizuje vlastním tajným HTTP headerem. Funkce ověřuje `x-isys-webhook-secret` a bez něj odmítá odeslání.

## 5. Databázový webhook
V Supabase Dashboard > Database > Webhooks vytvoř:
- Název: `isys-web-push`
- Tabulka: `public.notifications`
- Událost: **INSERT**
- Typ: **Supabase Edge Functions**
- Edge Function: `isys-web-push`
- HTTP header: `x-isys-webhook-secret` = přesná hodnota `ISYS_WEBHOOK_SECRET`

Pokud rozhraní neumožňuje přidat vlastní header u typu Edge Functions, vyber HTTP Request, URL:
`https://qcbyjxovnffdruiznlnt.supabase.co/functions/v1/isys-web-push`,
metoda POST, Content-Type `application/json`, vlastní tajný header výše. Webhook posílá standardní Supabase databázový payload s `type`, `table`, `schema`, `record`.

## 6. Telefon
Po nasazení GitHub Pages:
- Android: otevři iSYS v Chrome, případně nainstaluj PWA.
- iPhone: iOS 16.4+, otevři iSYS v Safari, Sdílet > Přidat na plochu a spusť z plochy.
- Přihlas se, otevři zvoneček a klepni na **Zapnout push**. Povol oznámení.
- Každé zařízení je potřeba aktivovat zvlášť.

## 7. Test
Založ novou výpůjčku klíčů. Trigger z `notifications.sql` vloží oznámení pro vydávajícího uživatele. Databázový webhook zavolá Edge Function a ta odešle Web Push všem jeho registrovaným zařízením. Testuj také se zavřenou PWA.

Pokud nedorazí: zkontroluj `public.notifications`, `public.push_subscriptions`, logy webhooku a Edge Function. Push služby nejsou garantovaně okamžité a zařízení musí mít povolená oznámení.

**Poznámka:** Momentálně automaticky vznikají oznámení o výpůjčkách a vrácení klíčů. Další události (úkoly, kontroly) se přidávají jako nové záznamy do `public.notifications` a použijí stejný push mechanismus.
