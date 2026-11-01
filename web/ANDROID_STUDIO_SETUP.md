# FOXA — Android Studio a Samsung Galaxy XCover 7

Tento návod je určen pro Windows 10/11. Projekt Android je generovaný Capacitor 7 z webové aplikace ve složce `web`.

## Požadavky

- Android Studio (aktuální stabilní verze), Android SDK a Android Emulator
- Node.js 22 LTS nebo kompatibilní verze, npm a Git
- Zapnutá hardwarová virtualizace CPU; ve Windows může být nutné povolit Windows Hypervisor Platform

## První spuštění

V PowerShellu:

```powershell
git clone --branch web-supabase https://github.com/jakubjirijuren-pixel/isys.git
cd isys\web
npm install
npm run android:studio:init
```

Pokud už složka `web/android` existuje, použij místo `android:studio:init`:

```powershell
npm run android:sync
npm run android:studio
```

Android Studio otevře projekt ve `web/android`. Nech doběhnout Gradle Sync a instalaci případných SDK komponent.

## Virtuální Samsung Galaxy XCover 7

1. Android Studio → **Tools → Device Manager → + → Create Virtual Device**.
2. Vyber **New Hardware Profile** (v některých verzích **Create Hardware Profile**).
3. Název: `Samsung Galaxy XCover 7 (FOXA)`.
4. Displej: **6.6 inches**, rozlišení **1080 × 2408 px**. Pro přibližné chování Android DP nastav hustotu kolem **400–420 dpi** (přesná hustota a systémové měřítko se mohou na reálném zařízení lišit).
5. RAM: 4096 MB nebo více, pokud to počítač umožňuje. Ulož profil.
6. Vyber aktuální stabilní systémový obraz **Google APIs x86_64** (pro počítače Intel/AMD) a dokonči vytvoření AVD.
7. V Device Manageru spusť emulátor. V horní liště Android Studia vyber emulátor a stiskni **Run ▶**.

Pro další kontrolu doporučujeme i menší zařízení přibližně 360 × 800 dp a běžný Pixel s 393 × 851 dp. Otestuj portrét i landscape, zvětšené písmo a softwarovou klávesnici.

## Po každé změně webového kódu

```powershell
git pull origin web-supabase
cd web # pouze pokud nejsi ve složce web
npm run android:sync
```

Pak v Android Studiu znovu klikni na **Run ▶**. Není nutné sestavovat release APK ani spouštět GitHub Actions. Pro otevření projektu: `npm run android:studio`.

## Rychlé spuštění z terminálu

Při běžícím emulátoru lze použít:

```powershell
npm run android:run
```

## Omezení

- Tento postup používá lokálně zabalený webový obsah. Změny je nutné synchronizovat příkazem `npm run android:sync`; nejde o automatický hot reload.
- Emulátor nenahradí reálné testy NFC, skenování kamerou, GPS, fyzických tlačítek a chování při dlouhodobém offline provozu.
- Vývojová instalace může být podepsaná jiným klíčem než vydaná aplikace. Neinstaluj ji přes produkční aplikaci se stejným ID, pokud Android hlásí konflikt podpisu.
- Testovací data a přístup do Supabase mohou být skutečné. Pro bezpečné testování používej testovací účty a ideálně oddělené prostředí.
