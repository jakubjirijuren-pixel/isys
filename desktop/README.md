# iSYS Desktop – Windows

První **lokální UI prototyp** programu iSYS pro Windows (Tauri 2, React, Vite, TypeScript). Nepřipojuje se k API ani databázi a neukládá reálná data.

## Spuštění na Windows

Nainstalujte Node.js LTS, Rust toolchain (MSVC), Microsoft C++ Build Tools a WebView2 Runtime dle oficiálního návodu Tauri: https://v2.tauri.app/start/prerequisites/

V kořeni repozitáře:

```powershell
cd desktop
npm install
npm run desktop:dev
```

## Vytvoření instalátoru

```powershell
cd desktop
npm install
npm run desktop:build
```

Úspěšný build vytvoří instalátor NSIS v `desktop/src-tauri/target/release/bundle/nsis/`.

## Poznámky

- Konfigurace a zdrojové soubory jsou připravené, ale build ještě nebyl ověřen na Windows.
- Windows sestavení lze později automatizovat pomocí GitHub Actions; workflow zatím nebylo přidáno.
- Produkční přístup k API musí být chráněn přihlášením a rolemi; přímé databázové připojení z klienta nepoužívat.
