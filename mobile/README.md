# iSYS Mobile (Android)

Samostatný mobilní klient iSYS postavený na Expo / React Native. Aktuálně pouze UI prototyp bez připojení k produkčním datům.

## Test bez Android Studia

1. Otevřete GitHub Codespaces pro tento repozitář na větvi `feature/android-expo`.
2. V terminálu: `cd mobile && npm install`.
3. Spusťte `npx expo start --tunnel` (tunel může vyžadovat instalaci `@expo/ngrok`).
4. Na telefonu nainstalujte Expo Go a naskenujte QR kód.

**Poznámka:** kompatibilita závisí na verzi Expo Go; při nesouladu SDK použijte vývojové sestavení. Kód zatím nebyl ověřen automatickým sestavením.

## APK přes EAS Build

V Codespaces spusťte `cd mobile && npm install && npx eas-cli login && npx eas-cli build --platform android --profile preview`. EAS může vyžadovat konfiguraci projektu a interaktivní přihlášení. Výsledkem úspěšného sestavení je odkaz na APK.

## Další kroky

- Microsoft Entra ID přihlášení, tokeny a role
- Zabezpečené API pro objekty, kontroly, klíče a úkoly
- Offline ukládání, synchronizace, QR a NFC

Nepoužívejte skutečná data bytového družstva před dokončením zabezpečení.
